# tempo-fns Feature Rollout Roadmap & Phased Architecture

This plan documents high-value functional additions, refactorings, and plugin-delegation opportunities for `@magmacomputing/tempo-fns`. 

---

## Architecture & Plugin Relationship

`@magmacomputing/tempo-fns` serves as the foundational **pure functional engine** across the Tempo ecosystem:
* **`tempo-fns`**: Contains pure, tree-shakeable, stateless algorithms operating on `Temporal`, `Tempo`, `Date`, numbers, or string inputs with zero runtime overhead and minimal dependencies.
* **`@magmacomputing/tempo-plugin-*`**: Consume `tempo-fns` modules to provide fluent, instance-bound methods, Term plugins, and Tempo lifecycle integration.

```
┌────────────────────────────────────────────────────────┐
│                   Tempo Plugins                        │
│   (tempo-plugin-holidays, spatial, celestial, etc.)    │
└──────────────────────────┬─────────────────────────────┘
                           │ delegates pure math & algorithms
                           ▼
┌────────────────────────────────────────────────────────┐
│               @magmacomputing/tempo-fns                │
│    (calendar, business, spatial, celestial, timezone)  │
└──────────────────────────┬─────────────────────────────┘
                           │ operates on
                           ▼
┌────────────────────────────────────────────────────────┐
│           Temporal API / ISO 8601 Primitives           │
└────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Calendar Extensions (`@magmacomputing/tempo-fns/calendar`) — [COMPLETED ✅]

Targeted additions providing zero-dependency calendar predicates needed across billing, reporting, and scheduling. Fully implemented, bundled, and covered with 100% test passing rate.

### Implemented Functions & Signatures:
* **`isFirstDayOfMonth(date: DateInput): boolean`** — Solves beginning-of-month accounting and billing cycle boundaries.
* **`isLastDayOfMonth(date: DateInput): boolean`** — Companion to `isFirstDayOfMonth` with leap-year month-end calculation.
* **`isWeekend(date: DateInput, options?: WeekendOptions): boolean`** & **`isWeekday(date: DateInput, options?: WeekendOptions): boolean`** — ISO weekend check (`[6, 7]`) with regional cultural locale resolution via `Intl.LocaleInfo`.
* **`isLeapYear(date: DateInput): boolean`** — Fast Gregorian leap year check without object allocation.
* **`daysInMonth(date: DateInput, month?: number): number`** — Returns exact day count (28, 29, 30, 31) for year/month or extracted from date.

### Phase 1 Architecture Learnings (Applied to All Future Phases):
1. **Centralized Duck-Typing (`DateInput`)**:
   * Functions must never require the nominal `class Tempo` in public type signatures.
   * `DateInput = TemporalLikeDate | Date | string | number`, where `TemporalLikeDate` includes `readonly zdt?: any`. This guarantees full, frictionless compatibility with `Tempo`, native `Temporal`, `Date`, strings, and plain duck-typed records without `#private` nominal type errors.
2. **Unified Extraction Helper (`extractDateParts`)**:
   * Single shared helper in `src/support/temporal.ts` that parses and normalizes inputs into `{ year, month, day, dayOfWeek, daysInMonth, type, target }`.
   * Predicates destructure only the numbers they require, while builder/transformation functions can leverage `type` (`'Tempo'`, `'Temporal'`, `'Date'`, etc.) and `target` for format-preserving round-trips.
3. **Consolidated Module Architecture (Cohesive Grouping)**:
   * Consolidate small, closely-related functions and shared lookups into a single cohesive domain module (e.g. all calendar predicates in `calendar.ts`, business-day math in `businessDays.ts`) rather than proliferating isolated single-function files or forwarding stubs.
   * Internal helpers and lookup tables are co-located with their consumers, eliminating import overhead and circular dependencies while keeping barrel exports clean.

---

## Phase 2: Business Day & Working Day Math (`@magmacomputing/tempo-fns/business`)

Extends `workingHoursUntil` into full working-day calendar operations. Grouped cohesively into `src/business/businessDays.ts` and applying the Phase 1 `DateInput` and `extractDateParts` patterns.

### 1. `isBusinessDay(date, options?)`
* **Signature:**
  ```typescript
  export interface BusinessDayOptions extends WeekendOptions {
    /** Explicit list of ISO date strings (YYYY-MM-DD) or timestamps for recognized public holidays */
    holidays?: readonly (string | number)[];
    /** Custom predicate for dynamic holiday checking */
    isHoliday?: (date: Temporal.PlainDate) => boolean;
  }
  export function isBusinessDay(date: DateInput, options?: BusinessDayOptions): boolean;
  ```
* **Behavior:** Returns `true` if `!isWeekend(date, options)` and the date does not match any holiday in `options.holidays` or `options.isHoliday`.

### 2. `nextBusinessDay(date, options?)` & `prevBusinessDay(date, options?)`
* **Signature:** `nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Temporal.ZonedDateTime`
* **Behavior:** Advances or rewinds day-by-day until `isBusinessDay(current, options)` is satisfied.

### 3. `addBusinessDays(date, amount, options?)`
* **Signature:** `addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Temporal.ZonedDateTime`
* **Behavior:** Adds (positive) or subtracts (negative) $N$ active business days, skipping weekends and recognized holidays. Supports standard financial settlement periods (e.g. T+2 settlement).

### 4. `businessDaysBetween(start, end, options?)`
* **Signature:** `businessDaysBetween(start: DateInput, end: DateInput, options?: BusinessDayOptions): number`
* **Behavior:** Calculates the exact signed integer count of working business days between two dates.

### Plugin Integration Touchpoints:
* **`tempo-plugin-holidays`**: Replaces the internal loop logic in `packages/plugins/holidays/src/engine.ts` with calls to `tempo-fns` business functions, remaining focused purely on holiday dataset resolution and Nager.Date caching.
* **`tempo-plugin-finance`**: Can leverage `isLastDayOfMonth`, `isBusinessDay`, and `addBusinessDays` for settlement schedules and EOM adjustments.
* **`tempo-plugin-ai`**: Grounds natural-language queries (e.g. `"how many working days between X and Y"`) directly with `businessDaysBetween`.

---

## Phase 3: Spatial Navigation & Geodesy (`@magmacomputing/tempo-fns/spatial`)

Complements the Great-Circle spherical navigation suite (`haversineDistance`, `calculateBearing`, `calculateVelocity`, `isWithin`).

### 1. `calculateDestination(startCoord, distance, bearing, unit = 'km')`
* **Signature:**
  ```typescript
  export function calculateDestination(
    start: CoordinateInput,
    distance: number,
    bearing: number,
    unit: DistanceUnit = 'km'
  ): [latitude: number, longitude: number];
  ```
* **Purpose:** The Great-Circle forward projection (dead reckoning). Given a starting position, compass azimuth heading (0°..360°), and distance, calculates the destination coordinates.
* **Formula:** Spherical law of cosines forward geodesic equations with proper latitude/longitude wrap.

### 2. `closestCoordinate(targetCoord, coordsArray, unit = 'km')`
* **Signature:**
  ```typescript
  export function closestCoordinate(
    target: CoordinateInput,
    candidates: CoordinateInput[],
    unit: DistanceUnit = 'km'
  ): { coordinate: CoordinateInput; distance: number; index: number } | null;
  ```
* **Purpose:** Finds the nearest coordinate (e.g., closest store, airport, or GPS waypoint) from a candidate collection.

### Plugin Integration Touchpoints:
* **`tempo-plugin-spatial`**: Exposes `t.spatial.destination(distance, bearing)` on Tempo instances.

---

## Phase 4: Timezones & DST Analysis (`@magmacomputing/tempo-fns/timezone`)

### 1. `isValidTimeZone(timeZone)`
* **Signature:** `isValidTimeZone(timeZone: string): boolean`
* **Purpose:** Safe, non-throwing check whether a string is a valid IANA timezone identifier accepted by the host environment.

### 2. `getDSTTransitions(timeZone, year)`
* **Signature:**
  ```typescript
  export interface DSTTransitionsResult {
    hasDST: boolean;
    springForwardMs?: number | undefined;
    fallBackMs?: number | undefined;
  }
  export function getDSTTransitions(timeZone: string, year: number): DSTTransitionsResult;
  ```
* **Purpose:** Resolves exact timestamps of daylight saving time transitions for a given timezone and calendar year.

---

## Phase 5: Tidying, Ergonomics & Root Re-exports

1. **Root Type Assertion Re-exports**:
   * Export the type guards in `src/support/assert.ts` (`isNumber`, `isString`, `isDate`, `isDefined`, etc.) directly from `src/index.ts` so developers don't need deep imports (`@magmacomputing/tempo-fns/support/assert.js`).
2. **Universal Coordinate Input Normalizer**:
   * Standardize input acceptance across `spatial` and `celestial` (`[lat, lng]`, `{ lat, lng }`, `{ latitude, longitude }`).

---

## Suggested Rollout Schedule

| Phase | Functional Scope | Key Exports | Target Release |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Calendar Primitives | `isLastDayOfMonth`, `isWeekend`, `isWeekday`, `isLeapYear`, `daysInMonth` | ✅ Completed (v1.2.0) |
| **Phase 2** | Business Days | `isBusinessDay`, `nextBusinessDay`, `addBusinessDays`, `businessDaysBetween` | v1.3.0 |
| **Phase 3** | Geodesy Extensions | `calculateDestination`, `closestCoordinate` | v1.4.0 |
| **Phase 4** | Timezone Transitions | `isValidTimeZone`, `getDSTTransitions` | v1.4.0 |
| **Phase 5** | Ergonomics & Cleanups | Root re-exports, coordinate normalization | v1.4.0 |
