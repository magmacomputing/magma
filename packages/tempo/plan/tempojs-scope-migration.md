# Plan: `@tempo-dev` npm Scope Adoption & v5.0.0 Migration Strategy

## 1. Executive Summary & Value Proposition

Currently, the Tempo ecosystem is published under the corporate organization scope:
- `@magmacomputing/tempo`
- `@magmacomputing/tempo-fns`
- `@magmacomputing/tempo-plugin-*` (13+ plugins)

### Why Transition to `@tempo-dev` in v5.0.0?
1. **Developer Experience (DX) & Modern Branding**: Adopting the **`@tempo-dev`** scope (aligned with a `tempo.dev` domain identity) reflects modern, developer-first ecosystem standards (mirroring top-tier tools like `@sst-dev`, `@payload-dev`, and `@livekit-dev`).
2. **Zero Brand & Search Collision**: Completely sidesteps market and SEO confusion with `@formkit/tempo` (which relies on legacy `Date` helpers) by establishing a distinct, future-looking Temporal API identity.
3. **Clean Non-Stuttering Architecture (Pattern 1)**: By using `@tempo-dev/core` as the anchor package with modern subpath exports (`@tempo-dev/core/parse`, `@tempo-dev/core/format`), we eliminate import path repetition (`@tempojs/tempo`) while providing single-package atomic versioning.
4. **Clean Major Version Boundary (v5.0.0)**: Package name changes represent breaking changes for consumer imports, making the upcoming major release (`v5.0.0`) the ideal milestone.

> [!NOTE]
> **Abandonment of `@tempojs` Scope**: While outreach was previously initiated to the owner of the dormant `@tempojs` npm namespace, this path has been officially abandoned in favor of the cleaner, collision-free, and modern `@tempo-dev` scope.

---

## 2. npm Organization Setup & Domain Alignment

### Step 1: Claim `@tempo-dev` on npm
- Register the **`@tempo-dev`** organization on npm directly under the organization administrator account.
- Configure team permissions, 2FA, and automated GitHub Actions publishing tokens (`NPM_TOKEN`).

### Step 2: Align Domain & Repository Assets
- **Documentation Domain**: Target `tempo.dev` (or `tempodev.io`) for the VitePress documentation and interactive playground.
- **GitHub Organization**: Establish `github.com/tempo-dev` (or maintain within `github.com/magmacomputing/magma`).

---

## 3. Ecosystem Architecture & Package Mapping for v5.0.0

The v5.0.0 release implements **Pattern 1 (`@tempo-dev/core` with Subpath Exports)** alongside modular satellite packages:

| Current Scope (`@magmacomputing/*`) | Target v5.0.0 Package (`@tempo-dev/*`) | Architecture & Subpaths |
| :--- | :--- | :--- |
| `@magmacomputing/tempo` | **`@tempo-dev/core`** | Main fluent engine (`.`) with tree-shakeable subpath exports (`./parse`, `./format`, `./mutate`, `./duration`, `./library`, `./plugin/sdk`) |
| `@magmacomputing/tempo-fns` | **`@tempo-dev/fns`** | Standalone functional date math & celestial calculations |
| `@magmacomputing/tempo-plugin-ai` | **`@tempo-dev/plugin-ai`** | AI calendar reasoning & smart extraction |
| `@magmacomputing/tempo-plugin-celestial` | **`@tempo-dev/plugin-celestial`** | Sun/Moon ephemeris, solar events, & tidal predictions |
| `@magmacomputing/tempo-plugin-holidays` | **`@tempo-dev/plugin-holidays`** | Regional public holidays & business day scheduling |
| `@magmacomputing/tempo-plugin-geo` | **`@tempo-dev/plugin-geo`** | Reverse geocoding & timezone resolution |
| `@magmacomputing/tempo-plugin-spatial` | **`@tempo-dev/plugin-spatial`** | Geofencing, spatial distance, bearing, & velocity |
| `@magmacomputing/tempo-plugin-dialects` | **`@tempo-dev/plugin-dialects`** | Moment/Dayjs/Python format compatibility |
| `@magmacomputing/tempo-plugin-sync` | **`@tempo-dev/plugin-sync`** | High-precision atomic clock & drift correction |
| `@magmacomputing/tempo-plugin-ticker` | **`@tempo-dev/plugin-ticker`** | Reactive time ticker & pulse triggers |
| `@magmacomputing/tempo-plugin-batch` | **`@tempo-dev/plugin-batch`** | High-throughput web worker batch processing |
| `@magmacomputing/tempo-plugin-finance` | **`@tempo-dev/plugin-finance`** | Financial quarters, fiscal calendars, & trading days |
| `@magmacomputing/tempo-plugin-ntp` | **`@tempo-dev/plugin-ntp`** | Network Time Protocol socket client |
| `@magmacomputing/tempo-plugin-snap` | **`@tempo-dev/plugin-snap`** | Snap-to-grid rounding & quantization |

---

## 4. Consumer Developer Experience (DX)

### Subpath Exports on `@tempo-dev/core`
Consumers install a single package (`@tempo-dev/core`) and import either the full fluent class or tree-shakeable individual functions:

```typescript
// 1. Full Fluent Class
import { Tempo } from '@tempo-dev/core';

// 2. Tree-shakeable Subpaths (Zero release overhead; bundled in @tempo-dev/core)
import { parse } from '@tempo-dev/core/parse';
import { format } from '@tempo-dev/core/format';
import { mutate } from '@tempo-dev/core/mutate';

// 3. Functional Utility Helpers (Standalone package)
import { isWeekend, daysInMonth, getLunarPhase } from '@tempo-dev/fns';

// 4. Domain Plugins
import { CelestialPlugin } from '@tempo-dev/plugin-celestial';
import { AIPlugin } from '@tempo-dev/plugin-ai';

Tempo.use(CelestialPlugin);
```

#### Example `package.json` Subpath Configuration (`@tempo-dev/core`):
```json
{
  "name": "@tempo-dev/core",
  "version": "5.0.0",
  "exports": {
    ".": {
      "types": "./dist/tempo.index.d.ts",
      "import": "./dist/tempo.index.js"
    },
    "./parse": {
      "types": "./dist/module/module.parse.d.ts",
      "import": "./dist/module/module.parse.js"
    },
    "./format": {
      "types": "./dist/module/module.format.d.ts",
      "import": "./dist/module/module.format.js"
    },
    "./mutate": {
      "types": "./dist/module/module.mutate.d.ts",
      "import": "./dist/module/module.mutate.js"
    },
    "./duration": {
      "types": "./dist/module/module.duration.d.ts",
      "import": "./dist/module/module.duration.js"
    },
    "./library": {
      "types": "./dist/library.index.d.ts",
      "import": "./dist/library.index.js"
    },
    "./plugin/sdk": {
      "types": "./dist/plugin/plugin.sdk.d.ts",
      "import": "./dist/plugin/plugin.sdk.js"
    }
  }
}
```

---

## 5. Seamless Backward-Compatibility Strategy

To avoid breaking existing v4.x projects upon release of v5.0.0:

1. **Publish Bridge Stubs under `@magmacomputing/*`**:
   - For v5.0.0, publish lightweight wrapper packages under `@magmacomputing/tempo` and `@magmacomputing/tempo-plugin-*`.
   - The wrapper re-exports from `@tempo-dev/*`:
     ```typescript
     // @magmacomputing/tempo index.ts
     export * from '@tempo-dev/core';
     export { Tempo as default } from '@tempo-dev/core';
     ```
2. **Issue Deprecation Notices**:
   - Mark `@magmacomputing/tempo` on npm:
     ```bash
     npm deprecate @magmacomputing/tempo "Package moved to @tempo-dev/core. Please update your dependencies."
     ```

---

## 6. Monorepo Execution Checklist (For v5.0.0 Release)

- [ ] Claim npm organization `@tempo-dev`.
- [ ] Configure GitHub Secrets with `NPM_TOKEN` granting publish access to `@tempo-dev`.
- [ ] Update `package.json` in `packages/tempo` to name `"@tempo-dev/core"`.
- [ ] Configure `exports` in `packages/tempo/package.json` for subpaths (`./parse`, `./format`, etc.).
- [ ] Update `package.json` in `packages/functions` to `"@tempo-dev/fns"`.
- [ ] Update `package.json` in `packages/plugins/*` to `"@tempo-dev/plugin-*"`.
- [ ] Update documentation examples across `packages/tempo/doc/` and `README.md`.
- [ ] Update VitePress theme headers and installation snippets (`npm install @tempo-dev/core`).
- [ ] Create stub bridge packages for `@magmacomputing/*` v5.0.0 re-exports.
- [ ] Run full test matrix across Node 22, 24, and 26.
- [ ] Tag `v5.0.0` and publish with `npm publish --access public --workspaces`.

---

## 7. Strategic Differentiation Summary

| Dimension | `@formkit/tempo` | `@tempo-dev/core` (Tempo) |
| :--- | :--- | :--- |
| **Foundational Standard** | Legacy JavaScript `Date` | Modern ECMAScript **`Temporal`** architecture |
| **API Philosophy** | Functional helper library | Rich fluent class (`Tempo`) + Subpaths + Functional bundle (`@tempo-dev/fns`) |
| **Architecture** | Single-purpose date formatting | Extensible engine: AI, Celestial, Geo, Spatial, Ticker, Holidays |
| **Target Audience** | Day.js / date-fns migration projects | Future-proof TypeScript applications transitioning to native `Temporal` |
| **Ecosystem Identity** | Component within FormKit forms | Independent developer platform (`tempo.dev` / `@tempo-dev`) |

---

## 8.Version 5.0.0 Considerations

### 8.1 Node.js LTS Lifecycle & Compatibility Policy
- **OpenJS Foundation Release Cadence**: Even-numbered Node.js releases follow a 30-month lifecycle (Current $\to$ Active LTS $\to$ Maintenance LTS).
- **SemVer Major Bump Boundary**: Dropping support for an older Node runtime is a breaking change scheduled specifically for the **v5.0.0** release.

### 8.2 Testing Matrix Across Node Versions
1. **Current `engines` Contract (v4.x)**:
   The root `package.json` specifies:
   ```json
   "engines": {
     "node": ">=20.0.0"
   }
   ```
2. **Recommended CI Matrix**:
   - **Node 20**: Maintained in CI matrix for the `v4.x` series to support enterprise environments and CI runners.
   - **Node 22**: Essential (Active / Maintenance LTS).
   - **Node 24**: Essential (Active LTS).
   - **Node 26**: Recommended as `latest` / canary to catch engine changes early.
3. **v5.0.0 Target Baseline**:
   - For the **v5.0.0** `@tempo-dev` release, bump `engines.node` to `">=22.0.0"` and sunset Node 20 testing, aligning the modern scope with current LTS standards and Temporal runtime enhancements.

### 8.3 Producing separate versions of user-docs

Should we have a user-doc switch to display version 5 vs verion 4 of Tempo ?

