# Plan: Tempo v5.0.0 Release Considerations & Breaking Changes

## 1. Overview

As part of the upcoming **v5.0.0** major milestone, several key architectural and developer-experience improvements are being planned. Unlike minor releases (`v4.x`), v5 allows clean breaks from legacy or suboptimal API choices without backward-compatibility compromises.

This document tracks breaking changes, architectural rationales, migration pathways, and blast-radius analyses slated for v5.0.0.

---

## 2. Breaking Change: `Tempo.now()` Transition to Instance Factory

### Classification
* **Type:** Breaking API Change (Not a soft deprecation; clean replacement in v5.0.0).
* **Target Milestone:** `v5.0.0`
* **Affected API:** `Tempo.now()`

---

### Behavior Comparison

| Aspect | Current Behavior (`v4.x`) | New Behavior (`v5.0.0`) |
| :--- | :--- | :--- |
| **Return Type** | `bigint` (nanoseconds) or `number` (if unit specified) | `Tempo` instance |
| **Signature** | `Tempo.now(unit?: 'ss' \| 'ms' \| 'us' \| 'ns')` | `Tempo.now(options?: t.Options)` |
| **Fluent Chaining** | ❌ Throws `TypeError` on `.format()`, `.add()`, etc. |  Fully chainable (`Tempo.now().format(...)`) |
| **Raw Timestamp Path** | `Tempo.now()` or `Tempo.epoch.ns` | [`Tempo.epoch.ns`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1370) (and `.ms`, `.us`, `.ss`) |

---

### Architectural & Design Reasoning

1. **Modern Date Library Expectations (Luxon / Temporal Parity)**
   - In modern date libraries such as Luxon (`DateTime.now()`), developers expect `.now()` to produce a fluent date-time object representing the current moment.
   - Developers frequently write `Tempo.now().format('{yyyy}-{mm}-{dd}')` or `Tempo.now().add({ days: 1 })`. In v4.x, returning a primitive `bigint` causes a runtime `TypeError: Tempo.now(...).format is not a function`.

2. **Elimination of `Date.now()` Semantic Confusion**
   - While native JavaScript's `Date.now()` returns an epoch timestamp, it returns **milliseconds as a `number`**.
   - Returning **nanoseconds as a `bigint`** in `Tempo.now()` creates friction: developers expecting `Date.now()` parity often run into unit mismatches (nanoseconds vs milliseconds) or JSON serialization errors (`TypeError: Do not know how to serialize a BigInt`).

3. **Complete Redundancy with `Tempo.epoch`**
   - Tempo already provides a dedicated, unit-safe static property:
     - `Tempo.epoch.ns` (`bigint`)
     - `Tempo.epoch.ms` (`number`)
     - `Tempo.epoch.us` (`number`)
     - `Tempo.epoch.ss` (`number`)
   - Having primitives under `Tempo.epoch` cleanly separates raw telemetry numbers from date-time instance creation, making `Tempo.now()` free to serve as the instance factory.

4. **First-Class Factory Method with Options Support**
   - Developers who prefer functional/factory syntax over `new Tempo()` gain a clean entry point.
   - Accepting `options?: t.Options` enables instant configuration (e.g. timezone or hemisphere) at construction:
     ```typescript
     // Current time in UTC
     const utcNow = Tempo.now({ timeZone: 'UTC' });

     // Current time with custom configuration
     const sydneyNow = Tempo.now({ timeZone: 'Australia/Sydney', sphere: 'south' });
     ```

---

### Migration Path

#### For Consumers Needing Epoch Timestamps:
```typescript
// Before (v4.x)
const epochNano = Tempo.now();
const epochMs   = Tempo.now('ms');

// After (v5.0.0)
const epochNano = Tempo.epoch.ns;
const epochMs   = Tempo.epoch.ms;
```

#### For Consumers Needing the Current Moment:
```typescript
// v5.0.0
const current = Tempo.now();
const formatted = Tempo.now().format('{hh}:{mi}');
```

---

### Blast-Radius Analysis

#### Monorepo Internal Call Sites
1. **Internal Helper (`tempo.class.ts`):**
   - [`packages/tempo/src/tempo.class.ts:L1380`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1380):
     ```typescript
     // Update:
     static get instant() { return Temporal.Instant.fromEpochNanoseconds(Tempo.epoch.ns); }
     ```
2. **Community Plugins (`AtomicClock.ts`):**
   - [`packages/plugins/sync/src/AtomicClock.ts:L68,L100`](file:///home/michael/Project/magma/packages/plugins/sync/src/AtomicClock.ts#L68):
     ```typescript
     // Update:
     const nowNano = Tempo.epoch.ns;
     ```
3. **Core Test Suites:**
   - [`packages/tempo/test/core/static.methods.test.ts:L228-L248`](file:///home/michael/Project/magma/packages/tempo/test/core/static.methods.test.ts#L228-L248):
     - Update test to verify `Tempo.now()` returns `instanceof Tempo`.
     - Verify `Tempo.now({ timeZone: 'UTC' })` configures the instance timezone.
     - Move primitive unit assertions (`'bigint'`, `'ms'`, magnitude comparisons) to `Tempo.epoch`.
4. **Documentation Alignment:**
   - [`packages/tempo/doc/2-core-concepts/tempo.interval.md:L41,L85`](file:///home/michael/Project/magma/packages/tempo/doc/2-core-concepts/tempo.interval.md#L41):
     Existing examples like `new Tempo.Interval(Tempo.now(), null)` and `businessHours.contains(Tempo.now())` were already written assuming `Tempo.now()` yields an instance; with this change, they become valid and idiomatic.

#### External Consumer Impact
* **Severity:** Low to Moderate.
* **Risk Mitigation:**
  - Standard SemVer major version bump (`5.0.0`).
  - Clear entry in CHANGELOG and v5 Migration Guide directing timestamp users to `Tempo.epoch.ns`.
  - TypeScript compilation immediately catches type mismatches where `bigint` arithmetic was performed directly on `Tempo.now()`.

---

## 3. npm Distribution & Scope Isolation Strategy

### Independent Package Namespaces
Because v5 introduces the `@tempo-dev` scope transition (anchored by `@tempo-dev/core`), npm distribution tags are **completely isolated per-package**:
* `npm install @magmacomputing/tempo@latest` installs the latest stable **v4** release.
* `npm install @tempo-dev/core@latest` installs the latest stable **v5** release.

Neither package name conflicts with or overwrites the other on the npm registry.

### Automated Dist-Tag Resolution (`publish.yml`)
The [`.github/workflows/publish.yml`](file:///.github/workflows/publish.yml) workflow provides an optional `tag` input in `workflow_dispatch` (`auto | latest | next | legacy`, defaulting to `auto`):
1. **Prerelease detection:** Versions containing pre-release identifiers (e.g. `5.0.0-alpha.1`) automatically publish with `--tag next`.
2. **Major version precedence:** When publishing a `v4.x` patch from `maintenance/v4`:
   - While v4 is the highest published major on npm, it publishes with `--tag latest`.
   - Once a package has published a version with a higher major (e.g. `>= 5.0.0`), subsequent v4 releases automatically publish with `--tag legacy`.
3. **Manual Override:** Developers can explicitly choose a tag (e.g. `legacy`, `next`, `latest`) at execution time in GitHub Actions. Dist-tags are validated to ensure they are URL-safe and cannot be interpreted by npm as a SemVer version or range (such as strings starting with digits or 'v').

---

## 4. Documentation & GitHub Pages Multi-Version Strategy

### The Single-Artifact Constraint
GitHub Pages deploys a single build artifact per repository. If pushes to `maintenance/v4` triggered documentation builds, they would overwrite the active documentation deployed from `main`.

### The Multi-Version Architecture
1. **Deployment Branch Isolation:**
   - Keep [`deploy-docs.yml`](file:///.github/workflows/deploy-docs.yml) strictly triggered by pushes to `main`. Pushes to `maintenance/v4` will not trigger live Pages deployments.
2. **Archival `/v4/` Route Snapshotting:**
   - The final `v4.6.0` documentation build will be preserved under a `/v4/` route within VitePress.
   - The VitePress navigation bar will provide a top-level version switcher:
     ```text
     [ v5.0.0 (latest) ▼ ]
       • v5.0.0 (latest)  -> /
       • v4.6.0 (LTS)     -> /v4/
     ```
3. **Domain Isolation (`tempo.dev`):**
   - As `@tempo-dev` matures, `tempo.dev` will serve the primary v5 documentation and interactive playground, while `magmacomputing.github.io/magma/` can continue serving the legacy v4 docs or redirect seamlessly.

