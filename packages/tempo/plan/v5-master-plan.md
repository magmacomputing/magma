# Tempo v5.0.0 Master Plan & Phase Roadmap

## 1. Executive Summary & Vision

Tempo **v5.0.0** represents the definitive modern milestone for the Tempo date-time engine. Unlike minor releases (`v4.x`), v5 establishes a clean break from legacy and suboptimal API conventions, establishes a dedicated, developer-friendly npm namespace (**`tempo-kit`** + **`@tempo-kit/*`**), optimizes the core bundle size for greenfield and serverless/edge environments, and introduces reactive signals.

This Master Plan consolidates all prior RFCs, breaking change analyses, and architectural proposals into a unified, phase-based execution checklist.

---

## 2. Phase-Based Execution Roadmap

```mermaid
graph TD
  P1["Phase 1: Core Modernization & Signals<br><i>(PR #110 Merged — now() factory pending)</i>"] --> P2["Phase 2: Scope & Namespace Setup<br><i>(tempo-kit & @tempo-kit/*)</i>"]
  P2 --> P3["Phase 3: Plugin Ecosystem Modularization<br><i>(Dialects Standalone, Core Superpowers)</i>"]
  P3 --> P4["Phase 4: Library & Code Standards<br><i>(isNonNull, Strict isDefined, Semicolons)</i>"]
  P4 --> P5["Phase 5: Multi-Version Docs & AI Context<br><i>(VitePress /v4/ & llms.txt)</i>"]
  P5 --> P6["Phase 6: Release Engineering & Dual Publishing<br><i>(CI/CD, npm Tags, GA Launch)</i>"]
```

---

### Phase 1: Core Modernization, Deprecations & Signals (PR #110 & Phase 1 Complete)
*Status: Completed*

- [x] **`Tempo.now()` Transition to Instance Factory**:
  - `Tempo.now()` returns an immutable `Tempo` instance (supports options like `{ timeZone, sphere }`) instead of primitive `bigint` nanoseconds.
  - Raw epoch numbers cleanly moved to `Tempo.epoch.ns`, `Tempo.epoch.ms`, `Tempo.epoch.us`, and `Tempo.epoch.ss`.
  - Static `Tempo.instant` returns native `Temporal.Instant`. Static tests updated in `static.methods.test.ts`.
- [x] **Format Token Rationalization**:
  - Deprecate legacy `{ww}` and `{wy}` in favor of canonical ISO `{yow}` and `{woy}`.
  - Canonicalize orthogonal `:compact` modifier across parser, format, and explain, completely eliminating legacy fused modifiers (e.g. `{tz:offsetcompact}`).
  - Standardize offset sub-components on canonical `:hh`, `:mi`, `:ss`.
- [x] **Signal-Aware Ticker & NTP Architecture**:
  - Add reactive signal getters (`ticker.signal`, `Tempo.ticker.signal()`, `Tempo.ntp.signal()`).
  - Eliminate circular GC retention in `Finalizer.register` closures using `WeakRef` handles.
  - Ensure individual `toSignal()` consumer disposal only detaches that reactive subscription without stopping shared ticker instances.
- [x] **Plugin Cross-Version Compatibility**:
  - Split `getRuntime` import in `@magmacomputing/tempo-plugin-dialects` to preserve dual `^4.7.0 || ^5.0.0` peer dependency support.
- [x] **Review Remediation**:
  - Resolve all 7 CodeRabbit review findings on PR #110 with localized unit test and monorepo build verification.
- [x] **`Tempo.derive()` Prototypal Sandbox Architecture**:
  - Transitioned legacy `Tempo.create()` to `Tempo.derive()` (Option A: clean break) aligning conceptual parity with `Enum.derive()`.
  - Non-destructive prototypal sandbox inheritance with full `[Symbol.dispose]` explicit resource management (`using`) and scoped callbacks (`Tempo.derive(fn)` / `Tempo.derive(options, fn)`).

---

### Phase 2: Package Scope & Namespace Setup (`tempo-kit` & `@tempo-kit/*`)
*Status: Namespace Locked (`tempo-kit` + `@tempo-kit/*`)*

Following the industry precedent established by Vite (`vite` + `@vitejs/*`), Svelte (`svelte` + `@sveltejs/*`), and Octokit (`octokit` + `@octokit/*`), Tempo v5 will migrate from the corporate `@magmacomputing` prefix to a dedicated, community-facing unscoped primary package (**`tempo-kit`**) paired with a scoped plugin ecosystem (**`@tempo-kit/*`**):

- [x] **Step 1: Claim `@tempo-kit` Organization and Unscoped Packages on npm**:
  - Claimed and initialized the **`@tempo-kit`** organization on npm (`tempo-kit` org, OIDC Trusted Publishing wired to `publish.yml`).
  - Held **`@tempokit`**, **`@tempo-js`**, and **`@tempo-fns`** as empty defensive organizations (no packages published to avoid brand/download dilution).
  - Claimed unscoped packages **`tempo-kit`** (`0.0.1`), **`tempo-fns`**, and **`tempo-lib`** on npm registry under maintainer `magmacomputing`.
  - Configure 2FA, team permissions, and automated GitHub Actions publishing (OIDC / `TEMPO_NPM_TOKEN`).
- [x] **Step 2: Finalize Primary Package Decision (`tempo-kit` + `@tempo-kit/*`)**:
  - **`tempo-js` Permanently Blocked**: GitHub Support confirmed on Nov 23, 2026 that npm's automated `E403` moniker-similarity protection cannot be bypassed or overridden, even for `tempojs` / `@tempo-js` owners.
  - **`@tempojs` Scope Closed**: GitHub Support declined to transfer `@tempojs` based on inactivity/outreach alone; no trademark claim will be filed.
  - **Final Selection — `tempo-kit` + `@tempo-kit/*`**: Selected **`tempo-kit`** as the sole unscoped primary package (`import { Tempo } from 'tempo-kit'`, `'tempo-kit/core'`, `'tempo-kit/terms/quarter'`) paired with **`@tempo-kit/plugin-*`** for plugins, keeping `tempojs` untouched/unpublished and clarifying in `README.md` that `tempo-kit` is an independent `Temporal`-native engine (unrelated to `@formkit/tempo`).
- [ ] **Step 3: Establish Canonical Package Mapping & Taxonomy**:
  - **Core (`tempo-kit`)**: Base Tempo library with built-in Modules (`Parse`, `Format`, `Mutate`, `Duration`, and Civic Terms), without external plugins.
  - **Core (`tempo-kit/core`)**: Bare-bones, tree-shakeable Tempo kernel with no modules or plugins registered by default (preserving v4 `./core` semantics).

  | Current v4 Scope (`@magmacomputing/*`) | Target v5 Primary Package | Scoped / Defensive Aliases | Role / Exports |
  | :--- | :--- | :--- | :--- |
  | `@magmacomputing/tempo` | **`tempo-kit`** | — | Batteries-included engine with built-in modules, plus subpath exports (`./core` for the bare-bones kernel with no modules/plugins, `./terms` for extended built-in terms, `./parse`, `./format`, `./mutate`, `./duration`, `./plugin/sdk`) |
  | `@magmacomputing/tempo-fns` | **`tempo-fns`** | `@tempo-kit/fns` | Standalone functional date math & algorithms for Temporal |
  | `@magmacomputing/library` | **`tempo-lib`** | `@tempo-kit/lib` | Modularized core primitives, assertions, type-guards, and reflection |
  | `@magmacomputing/tempo-plugin-dialects` | **`@tempo-kit/plugin-dialects`** | — | Moment / Day.js / Luxon / SQL format compatibility |
  | `@magmacomputing/tempo-plugin-ticker` | **`@tempo-kit/plugin-ticker`** | — | High-precision reactive scheduler & pulse engine |
  | `@magmacomputing/tempo-plugin-ntp` | **`@tempo-kit/plugin-ntp`** | — | Network Time Protocol clock drift synchronization |
  | `@magmacomputing/tempo-plugin-signals` | **`@tempo-kit/plugin-signals`** | — | Reactive TC39 Signals integration (`Tempo.signals`, `toRelativeSignal`, `intervalSignal`, `watchSystem`) |
  | `@magmacomputing/tempo-plugin-ai` | **`@tempo-kit/plugin-ai`** | — | AI calendar reasoning & natural extraction |
  | `@magmacomputing/tempo-plugin-geo` | **`@tempo-kit/plugin-geo`** | — | Reverse geocoding & timezone resolution |
  | `@magmacomputing/tempo-plugin-holidays` | **`@tempo-kit/plugin-holidays`** | — | International public holidays & business schedules |
  | `@magmacomputing/tempo-plugin-celestial`| **`@tempo-kit/plugin-celestial`** | — | Sun/Moon ephemeris, solar events, & tides |
  | `@magmacomputing/tempo-plugin-spatial` | **`@tempo-kit/plugin-spatial`** | — | Geofencing, coordinate distance, bearing, velocity |
  | `@magmacomputing/tempo-plugin-sync` | **`@tempo-kit/plugin-sync`** | — | High-precision atomic clock & drift correction |
  | `@magmacomputing/tempo-plugin-batch` | **`@tempo-kit/plugin-batch`** | — | High-throughput batch date-time processing |
  | `@magmacomputing/tempo-plugin-roman` | **`@tempo-kit/plugin-roman`** | — | Roman calendar & consular dating |
  | `@magmacomputing/tempo-plugin-snap` | **`@tempo-kit/plugin-snap`** | — | Quantization & temporal snap grids |

---

### Phase 3: Plugin Ecosystem Modularization & Greenfield Optimization
*Status: Planned*

To ensure Core Tempo remains clean, modern, and unburdened by legacy runtime shims or non-essential domain data, ecosystem plugins are modularized while preserving core signature superpowers:

- [x] **Civic vs. Cultural Terms Split (Option B — Zero-Cost Built-In Subpath `tempo-kit/terms`)**:
  - **Rename Internal Workspace (`packages/plugins/.std` $\rightarrow$ `packages/plugins/.terms`)**: Rename the dot-prefixed built-in terms workspace from `.std` to `.terms` (keeping the `.` prefix that separates built-in terms from standalone plugins) and align internal subpath mappings (`#tempo/std` $\rightarrow$ `#tempo/terms`, `std.d.ts` $\rightarrow$ `terms.d.ts`).
  - **Civic Terms in Core (`CivicTerms`)**: Retain `QuarterTerm` (`#quarter`, `#qtr`), `SeasonTerm` (`#season`, `#szn`), and `TimelineTerm` / `TimeOfDayTerm` (`#timeOfDay`, `#tod`) directly in Core Tempo (`tempo-kit`). These represent universal, uncontroversial civic, business, and daily scheduling concepts used across reporting, fiscal cycles, formatting, and `Ticker`.
  - **Cultural Terms Opt-In (`tempo-kit/terms` / `CulturalTerms`)**: Decouple `ZodiacTerm` (Western astrology) and `EasternTerm` (Chinese zodiac / lunar signs) from Core's automatic default startup loader into a built-in, zero-bundle-cost subpath export **`tempo-kit/terms`** (plus granular subpaths `tempo-kit/terms/zodiac`, `tempo-kit/terms/eastern`, `tempo-kit/terms/timeline`, `tempo-kit/terms/quarter`, `tempo-kit/terms/season`).
    - *Impact*: Saves astrological/lunar lookup tables from every default `tempo-kit` application bundle and eliminates enterprise/business skepticism around horoscopes in a core date library, while requiring **zero extra `npm install`** when developers want to explore or use them.
    - *Consumption*: Available out-of-the-box via `import { ZodiacTerm, CulturalTerms } from 'tempo-kit/terms'; Tempo.use(CulturalTerms);` (or `import { ZodiacTerm } from 'tempo-kit/terms/zodiac';`). Serves in documentation as the flagship showcase of Tempo's custom terminology extensibility.
- [x] **Retain Slick Shorthand Syntax as Core Superpower**:
  - Keep intuitive term navigation (`t.set('#qtr.>q1')`, `t.add('#season.>summer')`), directional operators (`>`, `<`, `+`, `-`), and shorthand shifters (`t.set({ mm: '>2', wkd: '>Fri' })`) natively built into Core.
  - Evaluation confirmed that saving ~3–4 KB gzipped does not justify fracturing Tempo's signature ergonomics or requiring extra plugin boilerplate for fundamental shorthand.
- [ ] **Standalone Dialects Architecture (`@tempo-kit/plugin-dialects`)**:
  - Keep legacy format compilers (Moment, Day.js, Luxon, POSIX `strftime`, Go, PHP, Oracle SQL) out of Core Tempo.
  - Provide 4-tier consumption:
    1. Zero-config drop-in: `import '@tempo-kit/plugin-dialects';`
    2. Explicit registration: `Tempo.use(DialectsPlugin);`
    3. Granular single-dialect imports: `import '@tempo-kit/plugin-dialects/luxon';`
    4. Migration AST introspection: `import { explain, convert } from '@tempo-kit/plugin-dialects/migrate';`
- [x] **Reclaim `{ww}` for Calendar Week**:
  - Free `{ww}` from being an ISO week alias; reassign it to represent calendar week of year (Jan 1 basis, matching Oracle SQL `WW`).
  - Add `{wom}` (week of month, `1`–`5`).

---

### Phase 4: Library & Code Standards Harmonization
*Status: In Progress*

- [x] **Enumify Static Reflection Architecture & Prototype Removal (`@magmacomputing/library`)**:
  - Migrate `enumify` instances from prototype methods (`.has()`, `.get()`, `.keys()`, `.values()`, `.entries()`, `.invert()`, `.keyOf()`, `.includes()`, `.count()`, `.extend()`, `.forEach()`, `.filter()`, `.map()`) to static `Enum.*` reflection suite.
  - Eliminate member property shadowing risks on Enum instances, retaining only `[Symbol.iterator]` and `[Symbol.toStringTag]`.
  - Migrate prototype memoization to dedicated module-scoped `WeakMap`s (`keysCache`, `valuesCache`, `entriesCache`, `invertCache`) for O(1) lookups without serialization overhead.
  - Add `Enum[Symbol.hasInstance]` and strongly-typed `Enum.derive` overloads with `Omit<T, keyof E> & E`.
  - Clean up obsolete prototype exclusion types (`EnumMethodKeys`, `IgnoreOfMap`, `EnumMethodExclusions`, `IgnoreOf`) in favor of direct `WellKnownSymbols`.
- [x] **Type-Guard Semantics Correction (`isNotNullish` vs. Strict `isDefined`)**:
  - *Problem*: In v4, `isDefined(null)` returned `false`, trapping `null` in a semantic void where it was neither defined nor undefined.
  - *Step 1*: Introduce `isNotNullish<T>(val): val is NonNullable<T>` in `@magmacomputing/library` (and `@magmacomputing/tempo-fns`).
  - *Step 2*: Perform monorepo sweep migrating existing call sites from `isDefined` to `isNotNullish` (and `!isDefined` to `isNullish`) to ensure 100% behavioral preservation.
  - *Step 3*: Redefine `isDefined<T>(val): val is Exclude<T, undefined>` (`val !== undefined`), creating strict logical symmetry: `!isDefined(x) <=> isUndefined(x)`.
- [x] **Type-Guard Semantics Correction (`isInteger` vs. `isBigInt`)**:
  - *Problem*: In `@magmacomputing/library`, `isInteger(obj)` is defined as `typeof obj === 'bigint'`, creating an unexpected semantic trap where standard JS integer numbers (`Number.isInteger(2026)`) return `false`.
  - *Step 1*: Introduce canonical `isBigInt(obj): obj is bigint => typeof obj === 'bigint'` in `@magmacomputing/library`.
  - *Step 2*: Migrate existing call sites checking for `bigint` (e.g. In `coercion.library`, `interval.class`, `serialize.library`) from `isInteger` to `isBigInt`.
  - *Step 3*: Re-align `isInteger` with standard ECMAScript semantics: `isInteger(obj): obj is number => Number.isInteger(obj)`.
- [ ] **ECMAScript Standards Compliance: Repository-Wide Semicolon Policy**:
  - Adopt explicit statement termination across all monorepo TypeScript files (`semi: true`) per ECMA-262 § 16.2.2.
  - Add standard semicolons to VitePress theme files to eliminate one-off style anomalies.
  - Configure automated linter/formatter rule (`biome.json` / `.prettierrc`).

---

### Phase 5: Multi-Version Docs, Playground & AI Context (`llms.txt`)
*Status: Planned*

- [x] **Archival `/v4/` Route Snapshotting in VitePress**:
  - Freeze final `v4.7.0` documentation under `/v4/` route in VitePress.
  - Deploy documentation strictly from `main` to prevent branch deployment collisions on GitHub Pages.
  - Add top-level version selector in VitePress navbar:
    ```text
    [ v5.0.0 (latest) ▼ ]
      • v5.0.0 (latest)  -> /
      • v4.7.0 (LTS)     -> /v4/
    ```
- [ ] **Version-Segregated AI Context Files (`llms.txt`)**:
  - Prevent RAG context contamination between v4 (primitive timestamps, `@magmacomputing`) and v5 (instance factories, `tempo-kit` / `@tempo-kit/*`).
  - Route layout:
    ```text
    tempo.dev/
    ├── llms.txt          <-- v5 AI Index & Quick Reference (Latest)
    ├── llms-full.txt     <-- v5 Complete Concatenated Context
    └── v4/
        ├── llms.txt      <-- v4 AI Index & Quick Reference (Frozen LTS)
        └── llms-full.txt <-- v4 Complete Concatenated Context (Frozen LTS)
    ```
  - Prominent warning banners on all `/v4/` AI bundles directing modern developers to v5.
- [ ] **Update Core Documentation**:
  - Update all code snippets in `packages/tempo/doc/` to use **`tempo-kit`** (e.g. `import { Tempo } from 'tempo-kit'`, `import { Tempo } from 'tempo-kit/core'`, `import 'tempo-kit/terms'`) alongside `@tempo-kit/plugin-*`.
  - Provide comprehensive **v4 $\rightarrow$ v5 Migration Guide** (including `@magmacomputing/tempo` $\rightarrow$ `tempo-kit` transition and `README` distinction from `@formkit/tempo`).
  - **Interactive Documentation Glossary & Canonical Lexicon**: Implement data-driven VitePress glossary ([`documentation-glossary-architecture.md`](file:///home/michael/Project/magma/packages/tempo/plan/documentation-glossary-architecture.md)) defining core temporal concepts, library idioms, and standards, and pipe definitions directly into `llms.txt`.

---

### Phase 6: Release Engineering & Dual-Publishing Pipeline
*Status: Planned*

- [ ] **Automated Multi-Target Publishing Pipeline (`publish.yml`)**:
  - Build and publish canonical core (`tempo-kit`, `tempo-fns`, `tempo-lib`) and scoped ecosystem plugins (`@tempo-kit/plugin-*`) via OIDC Trusted Publishing.
  - Publish backward-compatibility `@magmacomputing/*` `v5.0.0` bridge stubs that declare the canonical package in their `dependencies` (ensuring a single shared `Tempo` class singleton in memory across v4→v5 migrations), while keeping `@tempokit`, `@tempo-js`, `@tempo-fns`, and `tempojs` unpublished to avoid search/download dilution.
- [ ] **npm Distribution Tag Architecture**:
  | Package Name | Target Version | npm dist-tag | Target Audience |
  | :--- | :--- | :--- | :--- |
  | `tempo-kit` | `v5.0.0-rc.x` | `next` | Early adopters & release candidate testing |
  | `tempo-kit` | `v5.0.0` (GA) | `latest` | Primary canonical package for all v5 installations (`import { Tempo } from 'tempo-kit'`) |
  | `@magmacomputing/tempo` | `v4.7.x` | `latest-v4` (or `legacy`) | Long-term support for existing v4 codebases |
  | `@magmacomputing/tempo` | `v5.0.0` | `latest` | Dual-published bridge re-exporting `tempo-kit` with deprecation notice |
- [ ] **Release Milestones**:
  - `5.0.0-alpha.x`: Internal integration.
  - `5.0.0-rc.x`: Public release candidates and ecosystem testing.
  - `5.0.0`: Official General Availability (GA).
- [ ] **Post-Release Package Deprecations**:
  - Deprecate `@magmacomputing/tempo-plugin-finance` on npm upon `v5.0.0` GA release (superseded by `FiscalTerm` in `@magmacomputing/tempo/terms`):
    ```bash
    npm deprecate @magmacomputing/tempo-plugin-finance "Deprecated: fiscal quarters and tax-year calculations are now built into @magmacomputing/tempo v5.0.0+ via FiscalTerm (@magmacomputing/tempo/terms). Migrate t.finance.* to Tempo.use(FiscalTerm) + t.term.fiscal (see Tempo v5 Migration Guide)."
    ```

---

## 3. Future Horizons / Exploratory Proposals (Post-v5.0 GA)

For features and architectural investigations targeted beyond the initial v5.0 General Availability release, refer to active exploratory RFCs:

* **[Signals in Core Tempo](file:///home/michael/Project/magma/packages/tempo/plan/signals-core-discussion.md)** (`signals-core-discussion.md`):
  Explores deep reactive integrations (implemented in `@magmacomputing/tempo-plugin-signals` rather than Core Tempo for v5.0, keeping Core zero-signal-overhead):
  1. `Tempo.live()` / `Tempo.clock()` (fine-grained continuous live clocks for UI).
  2. `tempo.relativeSignal()` → implemented as `toRelativeSignal` (`Tempo.signals.relative`).
  3. `interval.toSignal()` → implemented as `intervalSignal` (`Tempo.signals.interval`).
  4. `Tempo.locale` reactive signal → implemented as `Tempo.signals.locale`, `Tempo.signals.timeZone`, and `Tempo.signals.watchSystem`.

---

## 4. Operational Appendix: Git Squash-Merge Realignment Procedure

When long-running feature branches diverge after squash-merges onto `main`, follow this standard procedure to synchronize without false conflict churn:

1. **Ensure local `main` is up to date**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Rebase feature branch using `--onto`**:
   Identify the base commit where the feature branch originally split from the previous feature branch, and rebase onto current `main`:
   ```bash
   git checkout feature/my-branch
   git rebase --onto main <base-commit-hash> feature/my-branch
   ```
3. **Verify and Force-Push**:
   Run local test suites to confirm clean alignment:
   ```bash
   npm test
   git push origin feature/my-branch --force-with-lease
   ```
