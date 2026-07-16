The goal of this step is to introduce 'IDE confirmation' on a User's .format() string.


``` typescript
// Define your allowed tokens
type ValidToken = 'dd' | 'mm' | 'yy' | 'yyyy' | 'mon' | 'dd:ord';

// A type helper that ensures the string contains a valid pattern
type ValidFormatString<S extends string> = S extends `${string}{${infer Token}}${infer Rest}`
  ? Token extends ValidToken
    ? ValidFormatString<Rest> // Valid token, recursively check the rest of the string
    : never // Illegal token found!
  : string; // Base case: no more tokens found

// Apply it directly to your class method
class Tempo {
  format<S extends string>(formatStr: S & ValidFormatString<S>): string {
    // Runtime parsing logic goes here...
    return '';
  }
}
```
 If a developer types new Tempo().format('{mon} {dy}'), their IDE will immediately highlight {dy} in red with a compilation error, preventing runtime failures before their code even hits production.

Do we see value in doing this for parsing input ?
You can do the same thing for anchoring or parsing formats. If your anchor configuration option accepts an ISO date, you can strictly validate the YYYY-MM-DD shape at compile time
``` typescript
type ISODateFormat = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

interface TempoOptions {
  anchor?: ISODateFormat; // Will reject '2026/10/15' or 'tomorrow'
}
```

---

## Shipped in 3.9.0

The following was implemented in `packages/tempo/src/`:

- **`TempoFormatTokens` interface** (`tempo.type.ts`) — an open, augmentable interface listing
  every built-in `{token}` key. Plugins can extend it via declaration merging:
  ```ts
  declare module '@magmacomputing/tempo' {
    interface TempoFormatTokens { 'fiscal.quarter': true }
  }
  ```

- **`ValidateFormat<S>` type** (`tempo.type.ts`) — a recursive template-literal type that walks
  every `{…}` pair and checks it against `TempoFormatTokens`. Key design decisions:
  - `string extends S ? string : …` — skips validation when a variable (not a literal) is passed.
  - `${_CoreToken}:${string}` — all modifier suffixes (`{dd:ord}`, `{tz:zzzzz}`) are accepted.
  - `#${string}` — term-plugin keys (`{#season.key}`) are always accepted (dynamic, unknowable statically).
  - Returns `❌ '{bad}' is not a valid Tempo format token` as the error type (not `never`) so the
    bad token name is visible in the IDE tooltip.

- **`format()` overload** (`module.format.ts`) — a new generic overload is inserted before the
  `any` catch-all so string literals are resolved against `ValidateFormat<S>` at call-site.

---

## Excluded — future work

| Feature | Reason excluded | Suggested PR |
|---|---|---|
| **`anchor` option validation** | The plan's `ISODateFormat` pattern (`${number}${number}…`) accepts any 8-digit sequence (e.g. `9999-99-99`). True ISO validation requires calendar-aware logic that can't be expressed purely in template literal types. Needs its own design. | 3.10.x |
| **Constructor `value` / parse-input validation** | Parse input is intentionally flexible (strings, numbers, Dates, Temporal objects). Constraining it at the type level would be too narrow and break valid use cases. | Not planned |
| **`registry.tokens` keys in `TempoFormatTokens`** | Custom tokens registered via `Tempo.init({ registry: { tokens: { myKey: fn } } })` are runtime values — TypeScript has no way to reflect them into the type system without explicit manual augmentation. Document the augmentation pattern instead. | 3.10.x (docs) |
| **Modifier validation** (`{dd:badModifier}`) | The modifier space (`:ord`, `:lower`, `:upper`, `:title`, `:locale`, `:z` … `:zzzzz`, etc.) varies per token. Per-token modifier unions would be possible but complex — a separate dedicated type work item. | 4.0 |
| **`Tempo.FORMAT` alias strings** | `tempo.format('display')` (a pre-registered alias key) works at runtime but the format alias string expands to a template containing tokens — validating the *expanded* alias at compile time would require inlining all `FORMAT` values into the type, which duplicates state and risks drift. | 4.0 |