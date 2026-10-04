# Support Utilities & Type Guards
This directory contains core type assertions, duck-typing guards, universal coordinate normalization, and Temporal coercion utilities.

All public support utilities and type guards are exported directly from the `@magmacomputing/tempo-fns` package root.

## Exported Functions & Type Guards

### Type Guards
- `isNumber(val)`: Asserts finite number (guards against `NaN` and `Infinity`).
- `isString(val)`: Asserts string type.
- `isText(val)`: Asserts non-empty string with meaningful trimmed content.
- `isBoolean(val)`: Asserts boolean primitive.
- `isFunction(val)`: Asserts callable function.
- `isNullish(val)`: Asserts `null` or `undefined`.
- `isUndefined(val)`: Asserts `undefined`.
- `isDefined(val)`: Asserts non-null and non-undefined.
- `isDate(val)`: Asserts valid JS `Date` instance with valid numeric time.
- `isObject(val)`: Asserts non-null record object (excluding arrays).
- `isTempo(val)`: Asserts `Tempo` instance via branded symbol tag.
- `isTemporal(val)`: Asserts any native `Temporal` instance.
- `isZonedDateTime(val)`: Asserts `Temporal.ZonedDateTime`.
- `isPlainDate(val)`: Asserts `Temporal.PlainDate`.
- `isInstant(val)`: Asserts `Temporal.Instant`.
- `isDuration(val)`: Asserts `Temporal.Duration`.

### Coordinate Extraction & Normalization
- `extractRawCoords(input, lngFallback?)`: Universal parser extracting `{ lat, lng, elevation? }` from positional numbers `(lat, lng)`, arrays `[lat, lng, elev?]`, comma-separated strings `"lat, lng"`, or objects (`{ lat, lng, elevation }`, `{ latitude, longitude }`, `.geo`).
- `normalizeCoords(lat, lng, round?)`: Validates and normalizes latitude and longitude within Earth bounds `[-90, 90]` and `[-180, 180]`, with optional 3-decimal rounding.
- `resolveCoordinates(latOrOptions, lngInput)`: Normalizes coordinates with safe default fallbacks `(0, 0, 0)`.

### Temporal Coercion & Timestamps
- `coerceZonedDateTime(date, fallbackTz)`: Universal coercion from any `DateInput` (Tempo, Temporal, Date, string, timestamp) into a native `Temporal.ZonedDateTime`.
- `toEpochMs(date)`: Extracts epoch milliseconds from any date-like input.
- `extractDateParts(input)`: Extracts `{ year, month, day, dayOfWeek, daysInMonth, type }` components from any date representation.
- `getTemporal()`: Dynamically resolves `globalThis.Temporal` or provides clear guidance if missing.
