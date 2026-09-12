# Architectural Plan: Intl.LocaleInfo Integration & Regional Context (Approach B)

## Executive Summary

This plan details the architectural integration of the standard ECMAScript **`Intl.LocaleInfo`** specification (Stage 4) into core **Tempo**. 

In keeping with Tempo's mission to **"Humanize Temporal"**, this feature bridges the mathematical rigor of the ISO 8601 Temporal engine with the practical, cultural expectations of human calendars across different regions (e.g., Sunday-starting weeks in North America and Japan, Friday–Saturday weekends in the Middle East, and regional text directionality).

Following architectural evaluation, **Approach B (`localeInfo: boolean`)** was selected over fragmented piecemeal settings (such as `weekStartsOn`). A unified opt-in switch preserves Tempo's strict ISO 8601 baseline by default for machine/backend stability, while allowing applications to activate complete, culturally authentic calendar semantics with a single flag.

---

## Release & Effort Assessment

- **Estimated Effort**: **Medium (~6–10 hours / 1–1.5 engineering days)**
  - **Scope**: Modifies `tempo.type.ts` (options & `TempoIntlContext`), `tempo.class.ts` (`t.intl` and `t.isWeekend` memoized getters), `module.mutate.ts` (adaptive week boundaries & explicit `start:isoWeek` cases), `module.format.ts` (`{dow:locale}` and `{intl.*}` tokens), and adds multi-locale Vitest test suites.
  - **Complexity**: Moderate; requires careful modulo arithmetic across regional week start offsets (Mon=1, Sun=7, Sat=6), graceful fallback handling for environments where `getWeekInfo()` is undefined, and deterministic verification that ISO invariants remain unchanged when `localeInfo` is inactive.
- **SemVer Classification**: **Minor (`v4.3.0` or `v4.4.0`)**
  - **Rationale**: Introduces new public API properties (`t.intl`, `t.isWeekend`, `options.localeInfo`), new mutation targets (`start: 'isoWeek'`), and format tokens (`{dow:locale}`, `{intl.*}`). Because `localeInfo` defaults to `false` and all baseline ISO 8601 calculations remain mathematically invariant, it is strictly additive with zero breaking changes for existing consumers.

---

## 1. Guiding Principles & Architecture

### A. The "Immutable Floor vs. Human Ceiling" Contract
- **The Immutable Floor (100% ISO 8601)**:
  - `t.iso`, `t.epoch`, `t.nano` remain mathematically invariant.
  - `t.dow` **always** returns the ISO 8601 weekday number (`1 = Monday ... 7 = Sunday`).
  - `t.wy` and `t.yw` **always** return standard ISO week numbers.
  - Dedicated ISO boundaries (`t.set({ start: 'isoWeek' })`) remain as guaranteed escape hatches.
- **The Human Ceiling (Cultural Context via `localeInfo`)**:
  - `t.set({ start: 'week' })` and `t.startOf('week')` adapt to the active locale's first day of the week.
  - `t.isWeekend` dynamically evaluates against the region's weekend days (`[6, 7]` in the West, `[5, 6]` in Saudi Arabia/Israel, `[5]` in Iran).
  - High-performance, zero-bundle-cost: Delegates 100% to host ICU data already compiled into the JavaScript engine (V8, JavaScriptCore, Node.js).

### B. Why Approach B (`localeInfo: boolean`)
Instead of fragmenting configuration across multiple piecemeal options (`weekStartsOn`, `weekendDays`, `firstDayOfWeek`, `hourCycleFormat`), Approach B provides a single, unambiguous opt-in:
```typescript
Tempo.init({
  locale: 'en-US',
  localeInfo: true // Unlocks full regional calendar boundaries
});
```
- **Avoids Option Bloat**: Developers do not need to configure individual calendar settings that `Intl` already knows how to resolve.
- **Prevents Tautology**: Eliminates redundant configurations like `localeInfo: 'en-US'` or `localeInfo: 'locale'`.
- **Future-Proof**: Naturally absorbs future `Intl.Locale` expansions (numbering systems, text directions, collation) under a single contract.

---

## 2. Runtime Capability & Safe Fallback

`Intl.LocaleInfo` is officially **Stage 4** in TC39 and has widespread production availability:
- **Chrome / Chromium / Edge**: Shipped enabled by default in Chrome 99+ (2022).
- **Node.js**: Shipped in Node 18.0.0+ (Active across Node 18, 20, 22, 24+).
- **Safari / WebKit**: Shipped in Safari 17.0+ (iOS 17+, macOS Sonoma+).
- **Deno / Bun**: Fully supported out-of-the-box.

### Graceful Degradation Strategy
If running in an older environment or where experimental methods are undefined, Tempo gracefully defaults to standard ISO 8601 values without throwing errors:
```typescript
function resolveLocaleInfo(localeTagOrInstance: string | Intl.Locale): {
  locale?: Intl.Locale;
  tag: string;
  weekInfo: WeekInfo;
  hourCycle: string;
  hourCycles: readonly string[];
  direction: 'ltr' | 'rtl';
  numberingSystem: string;
  numberingSystems: readonly string[];
} {
  const hasLocaleCtor = typeof Intl !== 'undefined' && typeof Intl.Locale === 'function';
  const locale = hasLocaleCtor
    ? (localeTagOrInstance instanceof Intl.Locale ? localeTagOrInstance : new Intl.Locale(String(localeTagOrInstance)))
    : undefined;
  const tag = locale?.baseName ?? String(localeTagOrInstance);

  // 1. Resolve WeekInfo (guards getWeekInfo() and legacy .weekInfo)
  let firstDay: Weekday = 1;
  let weekend: readonly Weekday[] = [6, 7];
  
  if (locale && typeof (locale as any).getWeekInfo === 'function') {
    const raw = (locale as any).getWeekInfo();
    if (raw?.firstDay != null) firstDay = raw.firstDay;
    if (Array.isArray(raw?.weekend)) weekend = raw.weekend;
  } else if (locale && (locale as any).weekInfo) {
    const raw = (locale as any).weekInfo;
    if (raw?.firstDay != null) firstDay = raw.firstDay;
    if (Array.isArray(raw?.weekend)) weekend = raw.weekend;
  }

  // 2. Resolve preferred hour cycles (scalar from getHourCycles() array or fallback)
  let hourCycles: readonly string[] = ['h23'];
  if (locale && typeof (locale as any).getHourCycles === 'function') {
    const cycles = (locale as any).getHourCycles();
    if (Array.isArray(cycles) && cycles.length > 0) hourCycles = cycles;
  } else if (locale && (locale as any).hourCycle) {
    hourCycles = [(locale as any).hourCycle];
  }

  // 3. Resolve text direction
  let direction: 'ltr' | 'rtl' = 'ltr';
  if (locale && typeof (locale as any).getTextInfo === 'function') {
    const textInfo = (locale as any).getTextInfo();
    if (textInfo?.direction === 'rtl' || textInfo?.direction === 'ltr') direction = textInfo.direction;
  }

  // 4. Resolve numbering systems (scalar from getNumberingSystems() array or fallback)
  let numberingSystems: readonly string[] = ['latn'];
  if (locale && typeof (locale as any).getNumberingSystems === 'function') {
    const systems = (locale as any).getNumberingSystems();
    if (Array.isArray(systems) && systems.length > 0) numberingSystems = systems;
  } else if (locale && (locale as any).numberingSystem) {
    numberingSystems = [(locale as any).numberingSystem];
  }

  return {
    locale,
    tag,
    weekInfo: { firstDay, weekend, minimalDays: 4 },
    hourCycle: hourCycles[0],
    hourCycles,
    direction,
    numberingSystem: numberingSystems[0],
    numberingSystems,
  };
}
```

---

## 3. The `t.intl` Resolved Namespace Surface

Mirroring [`t.geo`](../src/tempo.class.ts) (which manages physical/geographic context), **`t.intl`** provides a permanent, memoized home for cultural and regional context on every `Tempo` instance.

> [!NOTE]
> `t.intl` is **always populated and inspectable** on every `Tempo` instance, regardless of whether `localeInfo` is `true` or `false`. The `localeInfo: boolean` flag only governs whether **mutations and calendar boundaries** dynamically adapt to it.
> In environments where the native `Intl.Locale` constructor is unavailable, `t.intl` gracefully falls back to standard ISO 8601 defaults (Monday first day, [6, 7] weekend, 'h23', 'ltr', 'latn') while guarding `Intl.Locale` construction, ensuring `t.intl` and internal month/day ordering heuristics remain stable and reliable.

```typescript
export interface WeekInfo {
  /** First day of the week: 1 (Mon) ... 7 (Sun) */
  readonly firstDay: Weekday;
  /** Regional weekend days (e.g. [6, 7] or [5, 6]) */
  readonly weekend: readonly Weekday[];
  /** Minimum days required in week 1 of the year */
  readonly minimalDays: number;
}

export interface TempoIntlContext {
  /** The underlying native Intl.Locale instance, if available */
  readonly locale?: Intl.Locale;
  /** Active BCP 47 language tag */
  readonly tag: string;
  /** Regional week configuration */
  readonly weekInfo: WeekInfo;
  /** Shortcut to weekInfo.firstDay (e.g. 7 for Sunday in en-US) */
  readonly firstDay: Weekday;
  /** Shortcut to weekInfo.weekend */
  readonly weekend: readonly Weekday[];
  /** Primary hour cycle resolved from getHourCycles()[0] ('h12' | 'h23' | 'h11' | 'h24') */
  readonly hourCycle: string;
  /** Complete list of supported hour cycles in preference order */
  readonly hourCycles: readonly string[];
  /** Writing direction ('ltr' | 'rtl') */
  readonly direction: 'ltr' | 'rtl';
  /** Primary numbering system resolved from getNumberingSystems()[0] (e.g. 'latn', 'arab') */
  readonly numberingSystem: string;
  /** Complete list of supported numbering systems in preference order */
  readonly numberingSystems: readonly string[];
}
```

---

## 4. Behavioral Matrix: `localeInfo: false` vs. `localeInfo: true`

| Operation / Property | `localeInfo: false` (Default Baseline) | `localeInfo: true` (Opt-in Human Context) |
| :--- | :--- | :--- |
| **`t.dow`** | `1..7` (Mon=1, Sun=7) strictly ISO. | `1..7` (Mon=1, Sun=7) strictly ISO. *(Invariant)* |
| **`t.iso` / `t.wy`** | Strictly ISO 8601 string / ISO week number. | Strictly ISO 8601 string / ISO week number. *(Invariant)* |
| **`t.intl`** | Fully inspectable (`firstDay: 7` for `en-US`). | Fully inspectable (`firstDay: 7` for `en-US`). |
| **`t.set({ start: 'week' })`** | Snaps to preceding **Monday** (`dow = 1`). | Snaps to preceding **locale first day** (e.g. Sunday in `en-US`, Saturday in `ar-SA`). |
| **`t.set({ end: 'week' })`** | Snaps to **Sunday** 23:59:59.999999999. | Snaps to day preceding next week (e.g. Saturday night in `en-US`). |
| **`t.set({ start: 'isoWeek' })`** | Snaps to preceding Monday. | Snaps to preceding Monday. *(Explicit escape hatch)* |
| **`t.isWeekend`** | `dow === 6 \|\| dow === 7` (Sat/Sun). | Evaluates against `t.intl.weekend` (Fri/Sat in `ar-SA`). |
| **`t.format('{dow:locale}')`** | Returns standard ISO index (`1..7`). | Returns 1-based index relative to `firstDay` (Sun = 1 in `en-US`). |
| **`t.format('{intl.firstDay}')`**| Formats resolved first day number. | Formats resolved first day number. |
| **`t.format('{intl.direction}')`**| Formats `'ltr'` or `'rtl'`. | Formats `'ltr'` or `'rtl'`. |

---

## 5. Technical Implementation Roadmap

### Phase 1: Type Definitions (`packages/tempo/src/tempo.type.ts`)
1. Extend `Internal.BaseOptions` and `Options` with `localeInfo?: boolean | undefined;`.
2. Add `WeekInfo` and `TempoIntlContext` interfaces.
3. Add `start: 'isoWeek'`, `mid: 'isoWeek'`, `end: 'isoWeek'` to mutation types.

### Phase 2: Core Class & Memoization (`packages/tempo/src/tempo.class.ts`)
1. Add private `#memo: { ..., intl?: TempoIntlContext }`.
2. Implement instance getter `get intl(): TempoIntlContext`:
   - Extracts active locale tag from `this.locale`.
   - Constructs/caches `new Intl.Locale(tag)`.
   - Extracts `getWeekInfo()`, `getHourCycles()`, `getTextInfo()`, `getNumberingSystems()`.
   - Freezes and returns `TempoIntlContext`.
3. Add `get isWeekend(): boolean`:
   - If `this.#local.config.localeInfo`, checks `this.intl.weekend.includes(this.dow)`.
   - Else, checks `this.dow === 6 || this.dow === 7`.

### Phase 3: Dynamic Mutation Engine (`packages/tempo/src/module/module.mutate.ts`)
1. Refactor `start:week`, `mid:week`, and `end:week` to respect `this.config.localeInfo`:
   ```typescript
   case 'start:isoweek':
     return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();

   case 'start:week': {
     if (!state.config.localeInfo) {
       return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();
     }
     const firstDay = this.intl.firstDay; // 1..7
     const diff = (currZdt.dayOfWeek - firstDay + 7) % 7;
     return currZdt.subtract({ days: diff }).startOfDay();
   }
   ```
2. Mirror boundary calculation for `end:week` and `mid:week`.

### Phase 4: Formatting Token Integration (`packages/tempo/src/module/module.format.ts`)
1. Support `{dow:locale}`: When `localeInfo` is enabled, calculates `((zdt.dayOfWeek - this.intl.firstDay + 7) % 7) + 1` relative to the locale's week start; when `localeInfo` is false, falls back to standard Monday-first ISO numbering (`zdt.dayOfWeek`).
2. Enable `{intl.<property>}` namespace token evaluation (e.g. `{intl.firstDay}`, `{intl.hourCycle}`, `{intl.direction}`) identical to `{geo.<property>}`.

---

## 6. Verification & Test Plan

### Automated Vitest Suite (`packages/tempo/test/core/intl.locale-info.test.ts`)
1. **Locale Week Boundaries**:
   - `en-US` (`firstDay: 7`): Verify `t.set({ start: 'week' })` on Wednesday snaps to previous Sunday.
   - `en-GB` (`firstDay: 1`): Verify `t.set({ start: 'week' })` on Wednesday snaps to previous Monday.
   - `ar-SA` (`firstDay: 7`, `weekend: [5, 6]`): Verify `isWeekend` evaluates `true` for Friday and Saturday, `false` for Sunday.
2. **Deterministic ISO Invariance**:
   - Verify `t.dow`, `t.wy`, and `t.iso` produce identical values before and after `localeInfo: true`.
   - Verify `t.set({ start: 'isoWeek' })` always snaps to Monday regardless of locale.
3. **Graceful Fallback & Legacy Environments**:
   - Mock both `Intl.Locale.prototype.getWeekInfo = undefined` and legacy `weekInfo = undefined` to assert clean, error-free fallback to ISO 8601 defaults (`firstDay: 1`, `weekend: [6, 7]`).
   - Mock `getWeekInfo = undefined` with legacy `.weekInfo` property present to verify proper resolution on intermediate Node/browser runtimes.
4. **Token Formatting**:
   - Verify `{intl.direction}` returns `'rtl'` for Arabic/Hebrew and `'ltr'` for English/French.
