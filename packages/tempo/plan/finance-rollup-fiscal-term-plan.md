# Implementation Plan: Rollup of FinancePlugin into FiscalTerm

**Target Release:** Post-PR #113 (Subsequent Dedicated PR)  
**Status:** Planned  
**Related Packages:** `@magmacomputing/tempo`, `@magmacomputing/tempo-plugin-finance`, `@magmacomputing/tempo-cli`

---

## 1. Executive Summary & Objectives

The purpose of this plan is to consolidate Tempo's fiscal and business calendar logic into the dedicated **`FiscalTerm`** (`@magmacomputing/tempo/terms`), absorb all utilities currently provided by `@magmacomputing/tempo-plugin-finance`, and cleanly retire `@magmacomputing/tempo-plugin-finance` across the monorepo, documentation, catalogs, REPL, and CI pipelines.

### Primary Goals
1. **Upgrade Core Comparison & Equality (`Tempo.compare`, `Tempo.equals`, `t.equals`)**:
   - Add an optional 3rd `unit` parameter to `Tempo.compare(t1, t2, unit?)` (`year`, `month`, `week`, `day`, `hour`..`nanosecond`, `'date'`, `'time'`).
   - Add static `Tempo.equals(t1, t2, unit?)` and instance `t1.equals(t2, unit?)` backed by `compare(...) === 0`.
   - Eliminates the need for ad-hoc boundary booleans on individual Terms (`f?.key === 'FQ1' && t.equals(f.span.start, 'day')`).
2. **Absorb `FinancePlugin` Capabilities & Polish Scope Naming in `FiscalTerm`**:
   - Rename unreleased v5 `fiscalYear` → `year` on `FiscalTerm` scope to avoid redundant naming (`t.term.fiscal.year`, `{#fiscal.year}` instead of `t.term.fiscal.fiscalYear`).
   - Add optional `startDay?: number` (default `1`) to `FiscalTermOptions` to support non-1st-of-month fiscal cycles (such as the UK April 6 personal tax year).
   - Ensure full parity for `year`, `key` (`'FQ1'`..`'FQ4'`), `.span` metrics, and `#fiscal` format tokens (replacing `t.finance.isFiscalYearStart()` cleanly via `f?.key === 'FQ1' && t.equals(f.span.start, 'day')`).
3. **Retire `@magmacomputing/tempo-plugin-finance`**:
   - Prune `packages/plugins/finance/` (11 tracked files).
   - Deprecate the published npm package via `npm deprecate @magmacomputing/tempo-plugin-finance` pointing to `@magmacomputing/tempo/terms/fiscal` (`FiscalTerm`).
   - Prune package references from monorepo lockfile (`npm run lock:sync`).
   - Cleanly prune catalog metadata, REPL manifests, importmaps, and plugin harvesting scripts.
4. **Decouple Documentation Examples**:
   - Replace references to `@magmacomputing/tempo-plugin-finance` in documentation tutorials (e.g., `tempo.namespace.md`, `sandbox-factory.md`) with self-contained pedagogical domain examples (e.g., `audit` or `sprint`).
5. **Isolate PR Scope & Budget**:
   - Keep this work in a dedicated follow-up PR to ensure PR #113 stays well below CodeRabbit's 100-file per-PR review ceiling.

---

## 2. Technical Architecture & Design

### 2.1 API Comparison & Mapping

| Feature | Legacy `@magmacomputing/tempo-plugin-finance` | New `FiscalTerm` (`@magmacomputing/tempo/terms`) |
| :--- | :--- | :--- |
| **Quarter Index** | `t.finance.fiscalQuarter` (hardcoded Jan 1 start) | `t.term.fiscal.key` (`'FQ1'`..`'FQ4'`) & `t.term.fqtr` |
| **Fiscal / Tax Year** | `t.finance.taxYear` (hardcoded `tempo.yy`) | `t.term.fiscal.year` (jurisdiction- and month-adjusted) |
| **Year Start Flag** | `t.finance.isFiscalYearStart()` (hardcoded Jan 1 method) | Derived cleanly via `.equals()`: `f?.key === 'FQ1' && t.equals(f.span.start, 'day')` |
| **Jurisdictions** | None (manual or hardcoded Jan 1) | Automatic cascade: `options.country` → `t.geo.country` → `t.locale` |
| **Custom Day Start** | Unsupported | `startDay?: number` (e.g. `6` for UK personal tax year) |
| **Range Metrics** | None | `t.term.fiscal.span.{start, end, total, elapsed, remaining, progress}` |
| **Token Formatting** | None | `t.format('{#fiscal} {#fiscal.year}')` |

---

## 3. Detailed Work Breakdown

### Phase 0: Core Comparison & Equality (`packages/tempo/src/tempo.class.ts`, `tempo.type.ts`) — ✅ Complete

1. **Define `CompareUnit` Type (`packages/tempo/src/tempo.type.ts`)**:
   - Extend `DateTimeUnit` (`'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond'`), plurals, and `Element` abbreviations with `'date'` (alias for `'day'`) and `'time'` (wall-clock time slice).

2. **Upgrade `Tempo.compare(tempo1?, tempo2?, unit?)` (`packages/tempo/src/tempo.class.ts`)**:
   - **Backward compatibility**:
     - When `unit` is omitted, retain exact `epoch.ns` comparison (`-1 | 0 | 1`), keeping `Array.prototype.sort(Tempo.compare)` (2-arg invocation) and `Tempo.compare(past)` (omitted `tempo2` defaults to `now`) unchanged.
   - **Coercion & TZ alignment**:
     - Resolve `one` using `host`, and when coercing raw strings/options for `two`, inherit `one`'s `timeZone`/`calendar` if none is explicitly supplied. Project `two` into `one`'s timezone when evaluating calendar/time units so `compare(t1, t2, 'day')` stays consistent with instant `compare(t1, t2)`.
   - **Unit resolution rules**:
     - `'year'`: compare `yy`
     - `'month'`: compare `(yy, mm)`
     - `'week'`: compare ISO week-year & week `(yow, woy)`
     - `'day' | 'date'`: compare `Temporal.PlainDate.compare` (calendar date)
     - `'hour' .. 'nanosecond'`: compare truncated `Temporal.PlainDateTime` / instant up to the requested unit
     - `'time'`: compare `Temporal.PlainTime.compare` (wall-clock time ignoring date)

3. **Add `Tempo.equals` & `Tempo.prototype.equals` (`packages/tempo/src/tempo.class.ts`)**:
   - `static equals(tempo1?: t.DateTime | t.Options, tempo2?: t.DateTime | t.Options, unit?: t.CompareUnit): boolean` → delegates to `this.compare(tempo1, tempo2, unit) === 0`.
   - `equals(other?: t.DateTime | t.Options, unit?: t.CompareUnit): boolean` → delegates to `(this.constructor as typeof Tempo).equals(this, other, unit)`.
   - Aligns with `Tempo.compare` (no-arg `t1.equals(t2)` checks instant equality `epoch.ns`, distinct from `Temporal.ZonedDateTime.prototype.equals` which rejects matching instants in different timezones/calendars).

4. **Unit Tests (`packages/tempo/test/core/static.methods.test.ts` + instance suite)**:
   - Verify `Tempo.compare(t1, t2, unit)` and `equals` across `year`, `month`, `week`, `day`, `'date'`, `'time'`, and `hour`..`nanosecond`.
   - Verify `.sort(Tempo.compare)` and omitted `tempo2` (`now`) remain intact.
   - Verify raw string / `Temporal` / `Tempo` inputs, TZ inheritance on raw inputs, and invalid unit handling (`TypeError` or `logWarn`).

---

### Phase 1: `FiscalTerm` Enhancements (`packages/plugins/.terms/src/term.fiscal.ts`) — ✅ Complete

1. **Extend `FiscalTermOptions`**:
   ```typescript
   export interface FiscalTermOptions {
     /** Starting month of the fiscal year (1 to 12) */
     startMonth?: number;
     /** Starting day of the fiscal year month (1 to 28 recommended) */
     startDay?: number;
     /** ISO 3166-1 alpha-2 country code (e.g. 'AU', 'GB', 'US', 'JP') */
     country?: string;
   }
   ```

2. **Mitigate `startDay` Edge Cases & Hazards**:
   - **Constraint Bounds**: Validate `startDay` within `1..28` via `isInteger(rawStartDay) && rawStartDay >= 1 && rawStartDay <= 28` and emit `logWarn` (matching `resolveFiscalStartMonth` in `packages/plugins/.terms/src/term.fiscal.ts`) before defaulting/clamping out-of-range values, preventing Temporal month-end clamping divergences (`Temporal.ZonedDateTime.from` clamps Feb 30/31 to 28/29, which causes exact template `r.day === targetStart.dd` checks in `resolveTermShift` to fail).
   - **Resolution Template**:
     ```typescript
     const startMonth = resolveFiscalStartMonth(t, options);
     // Validated in resolveFiscalStartDay(t, options) -> 1..28 (logWarn on invalid values)
     const startDay = resolveFiscalStartDay(t, options);
     const rawRanges = [
       { key: 'FQ1', day: startDay, month: ((startMonth - 1 + 0) % 12) + 1, year: Math.floor((startMonth - 1 + 0) / 12), label: 'First Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
       { key: 'FQ2', day: startDay, month: ((startMonth - 1 + 3) % 12) + 1, year: Math.floor((startMonth - 1 + 3) / 12), label: 'Second Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
       { key: 'FQ3', day: startDay, month: ((startMonth - 1 + 6) % 12) + 1, year: Math.floor((startMonth - 1 + 6) / 12), label: 'Third Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
       { key: 'FQ4', day: startDay, month: ((startMonth - 1 + 9) % 12) + 1, year: Math.floor((startMonth - 1 + 9) / 12), label: 'Fourth Fiscal Quarter', _startMonth: startMonth, _startDay: startDay },
     ];
     ```
   - **`year` Boundary Calculation (renamed from `fiscalYear`)**:
     Rename unreleased v5 `fiscalYear` → `year` so accessors read `t.term.fiscal.year` and `{#fiscal.year}`, and ensure `year` properly reflects non-January starting boundaries:
     ```typescript
     const startMonth = res[0]?._startMonth ?? 1;
     const startDay = res[0]?._startDay ?? 1;
     const start = scope.span.start;
     const isPastStart = (start.mm > startMonth) || (start.mm === startMonth && start.dd >= startDay);
     const year = (startMonth > 1 || startDay > 1) && isPastStart ? start.yy + 1 : start.yy;
     ```

3. **Type Declarations & Pre-Release Reference Updates**:
   Update `TempoTermRegistry['fiscal']` in `packages/plugins/.terms/src/term.fiscal.ts`:
   ```typescript
   declare module '@magmacomputing/tempo' {
     interface TempoTermRegistry {
       fqtr: FiscalKey | undefined;
       fiscal: {
         key: FiscalKey;
         label: 'First Fiscal Quarter' | 'Second Fiscal Quarter' | 'Third Fiscal Quarter' | 'Fourth Fiscal Quarter';
         year: number;
         keys: readonly FiscalKey[];
         span: TermSpan;
       } | undefined;
     }
   }
   ```
   Also update existing unreleased v5 `fiscalYear` references to `year`:
   - `packages/plugins/.terms/test/term.fiscal.test.ts`
   - `packages/tempo/test/plugins/fiscal-cycle.core.test.ts`
   - `packages/tempo/doc/3-extending-tempo/tempo.term.md`

4. **Unit Tests (`packages/plugins/.terms/test/term.fiscal.test.ts`)**:
   - Verify `t.term.fiscal.year` and `{#fiscal.year}` formatting across AU (`startMonth: 7`), US (`1`), and UK personal (`startMonth: 4`, `startDay: 6`).
   - Verify UK personal tax year (`country: 'GB'`, `startDay: 6`) correctly resolves `2025-04-06` as `FQ1` of FY 2026 (`year: 2026`) and `t.equals(t.term.fiscal.span.start, 'day')` returns `true`.
   - Verify standard UK corporate tax year retains default `day: 1` (`2025-04-01`).
   - Verify `startDay` validation bounds (`logWarn` for invalid/out-of-range values) and conflict warnings.

---

### Phase 2: Monorepo Package Deletion & Catalog Pruning ✅ (Completed)

1. **Delete Package Directory**:
   - Remove `packages/plugins/finance/` (11 tracked files).
2. **Prune Stale Catalog Metadata**:
   - **Important Gotcha**: `packages/tempo-cli/commands/catalog-sync.js` merges existing `catalog.json` entries and does **not** auto-delete missing directories.
   - **Action**: Manually remove `"id": "finance"` from `packages/plugins/.setup/catalog.json`.
   - Run `npm run catalog:sync` (or `node packages/tempo/bin/build-catalog.mjs`) to synchronize:
     - `packages/tempo/.vitepress/theme/data/catalog.json`
     - `packages/tempo/public/repl/plugins.manifest.js`
3. **Synchronize Lockfile**:
   - Run `npm run lock:sync` from the monorepo root to clean orphan workspace package references.

---

### Phase 3: REPL, Showcase & Site Integration ✅ (Completed)

1. **Snippets Manifest (`snippets.manifest.js`)**:
   - Remove `finance` preset block from:
     - `packages/tempo/.vitepress/theme/data/snippets.manifest.js`
     - `packages/tempo/public/repl/snippets.manifest.js`
   - Add new `Fiscal Quarters & Tax Years (Terms)` snippet preset:
     ```javascript
     fiscal: {
       label: 'Preset: Fiscal Quarters & Tax Years (Terms)',
       code: `// 💼 Fiscal Quarters and Tax Years (@magmacomputing/tempo/terms)
     import { FiscalTerm } from '@magmacomputing/tempo/terms';
     Tempo.use(FiscalTerm);

     const t = new Tempo('2025-08-15', { pluginOptions: { fiscal: { country: 'AU' } } });
     const fiscal = t.term.fiscal;
     console.log('Fiscal Quarter:', t.term.fqtr); // 'FQ1'
     console.log('Fiscal Year:', fiscal?.year); // 2026
     console.log('Quarter Start:', fiscal?.span.start.format('{yyyy}-{mm}-{dd}')); // '2025-07-01'
     console.log('Is Fiscal Year Start?', fiscal ? t.equals(fiscal.span.start, 'day') && fiscal.key === 'FQ1' : false); // false

     return \`Fiscal \${t.term.fqtr} (FY\${fiscal?.year})\`;`,
     },
     ```
2. **REPL Importmaps**:
   - Remove `@magmacomputing/tempo-plugin-finance` importmap entries from:
     - `packages/tempo/public/repl/index.html` (line ~706)
     - `packages/tempo/public/repl/showcase.html` (line ~718)
3. **Plugin Directory UI (`CatalogList.vue`)**:
   - In `packages/tempo/.vitepress/theme/components/CatalogList.vue`:
     - Update category `id: 'business'` (`pluginIds: ['finance', 'snap']`) to remove `'finance'`.
4. **Plugin Harvesting**:
   - In `packages/tempo/bin/harvest-plugins.mjs`:
     - Remove `'finance.index': 'Finance (Fiscal & Business)'` entry.
   - Delete `packages/tempo/doc/9-plugins/finance.index.md`.
   - Re-run `npm run docs:harvest` to regenerate `plugins-sidebar.json` and `packages/tempo/public/llms-full.txt`.

---

### Phase 4: CI & Release Workflows ✅ (Completed)

1. **Continuous Integration (`.github/workflows/ci.yml`)**:
   - Remove `--workspace=@magmacomputing/tempo-plugin-finance` from the test matrix step (line ~88).
2. **Publish Workflow (`.github/workflows/publish.yml`)**:
   - Remove `plugin_finance` input trigger (lines ~34-35).
   - Remove `"@magmacomputing/tempo-plugin-finance"` from the publish package list (lines ~139, 157).

---

### Phase 5: Documentation Alignment ✅ (Completed)

Refactor documentation pages currently showcasing `@magmacomputing/tempo-plugin-finance` to use self-contained pedagogical namespaces:

1. **`packages/tempo/doc/3-extending-tempo/tempo.namespace.md`**:
   - Replace the `FinanceNamespace` tutorial example with a domain-agnostic or audit/sprint example (e.g. `audit` namespace providing `retentionPeriod`, `isCompliant()`).
2. **`packages/tempo/doc/3-extending-tempo/tempo.plugin.md`**:
   - Update the namespace naming convention reference (`[Name]Namespace`).
3. **`packages/tempo/doc/3-extending-tempo/tempo.extension.md`**:
   - Update callout example to refer to custom domain namespaces.
4. **`packages/tempo/doc/2-core-concepts/tempo.format.md`**:
   - Update format token dot-notation example from `{finance.fiscalQuarter}` to `{#fiscal.year}` or a generic namespace.
5. **`packages/tempo/doc/2-core-concepts/tempo.getters.md`**:
   - Update namespace sub-property example.
6. **`packages/tempo/doc/4-advanced-reference/sandbox-factory.md`**:
   - Update `Tempo.derive` sample plugin from `FinancePlugin` to another plugin (e.g., `SnapPlugin` or `CelestialPlugin`).
7. **Migration Guide (`packages/tempo/doc/8-project-and-support/migration-guide.md`)**:
   - Document the migration path from `@magmacomputing/tempo-plugin-finance` to `FiscalTerm`, including API/signature changes (`t.finance.fiscalQuarter` `1..4` → `t.term.fiscal.key` `'FQ1'..'FQ4'`, `t.finance.taxYear` → `t.term.fiscal.year`, and `t.finance.isFiscalYearStart()` → `f?.key === 'FQ1' && t.equals(f.span.start, 'day')`).
   - Document `Tempo.compare(t1, t2, unit?)`, `Tempo.equals`, and `t.equals` in core docs (`tempo.getters.md` / reference docs).
   - Update any existing `fiscalYear` examples in `migration-guide.md` and `tempo.term.md` to `year`.

*(Note: Historical changelog files in `doc/8-project-and-support/releases/v3.x.md` and `v4.x.md` will be preserved as immutable historical records.)*

---

## 4. Verification & Readiness Checklist

- [x] `packages/tempo/test/core/static.methods.test.ts` (and instance equality tests) pass for `Tempo.compare(..., unit?)`, `Tempo.equals`, and `t.equals`.
- [x] `packages/plugins/.terms/test/term.fiscal.test.ts` passes with `year`, `startDay`, and `t.equals(f.span.start, 'day')` boundary tests.
- [x] `npm run catalog:sync` runs cleanly with no orphan warnings.
- [x] `node --check` succeeds on all manifest files.
- [x] `npm run docs:build` generates VitePress documentation without broken links or missing sidebar items.
- [ ] `npm deprecate @magmacomputing/tempo-plugin-finance "..."` published on npm registry upon release.
- [ ] `git diff --name-only origin/main...HEAD | wc -l` stays strictly within PR budget for the subsequent PR.
- [ ] All workspaces in `npm test` execute with zero failures across supported timezones (`America/New_York`, `UTC`).
