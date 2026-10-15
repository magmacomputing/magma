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

---

## 5. Dialects Strategy: Standalone Plugin with Zero-Config Opt-In Separation (`@tempo-dev/plugin-dialects`)

### Strategic Context: Preserving Core Purity Without the "Greenfield Tax"
After deep architectural evaluation, Tempo v5 will **not** embed the dialects engine directly into Core Tempo. Instead, Dialects will remain a dedicated, first-class standalone plugin published as `@tempo-dev/plugin-dialects` (with `@magmacomputing/tempo-plugin-dialects` maintained for backwards compatibility).

#### Why Dialects Remain Standalone
1. **No "Greenfield Tax" on Modern Codebases**:
   Tempo's native braced syntax (`{YYYY}-{MM}-{DD}`, `{HH}:{mm}:{ss}`) is modern, unambiguous, and fast. Embedding legacy layout compilers and regex tables for Oracle `TO_CHAR`, PHP `date()`, and Go reference formats into core would penalize new greenfield projects that never need legacy ecosystem shims.
2. **Edge & Serverless Runtime Efficiency**:
   In modern edge isolates (Cloudflare Workers, V8 isolates, AWS Lambda@Edge), bundle size and cold-start execution times are critical. Keeping dialects opt-in guarantees that Core Tempo remains hyper-lean and competitive with ultra-light alternatives.
3. **Separation of Core Identity vs. Migration Bridging**:
   Core Tempo's mission is "Humanizing Temporal" through clean, immutable primitives. Dialects serve primarily as a transition bridge for teams migrating from **Moment.js, Day.js, Luxon, date-fns, and POSIX `strftime`**. A standalone plugin honors both concerns without conflating them.

---

### The "Zero-Config Import, Opt-In Separation" Architecture
To eliminate onboarding friction while keeping Core Tempo completely pristine, `@tempo-dev/plugin-dialects` implements a 4-tier modular consumption model:

#### 1. Zero-Config Drop-In (Side-Effect Auto-Registration)
For maximum developer ergonomic convenience during migrations, a simple side-effect import automatically mounts shims and registers all 5 compilers onto global `Tempo` and instance prototypes without configuration boilerplate:

```typescript
import { Tempo } from '@tempo-dev/core';
import '@tempo-dev/plugin-dialects'; // Zero-config drop-in

// Immediately available across the application:
const t = Tempo.now();

// 1. Luxon / Moment convenience shims
t.toFormat('yyyy-MM-dd HH:mm:ss');
Tempo.fromFormat('2026-10-15', 'YYYY-MM-DD');

// 2. Direct dialect instance methods
t.dialects.sql('YYYY-MM-DD HH24:MI:SS'); // Oracle / SQL TO_CHAR
t.dialects.php('Y-m-d H:i:s');           // PHP date()
t.dialects.go('2006-01-02 15:04:05');    // Go reference layout
```

#### 2. Explicit Registration for Scoped / Containerized Lifecycles
For enterprise applications, micro-frontends, or environments enforcing strict dependency injection without global prototype augmentation:

```typescript
import { Tempo } from '@tempo-dev/core';
import { DialectsPlugin } from '@tempo-dev/plugin-dialects';

Tempo.use(DialectsPlugin);
```

#### 3. Granular Sub-Dialect Imports (Maximum Tree-Shaking)
Developers migrating from a single ecosystem (e.g., only Luxon or only Moment) can import specific compilers, incurring only ~1–2 KB rather than the full dialect suite:

```typescript
// Only imports and registers the LDML compiler and .toFormat() shim:
import '@tempo-dev/plugin-dialects/luxon';
```

#### 4. Introspection & Migration Tooling Separation (`/migrate`)
Developer introspection and egress utilities are kept in a dedicated subpath to avoid bundling ~28 KB minified (~8.4 KB gzipped) of human-readable AST tokens and egress translation dictionaries into production runtimes:

```typescript
import { explain, exportDialect, convert } from '@tempo-dev/plugin-dialects/migrate';

// AST breakdown:
const breakdown = explain('YYYY-MM-DD HH:mm:ss', 'moment');

// Cross-dialect transpilation:
const ldmlMask = convert('YYYY-MM-DD', 'moment', 'ldml');
```

---

### Monorepo Architecture & Long-Term Support
* **Workspace Status**: `packages/plugins/dialects/` remains an active, first-class workspace package in the monorepo and will **not** be deprecated upon v5.
* **Dual Publishing**: The package will be dual-published under `@tempo-dev/plugin-dialects` and `@magmacomputing/tempo-plugin-dialects`.
* **TypeScript Types**: Automated type augmentation via `declare module '@tempo-dev/core'` ensures seamless autocomplete on `t.dialects`, `t.toFormat()`, and `Tempo.fromFormat()`.

---

## 6. Core Byte-Budget Optimization: Extracting Low-Use Features

### Strategic Context: Maximizing Core Leanliness
Because format dialects will remain a standalone plugin rather than being embedded into Core Tempo, Core Tempo does not need to absorb any compiler or regex overhead. By additionally auditing and extracting niche, high-complexity features into opt-in plugins, Tempo v5 achieves a **substantial net-negative byte impact** compared to v4.

---

### Prime Candidate: The Slick Shorthand Engine (`@tempo-dev/plugin-slick`)

#### What the Slick Engine Encompasses
The "Slick" engine is a domain-specific mini-language inside Tempo designed for navigating and shifting across custom Terminology cycles:
1. **String Navigation Shorthand**: Shifting to dynamic term boundaries via string expressions (`t.set('#qtr.>q1')`, `t.add('#timeOfDay.>afternoon')`, `#zodiac.<`).
2. **Directional Operator Grammar**: Parsing and executing momentum modifiers (`>`, `<`, `>=`, `<=`, `+`, `-`, `this`).
3. **Cycle-Preservation Mathematics**: Calculating relative percentage offsets (e.g. remaining 45% of the way through an uneven cycle when shifting to the next Term).
4. **Slick Object Mutation Shifters**: Value-level shorthand in `.set()` and `.add()` (e.g. `t.set({ mm: '>2', wkd: '>Fri' })`).
5. **Core Footprint**:
   - Complex parser regexes in [`support.default.ts`](file:///home/michael/Project/magma/packages/tempo/src/support/support.default.ts) (`Match.slick`, `Match.slickValue`, `Match.shorthand`, `SLICK_KEYS`).
   - Extensive branching in [`engine.term.ts`](file:///home/michael/Project/magma/packages/tempo/src/engine/engine.term.ts#L134-L245) (~300+ lines).
   - Dedicated mutation handlers in [`module.mutate.ts`](file:///home/michael/Project/magma/packages/tempo/src/module/module.mutate.ts#L120-L175).
   - Early normalizer checks in [`engine.normalizer.ts`](file:///home/michael/Project/magma/packages/tempo/src/engine/engine.normalizer.ts#L131).
   - **Estimated Core Size:** ~8–12 KB minified.

#### Proposed Extraction to Plugin
* **New Package:** `@tempo-dev/plugin-slick` (or `@magmacomputing/tempo-plugin-slick`).
* **Consumption Model:**
  ```typescript
  import { Tempo } from '@magmacomputing/tempo';
  import { SlickPlugin } from '@tempo-dev/plugin-slick';

  Tempo.use(SlickPlugin);

  // Enables string shorthand and relative cycle preservation:
  t.set('#qtr.>q1');
  t.set({ wkd: '>Fri' });
  ```
* **Net Byte Savings**:
  - Extracting Slick saves **~8–12 KB**.
  - Dialects remains a standalone plugin (**0 KB added to Core**).
  - **Net Result for Core Tempo v5:** **~8–12 KB reduction in total package bundle size**, with significantly simpler core mutation and term resolution code paths.

---

### Additional Candidates for Byte-Savings Auditing in v5

| Feature Area | Current Location | Rationale for Extraction | Proposed Destination |
| :--- | :--- | :--- | :--- |
| **Astrological Terms** | `src/term/term.zodiac.ts` | Astrological signs (`#zodiac.aries`) are bundled in standard Tempo. Enterprise/business users rarely require horoscope cycles. | Move to `@magmacomputing/tempo-plugin-celestial` or `@tempo-dev/plugin-astrology`. |
| **Macro Epochs / Timelines** | `src/term/term.timeline.ts` | Geological and cosmological epochs (`#timeline.cenozoic`) are niche domain terms. | Move to community plugin `@tempo-dev/plugin-geology`. |
| **Complex Bidi Isolation** | `international.library.ts` | Bi-directional text isolation wrapper (`isolateBidi`) for formatting. | Audit whether standard `Intl` options suffice without custom wrappers. |

---

## 7. AI & LLM Context Architecture (`llms.txt` & `llms-full.txt`) Across Multi-Version Builds

### The Risk: Context Contamination & RAG Hallucinations
When a documentation build hosts both the latest v5 docs at root `/` and archived legacy docs at `/v4/`, naive documentation bundling presents a severe hazard for automated AI tooling:
1. **Contradictory Paradigm Ingestion**:
   If the full-text bundle ([`llms-full.txt`](file:///home/michael/Project/magma/packages/tempo/public/llms-full.txt)) recursively merges all Markdown documents across the site, an AI model (in Cursor, VS Code / GitHub Copilot, Antigravity, Claude, or ChatGPT) ingests conflicting rules side-by-side:
   - **`Tempo.now()`**: Returns a `bigint` nanosecond timestamp in v4 vs. a `Tempo` instance in v5.
   - **Package Scopes**: `@magmacomputing/tempo` in v4 vs. `@tempo-dev/core` in v5.
   - **Dialects**: Legacy plugin setup with manual registration in v4 vs. first-class standalone plugin with zero-config drop-in import (`import '@tempo-dev/plugin-dialects'`) in v5.
   - **Slick Syntax**: Built-in core grammar (`#qtr.>q1`, `{ mm: '>2' }`) in v4 vs. external `@tempo-dev/plugin-slick` in v5.
2. **Degraded AI Output Quality**:
   An AI assistant ingesting mixed-version documentation cannot reliably deduce which paradigm the developer's project targets, leading to subtle bugs, broken imports, and hallucinated hybrid syntax.

---

### Segmented Route Architecture

To maintain crystal-clear context boundaries for AI assistants, the documentation build must provide dedicated, version-segregated files:

```text
tempo.dev/
├── llms.txt               <-- v5 AI Index & Quick Reference (Latest)
├── llms-full.txt          <-- v5 Complete Concatenated Documentation Set
└── v4/
    ├── llms.txt           <-- v4 AI Index & Quick Reference (Frozen LTS)
    └── llms-full.txt      <-- v4 Complete Concatenated Documentation Set (Frozen LTS)
```

#### 1. Root Files (`/llms.txt` and `/llms-full.txt`)
* **Target Audience**: New projects and teams upgrading to v5.
* **Scope**: Exclusively documents v5 syntax, `@tempo-dev/core` imports, `Tempo.now()` as an instance factory, and first-class standalone plugins (such as `@tempo-dev/plugin-dialects`).
* **Header Metadata**:
  ```markdown
  # Tempo: Immutable Date-Time Engine & AI Syntax Rules (v5.x - Latest)
  > Targeted for @tempo-dev/core v5.x. For legacy v4 documentation, refer to:
  > https://tempo.dev/v4/llms.txt
  ```
* **Links**: All markdown documentation URLs resolve to root paths (e.g. `https://tempo.dev/1-getting-started/...`).

#### 2. Archived Route Files (`/v4/llms.txt` and `/v4/llms-full.txt`)
* **Target Audience**: Teams maintaining legacy v4 codebases.
* **Scope**: A frozen snapshot of the final `v4.6.0` documentation, preserving `@magmacomputing/tempo` package names, `bigint` timestamps, and separate dialect plugin instructions.
* **Prominent Warning Headline & Banner**:
  Anyone browsing directly to the `/v4/` sub-path—as well as any AI crawler or IDE ingesting `/v4/llms.txt` or `/v4/llms-full.txt` directly—must immediately encounter an unmissable headline and warning banner establishing the legacy context before any API documentation appears:
  ```markdown
  # ⚠️ ARCHIVED DOCUMENTATION: Tempo v4.x (v4.6.0 LTS)
  
  > [!WARNING]
  > **YOU ARE VIEWING ARCHIVED DOCUMENTATION FOR TEMPO v4.x (`@magmacomputing/tempo`).**
  > If you are starting a new project or maintaining modern code, use **Tempo v5.x (`@tempo-dev/core`)**:
  > - **v5 AI Rules & Index:** https://tempo.dev/llms.txt
  > - **v5 Full Documentation Context:** https://tempo.dev/llms-full.txt
  > - **v5 Web Documentation:** https://tempo.dev/
  >
  > **Key Breaking Differences in this v4.x Archive:**
  > 1. `Tempo.now()` returns primitive `bigint` nanoseconds (in v5, `Tempo.now()` returns an immutable `Tempo` instance).
  > 2. Package namespace is `@magmacomputing/tempo` (in v5, core is `@tempo-dev/core`).
  > 3. Dialects require external plugin `@magmacomputing/tempo-plugin-dialects` (in v5, streamlined via `@tempo-dev/plugin-dialects` zero-config import).
  > 4. Slick shorthand syntax (`#qtr.>q1`) is built-in (in v5, extracted to `@tempo-dev/plugin-slick`).
  ```
* **Full-Text Bundle Headline (`/v4/llms-full.txt`)**:
  The concatenated archive must also lead with this banner before concatenating any legacy markdown documents, ensuring RAG chunks at the document root prominently reflect the v4 boundary.
* **Links**: All markdown documentation URLs in `/v4/` resolve to preserved `/v4/` paths (e.g. `https://tempo.dev/v4/1-getting-started/...`).

---

### Build Pipeline Updates ([`generate-llms-txt.mjs`](file:///home/michael/Project/magma/packages/tempo/bin/generate-llms-txt.mjs))

1. **Path Filtering in Doc Crawlers**:
   The recursive file collector in [`generate-llms-txt.mjs`](file:///home/michael/Project/magma/packages/tempo/bin/generate-llms-txt.mjs#L11-L23) must filter out archival and internal directories:
   ```javascript
   const IGNORED_DIRS = new Set(['v4', 'plan', 'archive', 'drafts']);

   async function getMarkdownFiles(dir) {
     const entries = await readdir(dir, { withFileTypes: true });
     let files = [];
     for (const entry of entries) {
       if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
         files = files.concat(await getMarkdownFiles(join(dir, entry.name)));
       } else if (entry.isFile() && entry.name.endsWith('.md')) {
         files.push(join(dir, entry.name));
       }
     }
     return files.sort();
   }
   ```
2. **Archival Snapshot Generation**:
   - As part of the v5 branching / release cut, the existing `public/llms.txt` and generated `public/llms-full.txt` from `v4.6.0` will be frozen into `public/v4/llms.txt` and `public/v4/llms-full.txt`.
   - The VitePress build will copy the `/public` directory assets directly into the distribution output root, ensuring `/v4/llms.txt` is served under the `/v4/` route without additional server configuration.

---

### IDE Prompting & Rule Configuration Guidance

Documentation and developer onboarding guides should instruct users on how to configure their AI tooling according to project version:

| Target Version | Recommended Ingestion URL | IDE Rule / Prompt Snippet |
| :--- | :--- | :--- |
| **Tempo v5.x (Latest)** | `https://tempo.dev/llms.txt` | `@https://tempo.dev/llms.txt Use modern Tempo v5 syntax with @tempo-dev/core` |
| **Tempo v4.x (Legacy LTS)** | `https://tempo.dev/v4/llms.txt` | `@https://tempo.dev/v4/llms.txt Use legacy Tempo v4 syntax with @magmacomputing/tempo` |


