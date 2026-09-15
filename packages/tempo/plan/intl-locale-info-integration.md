# Architectural Plan: Intl.LocaleInfo Integration & Regional Context (Approach B)

## Executive Summary

This plan details the architectural integration of standard ECMAScript **`Intl.LocaleInfo`** capabilities into core **Tempo**. 

In keeping with Tempo's mission to **"Humanize Temporal"**, this feature bridges the mathematical rigor of the ISO 8601 Temporal engine with the practical, cultural expectations of human calendars across different regions (e.g., Sunday-starting weeks in North America and Japan, Friday–Saturday weekends in the Middle East, and regional text directionality).

Following architectural evaluation, **Approach B (`localeInfo: boolean`)** was selected over fragmented piecemeal settings (such as `weekStartsOn`). A unified opt-in switch preserves Tempo's strict ISO 8601 baseline by default for machine/backend stability, while allowing applications to activate complete, culturally authentic calendar semantics with a single flag stashed on the configuration object.

Localization resolution is fully anchored to [`getLI`](file:///home/michael/Project/magma/packages/library/src/common/runtime/international.library.ts#L186) in `@magma/library`, which serves as the single source-of-truth for `LocaleInfo`.

---

## Release & Effort Assessment

- **Estimated Effort**: **Medium (~4–6 hours)**
  - **Scope**: Modifies `tempo.type.ts` (options & re-exporting `ResolvedLocaleInfo`), `tempo.class.ts` (`t.intl` getter delegating to `getLI`), `module.mutate.ts` (adaptive week boundaries & explicit ISO boundaries like `isoWeek: 'start'`, `wy: 'start'`), `module.format.ts` (`{dow:locale}` and `{intl.*}` tokens), and adds multi-locale Vitest test suites.
  - **Complexity**: Low-to-moderate; leverage existing memoized `getLI` from `@magma/library` to avoid duplicating fallback tables or locale heuristics. Modulo arithmetic handles regional week start offsets (Mon=1, Sun=7, Sat=6).
- **SemVer Classification**: **Minor (`v4.3.0` or `v4.4.0`)**
  - **Rationale**: Introduces new public API properties (`t.intl`, `options.localeInfo`), new mutation targets (`isoWeek: 'start'`, `wy: 'start'`), and format tokens (`{dow:locale}`, `{intl.*}`). Because `localeInfo` defaults to `false` and all baseline ISO 8601 calculations remain mathematically invariant, it is strictly additive with zero breaking changes for existing consumers.

---

## 1. Guiding Principles & Architecture

### A. The "Immutable Floor vs. Human Ceiling" Contract
- **The Immutable Floor (100% ISO 8601)**:
  - `t.iso`, `t.epoch`, `t.nano` remain mathematically invariant.
  - `t.dow` **always** returns the ISO 8601 weekday number (`1 = Monday ... 7 = Sunday`).
  - `t.wy` and `t.yw` **always** return standard ISO week numbers.
  - Dedicated ISO boundary mutations (`t.set({ isoWeek: 'start' })`, `t.set({ wy: 'start' })`) remain as guaranteed escape hatches.
- **The Human Ceiling (Cultural Context via `localeInfo: true`)**:
  - `t.set({ week: 'start' })`, `t.set({ week: 'mid' })`, and `t.set({ week: 'end' })` adapt to the active locale's first day of the week.
  - Regional weekend days (`[6, 7]` in the West, `[5, 6]` in Saudi Arabia/Israel, `[5]` in Iran) are exposed via `t.intl.weekend`.
  - High-performance, zero-bundle-cost: Delegates 100% to host ICU data already compiled into the JavaScript engine (V8, JavaScriptCore, Node.js) through `@magma/library`'s memoized `getLI`.

### B. Why Approach B (`localeInfo: boolean`)
Instead of fragmenting configuration across multiple piecemeal options (`weekStartsOn`, `weekendDays`, `firstDayOfWeek`, `hourCycleFormat`), Approach B provides a single, unambiguous opt-in:
```typescript
Tempo.init({
  locale: 'en-US',
  localeInfo: true // Unlocks full regional calendar boundaries
});
```
- **Avoids Option Bloat**: Developers do not configure individual calendar settings that `Intl` already knows how to resolve.
- **Prevents Tautology**: Eliminates redundant configurations like `localeInfo: 'en-US'` or `localeInfo: 'locale'`.
- **Future-Proof**: Naturally absorbs future `Intl.Locale` expansions (numbering systems, text directions, collation) under a single contract.

### C. Weekend Semantics: Core vs. Plugin
The core `Tempo` class deliberately does **not** introduce a `t.isWeekend` boolean getter.
- **Rationale**: Weekend definitions vary culturally and legally across regions and domains. Keeping core Tempo lean and free of domain-specific business rules avoids bloat.
- **Raw Data in Core**: `t.intl.weekend` exposes the immutable `readonly number[]` of weekend days (e.g. `[6, 7]` or `[5, 6]`).
- **Semantic Evaluation in Plugins/Terms**: Dynamic weekend checks (e.g. `t.is('weekend')` or `#weekend`) belong cleanly in a Term or a dedicated Locale Plugin (`tempo/plugin/locale`).

---

## 2. Runtime Capability & Source of Truth (`getLI`)

Tempo does not duplicate `Intl.LocaleInfo` resolution or fallback tables. Instead, **`getLI` from `@magma/library` serves as the sole source of truth**:

```typescript
import { getLI, type ResolvedLocaleInfo, type LocaleWeekInfo } from '#library/international.library.js';
```

[`getLI`](file:///home/michael/Project/magma/packages/library/src/common/runtime/international.library.ts#L186) provides:
1. **ECMA-402 Intl.LocaleInfo Support**: Leverages native `loc.getWeekInfo()`, `loc.getHourCycles()`, `loc.getTextInfo()`, `loc.getNumberingSystems()`, and `loc.getTimeZones()`.
2. **Graceful Heuristic Fallback**: Includes pre-compiled static sets (`SUNDAY_START_REGIONS`, `SATURDAY_START_REGIONS`, `FRI_SAT_WEEKEND_REGIONS`, `RTL_LANGUAGES`) for stripped or legacy environments where `getWeekInfo()` is undefined.
3. **Deep Immutability**: The resolved data structure is `Object.freeze`-d.
4. **Global Memoization**: Handled via `memoizeFunction`, ensuring $O(1)$ lookups.

---

## 3. The `t.intl` Resolved Namespace Surface

Mirroring [`t.geo`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1660) (which manages physical/geographic context) and [`t.sphere`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1667), **`t.intl`** provides a permanent home for cultural and regional context.

### A. Zero Per-Instance Allocation
`t.intl` does **not** create or wrap a new object on each Tempo instance. It simply delegates to the globally memoized, frozen `ResolvedLocaleInfo` returned by `getLI`:

```typescript
// In tempo.class.ts:
get intl(): ResolvedLocaleInfo {
  return getLI(this.locale);
}
```

Every `Tempo` instance configured with the same locale (e.g., `'en-US'`) references the **exact same frozen singleton in memory**.

### B. Symmetry Between `t.locale` and `t.intl`
Following the architectural precedent of `t.sphere` and `t.geo.sphere`:
- **`t.locale`**: Top-level string BCP 47 identifier on the instance (e.g. `'en-US'`).
- **`t.intl.baseName`**: Canonical BCP 47 base name.
- **`t.intl.locale`**: Underlying native `Intl.Locale` instance (if available).
- **`t.intl.firstDay`**: 1-based first day of the week (`1 = Mon ... 7 = Sun`).
- **`t.intl.weekend`**: `readonly number[]` of regional weekend days (`[6, 7]`, `[5, 6]`, etc.).
- **`t.intl.hourCycle` / `t.intl.hourCycles`**: Primary and fallback hour cycles (`'h12'`, `'h23'`).
- **`t.intl.direction`**: Writing direction (`'ltr'` | `'rtl'`).
- **`t.intl.numberingSystem`**: Regional numbering system (`'latn'`, `'arab'`).

---

## 4. Mutation Grammar & Dedicated ISO Boundaries

Tempo's Slick mutation grammar operates on `unit: action` pairs:
`t.set({ week: 'start' })`, `t.set({ week: 'mid' })`, `t.set({ week: 'end' })`.

### Dedicated ISO Boundaries
When `localeInfo: true` is enabled, `week` adapts to regional week start. To ensure developers always have an unambiguous escape hatch for strict ISO 8601 Monday-to-Sunday boundaries, Tempo recognizes dedicated ISO week tokens:

1. **`isoWeek`**: `t.set({ isoWeek: 'start' })`, `t.set({ isoWeek: 'mid' })`, `t.set({ isoWeek: 'end' })`
2. **`wy`**: `t.set({ wy: 'start' })`, `t.set({ wy: 'mid' })`, `t.set({ wy: 'end' })` (Tempo's standard token for ISO week-of-year)

These **always** evaluate according to ISO 8601 invariants (Monday start, Sunday end, Thursday middle), regardless of `localeInfo` or active locale.

---

## 5. Behavioral Matrix: `localeInfo: false` vs. `localeInfo: true`

| Operation / Property | `localeInfo: false` (Default Baseline) | `localeInfo: true` (Opt-in Human Context) |
| :--- | :--- | :--- |
| **`t.dow`** | `1..7` (Mon=1, Sun=7) strictly ISO. | `1..7` (Mon=1, Sun=7) strictly ISO. *(Invariant)* |
| **`t.wy` / `t.iso`** | Strictly ISO week number / ISO 8601 string. | Strictly ISO week number / ISO 8601 string. *(Invariant)* |
| **`t.intl`** | Fully inspectable (`firstDay: 7` for `en-US`). | Fully inspectable (`firstDay: 7` for `en-US`). |
| **`t.set({ week: 'start' })`** | Snaps to preceding **Monday** (`dow = 1`). | Snaps to preceding **locale first day** (e.g. Sunday in `en-US`, Saturday in `ar-SA`). |
| **`t.set({ week: 'end' })`** | Snaps to **Sunday** 23:59:59.999999999. | Snaps to day preceding next week (e.g. Saturday night in `en-US`). |
| **`t.set({ week: 'mid' })`** | Snaps to **Thursday** 00:00:00. | Snaps to middle day of the regional week (`firstDay + 3`). |
| **`t.set({ isoWeek: 'start' })`** | Snaps to preceding Monday. | Snaps to preceding Monday. *(Explicit ISO escape hatch)* |
| **`t.set({ wy: 'start' })`** | Snaps to preceding Monday. | Snaps to preceding Monday. *(Explicit ISO escape hatch)* |
| **`t.intl.weekend`** | `readonly number[]` (e.g. `[6, 7]` or `[5, 6]`). | `readonly number[]` (e.g. `[6, 7]` or `[5, 6]`). |
| **`t.format('{dow:locale}')`** | Returns standard ISO index (`1..7`). | Returns 1-based index relative to `firstDay` (Sun = 1 in `en-US`). |
| **`t.format('{intl.firstDay}')`** | Formats resolved first day number. | Formats resolved first day number. |
| **`t.format('{intl.direction}')`** | Formats `'ltr'` or `'rtl'`. | Formats `'ltr'` or `'rtl'`. |

---

## 6. Technical Implementation Roadmap

### Phase 1: Type Definitions (`packages/tempo/src/tempo.type.ts`)
1. Extend `Internal.BaseOptions` and `Options` with `localeInfo?: boolean | undefined;`.
2. Re-export `ResolvedLocaleInfo` and `LocaleWeekInfo` from `#library/international.library.js`.
3. Add `isoWeek` and `isoweek` to valid Slick mutation keys (`ELEMENT` / `MUTATION`).

### Phase 2: Core Class (`packages/tempo/src/tempo.class.ts`)
1. Add instance getter `get intl(): ResolvedLocaleInfo`:
   ```typescript
   get intl(): ResolvedLocaleInfo {
       return getLI(this.locale);
   }
   ```
2. Leverage existing `localeInfo` on `this.#local.config.localeInfo`.

### Phase 3: Dynamic Mutation Engine (`packages/tempo/src/module/module.mutate.ts`)
1. Update week boundary calculations in the `switch (slug)` block:
   ```typescript
   case 'start:isoweek':
   case 'start:wy':
       return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();

   case 'start:week': {
       if (!state.config.localeInfo) {
           return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();
       }
       const firstDay = (this.constructor as any).getLI ? (this.constructor as any).getLI(this.locale).firstDay : this.intl.firstDay;
       const diff = (currZdt.dayOfWeek - firstDay + 7) % 7;
       return currZdt.subtract({ days: diff }).startOfDay();
   }
   ```
2. Mirror boundary calculation for `end:week` and `mid:week`:
   - `end:week`: snaps to `(firstDay + 6) % 7 || 7` at end-of-day.
   - `mid:week`: snaps to `(firstDay + 3) % 7 || 7` at start-of-day.
   - `end:isoweek` / `end:wy`: snaps to Sunday at end-of-day.
   - `mid:isoweek` / `mid:wy`: snaps to Thursday at start-of-day.

### Phase 4: Formatting Token Integration (`packages/tempo/src/module/module.format.ts`)
1. Support `{dow:locale}`:
   - When `localeInfo` is active: calculates `((zdt.dayOfWeek - this.intl.firstDay + 7) % 7) + 1` relative to the locale's week start.
   - When `localeInfo` is false: falls back to standard Monday-first ISO numbering (`zdt.dayOfWeek`).
2. Enable `{intl.<property>}` namespace token evaluation (e.g. `{intl.firstDay}`, `{intl.hourCycle}`, `{intl.direction}`) by delegating directly to `this.intl`.

---

## 7. Verification & Test Plan

### Automated Vitest Suite (`packages/tempo/test/core/intl.locale-info.test.ts`)
1. **Locale Week Boundaries**:
   - `en-US` (`firstDay: 7`): Verify `t.set({ week: 'start' })` on Wednesday snaps to previous Sunday when `localeInfo: true`.
   - `en-GB` (`firstDay: 1`): Verify `t.set({ week: 'start' })` on Wednesday snaps to previous Monday.
   - `ar-SA` (`firstDay: 7` or `6`): Verify boundary snaps according to Saudi calendar settings.
2. **Dedicated ISO Invariance**:
   - Verify `t.dow`, `t.wy`, and `t.iso` produce identical values before and after `localeInfo: true`.
   - Verify `t.set({ isoWeek: 'start' })` and `t.set({ wy: 'start' })` always snap to Monday regardless of locale.
3. **Reference Stability**:
   - Verify `t1.intl === t2.intl` when `t1` and `t2` share the same locale (asserting zero per-instance allocations).
4. **Token Formatting**:
   - Verify `{intl.direction}` returns `'rtl'` for Arabic/Hebrew and `'ltr'` for English/French.
   - Verify `{dow:locale}` returns `1` for Sunday in `en-US` when `localeInfo: true`.
