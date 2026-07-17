# Plan: Refactor Built-in Terms into `packages/plugins/.std/`

> **Status: DEFERRED** — agreed design, awaiting execution after other work is complete.

## Overview

Move the four built-in data Terms (Quarter, Season, Zodiac, Timeline) from
`packages/tempo/src/plugin/term/` into a new hidden directory
`packages/plugins/.std/`.

**Delivery:** Rollup inlines the `.std` source into `dist/term/` inside
`@magmacomputing/tempo` at build time — mirroring how `@magmacomputing/library`
is inlined into `dist/lib/`.  
**No separate npm publish is required.**

---

## Naming: `.std` (hidden directory)

The existing plugins workspace uses hidden directories for workspace infrastructure
(`.app/`) and visible directories for published plugins (`snap/`, `batch/` etc.).
`.std` inherits that convention: clearly internal, non-publishable, self-documenting.

| Name | Problem | Verdict |
|---|---|---|
| `standard` | Contributor thinks it's publishable; user tries `npm i @magmacomputing/tempo-plugin-standard` → 404 | ❌ |
| `.std` | Mirrors `.app`, clearly non-publishable | ✅ |

---

## Key Design Decisions (all resolved)

### Option B — `TermsModule` stays in `tempo.index.ts`

`TermsModule` remains in `packages/tempo/src/tempo.index.ts`.
`.std` exports **only** `StandardTerms` (the array of four terms) and the individual
term exports. This means `.std` has **no need** for `getRuntime` or `onRegistryReset`,
and `plugin-api` needs no new lifecycle surface exposure.

If a Premium plugin author needs runtime lifecycle access in future, a dedicated
mechanism will be designed at that time.

### `plugin-api` additions (minimal)

Only two pure utilities are added — no runtime singleton exposure:
- `resolveCycleWindow` (pure calculation function, already in `term.util.ts`)
- `logWarn` (simple console wrapper)

### Auto-loading safety

A user dropping a custom term file into `.std/src/` will **not** have it
auto-loaded. Rollup only bundles files reachable through the import graph.
Un-imported files are tree-shaken away. The `StandardTerms` array in
`.std/src/index.ts` is the sole entry gate.

### `dist/term/` modification risk

No greater than editing `dist/tempo.class.js`. Standard npm social contract applies.
A `/* Generated — do not edit */` header is sufficient deterrent.

---

## Proposed Changes

### 1 — New package: `packages/plugins/.std/`

#### `packages/plugins/.std/package.json`

```json
{
  "name": "@magmacomputing/tempo-std",
  "version": "1.0.0",
  "private": true,
  "description": "Standard built-in Terms for @magmacomputing/tempo (showcase implementation — not published separately)",
  "type": "module",
  "peerDependencies": {
    "@magmacomputing/tempo": "^3.9.x"
  }
}
```

`"private": true` — hard guard against accidental `npm publish`; also self-documents intent.

#### `packages/plugins/.std/src/index.ts`

```ts
export { QuarterTerm }  from './term.quarter.js';
export { SeasonTerm }   from './term.season.js';
export { ZodiacTerm }   from './term.zodiac.js';
export { TimelineTerm } from './term.timeline.js';

export const StandardTerms = [QuarterTerm, SeasonTerm, ZodiacTerm, TimelineTerm];
```

`TermsModule` is **not** here — it stays in `tempo.index.ts`.

#### `packages/plugins/.std/src/term.quarter.ts` / `term.season.ts` / `term.zodiac.ts` / `term.timeline.ts`

Move verbatim from `packages/tempo/src/plugin/term/`. Update imports:

```diff
- import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from './term.util.js';
- import { logWarn } from '../../support/support.util.js';
- import { COMPASS } from '../../support/support.enum.js';
- import { isNumber } from '#library/assertion.library.js';
- import type { Tempo } from '../../tempo.class.js';

+ import { defineTerm, getTermRange, defineRange, resolveCycleWindow, logWarn, COMPASS, isNumber } from '@magmacomputing/tempo/plugin-api';
+ import type { Tempo } from '@magmacomputing/tempo';
```

Module augmentation target:

```diff
- declare module '../../tempo.class.js' {
+ declare module '@magmacomputing/tempo' {
     interface TempoTermRegistry { ... }
  }
```

#### `packages/plugins/.std/README.md`

Content must include:
- ⚠️ Banner: "Not published separately"
- Why it exists (source organization, Rollup-inlined delivery)
- The four terms table (key, scope, description)
- How end-users access them (`import '@magmacomputing/tempo'` or `/term/quarter` sub-path)
- Clear instruction: **do not add custom terms here** — create a new `packages/plugins/<name>/` instead
- Build notes: source → `packages/plugins/.std/src/`, output → `packages/tempo/dist/term/`

#### `packages/plugins/.std/test/`

Move term tests from `packages/tempo/test/` (term-related files) alongside the source.

---

### 2 — `packages/tempo/src/tsconfig.json`

```diff
  "paths": {
    ...
+   "#tempo/std": [ "../../plugins/.std/src/index.ts" ],
  }
```

No project reference needed — `.std` is consumed as source (same pattern as `@magmacomputing/library`).

---

### 3 — `packages/tempo/src/tempo.index.ts`

`TermsModule` body unchanged. Only the import source changes:

```diff
- import { QuarterTerm }  from './plugin/term/term.quarter.js';
- import { SeasonTerm }   from './plugin/term/term.season.js';
- import { ZodiacTerm }   from './plugin/term/term.zodiac.js';
- import { TimelineTerm } from './plugin/term/term.timeline.js';

+ import { StandardTerms } from '#tempo/std';
```

And simplify the StandardTerms reference inside `TermsModule.install()`:

```diff
- TempoClass.extend([QuarterTerm, SeasonTerm, ZodiacTerm, TimelineTerm]);
+ TempoClass.extend(StandardTerms);
```

---

### 4 — `packages/tempo/src/plugin/term/term.index.ts` (slimmed)

Remove all data term imports, `StandardTerms`, and `TermsModule`. Retain framework only:

```ts
// Framework utilities for external Term plugin authors
export { defineTerm, defineRange, getTermRange, resolveCycleWindow } from './term.util.js';
export type { TermPlugin, Range, ResolvedRange } from './term.type.js';
```

**Delete:**
- `packages/tempo/src/plugin/term/term.quarter.ts`
- `packages/tempo/src/plugin/term/term.season.ts`
- `packages/tempo/src/plugin/term/term.zodiac.ts`
- `packages/tempo/src/plugin/term/term.timeline.ts`

---

### 5 — `packages/tempo/rollup.config.js`

Extend the `entryFileNames` routing hook (after the existing `dist/lib/` branch):

```diff
  if (id.includes('magma/packages/library') || rel.startsWith('../library')) {
      ...
      return `lib/${dir}${name}.js`;
  }

+ if (id.includes('magma/packages/plugins/.std') || rel.startsWith('../plugins/.std')) {
+     const match = normalizedRel.match(/plugins\/\.std\/src\/(.*)$/);
+     const modulePath = match ? path.dirname(match[1]) : '.';
+     const dir = modulePath === '.' ? '' : modulePath + '/';
+     return `term/${dir}${name}.js`;
+ }
```

Output: `dist/term/index.js`, `dist/term/term.quarter.js` … `dist/term/term.timeline.js`

---

### 6 — `packages/tempo/src/plugin-api.index.ts`

Add two pure utilities (no runtime exposure):

```diff
- export { defineTerm, defineRange, getTermRange } from './plugin/term/term.index.js';
+ export { defineTerm, defineRange, getTermRange, resolveCycleWindow } from './plugin/term/term.index.js';
+ export { logWarn } from './support/support.util.js';
```

---

### 7 — `packages/tempo/package.json`

#### `imports` — one addition

```diff
+ "#tempo/std": { "default": "./dist/term/index.js" },
```

#### `exports` — additive only

```diff
+ "./term/standard": { "types": "./dist/term/index.d.ts",          "import": "./dist/term/index.js" },
+ "./term/quarter":  { "types": "./dist/term/term.quarter.d.ts",   "import": "./dist/term/term.quarter.js" },
+ "./term/season":   { "types": "./dist/term/term.season.d.ts",    "import": "./dist/term/term.season.js" },
+ "./term/zodiac":   { "types": "./dist/term/term.zodiac.d.ts",    "import": "./dist/term/term.zodiac.js" },
+ "./term/timeline": { "types": "./dist/term/term.timeline.d.ts",  "import": "./dist/term/term.timeline.js" },
```

#### `sideEffects` — two removals

```diff
- "**/plugin/term/term.index.js",
- "**/plugin/term/term.index.ts",
```

#### `dependencies` — no change

`.std` source is inlined at build time. No new runtime npm dependency.

---

## Documentation Trawl

Run after code changes are complete. Files requiring review:

| File | Change |
|---|---|
| `doc/3-extending-tempo/tempo.term.md` L153 | `@magmacomputing/tempo/term/quarter` is now a **real** sub-path — confirm/add note |
| `doc/3-extending-tempo/tempo.modularity.md` L74 | Same — confirm `/term/quarter` sub-path validity |
| `doc/3-extending-tempo/tempo.term.md` (augmentation example) | Ensure `declare module '@magmacomputing/tempo'` (not `/core`) |
| `doc/9-plugins/` | Consider adding `.std.md` entry or expanding `tempo.term.md` with "Built-in Standard Terms" section |
| `doc/api/Variable.StandardTerms.md` | Delete stale file; regenerate via `npm run docs:api` |
| `doc/api/Variable.TermsModule.md` | Regenerate |
| `doc/api/Function.define*.md` + `getTermRange.md` | Regenerate |
| `doc/api/Interface.TempoTermRegistry.md` | Regenerate |

---

## Verification Plan

```bash
# 1. Build
cd packages/tempo && npm run build

# Confirm dist/term/ has 5 files
ls dist/term/
# → index.js  term.quarter.js  term.season.js  term.zodiac.js  term.timeline.js

# Confirm dist/plugin/term/ has only framework files
ls dist/plugin/term/
# → term.index.js  term.util.js  term.type.js

# 2. Full test suite
npm test

# 3. REPL smoke test
npm run repl
# tempo.quarter / tempo.season / tempo.zodiac / tempo.timeOfDay all resolve
# import { StandardTerms } from '@magmacomputing/tempo/term/standard' → [4 terms]

# 4. Plugin compat
cd ../plugins/snap && npm run build   # must still pass against updated plugin-api
```
