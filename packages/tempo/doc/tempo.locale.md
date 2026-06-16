# The Role of Locale in Tempo

The `locale` configuration setting (`config.locale`) is a foundational pillar of the Tempo engine. Because Tempo delegates heavily to native ECMAScript APIs (`Intl` and `Temporal`), the `locale` parameter is responsible for driving three distinct behavioral systems:

1. **Ambiguity Resolution** (How ambiguous dates are ordered)
2. **Multi-lingual Parsing** (How foreign text is lexed)
3. **Auto-localization Formatting** (How output strings are generated)

When you initialize Tempo (or let it infer its environment), the `locale` dictates how it interprets and communicates dates.

---

## 1. Ambiguity Resolution (Date Layout)

When parsing an ambiguous string like `04/05/2024`, the engine must decide if it's April 5th (`MDY` order) or May 4th (`DMY` order). 

Tempo uses the active `locale` as a critical piece of metadata to resolve this:
- It resolves your `locale` (e.g. `'en-US'` or `'en-GB'`) to determine the active region.
- It cross-references the locale's region or language against the internal `MONTH_DAY` registry to check its preferred layout.
- If the locale inherently prefers `MDY` (like in the United States), Tempo dynamically swaps its parsing order to attempt `Month-Day-Year` patterns *before* it attempts `Day-Month-Year` patterns.

*For deeper details on layout configurations and ambiguous digits, see the [Ambiguity Resolution Guide](./tempo.month-day.md).*

---

## 2. Multi-Lingual Parsing (Input)

By default, Tempo parses structural English abbreviations (e.g., `Jan`, `Feb`, `Mon`, `Tue`). However, Tempo is capable of natively parsing foreign languages by dynamically learning from the runtime environment.

When you nominate a non-English `locale` (or an array of locales like `['fr-FR', 'es-ES']`):
- Tempo asks the native ECMAScript `Intl` API how to spell months, weekdays, and relative events (like "tomorrow" or "yesterday") in the specified languages.
- It dynamically compiles new, high-performance Regular Expressions containing these localized abbreviations.
- It injects these new patterns into its lexer, allowing Tempo to instantly understand strings like `'15 Janvier 2024'` or `'el próximo lunes'`.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Tempo learns French and Spanish at runtime!
Tempo.init({ 
  locale: ['fr-FR', 'es-ES'] 
});

const a = new Tempo('15 janvier 2024'); // Matches French
const b = new Tempo('el próximo lunes'); // Matches Spanish
```

*For more details on setting up and optimizing international parsing, see [Internationalized Parsing](./tempo.parse.md#internationalized-parsing-locales).*

---

## 3. Formatting (Output)

When generating human-readable output, Tempo uses the `locale` to ensure the resulting text is culturally accurate. It delegates this heavily to native `Intl` APIs for extreme performance.

- When calling `.toLocaleString()`, Tempo automatically passes your configured `locale` to `Temporal` so that dates and times are correctly formatted for that region.
- When passing an `Intl.DateTimeFormatOptions` object to `.format()`, you can include a `locale` property to explicitly override the instance's locale for that specific formatting execution.
- When using granular layout strings, you must explicitly use the `:locale` modifier on structural tokens (e.g., `{mon:locale}` or `{wkd:locale}`) to instruct Tempo to delegate rendering to `Intl`. If your `locale` is an array of strings, the `Intl` engine will prioritize the first supported locale in the list.
- When generating human-readable relative time durations (e.g., using `.since()`), Tempo utilizes `Intl.RelativeTimeFormat` combined with your `locale` to produce fluid natural language strings (e.g., turning "2 days ago" into "hace 2 días" for Spanish).

```typescript
const t = new Tempo('2024-02-15', { locale: ['fr-FR', 'en-US'] });

console.log(t.format('{wkd:locale}, {dd} {mon:locale} {yyyy}'));
// "jeudi, 15 février 2024"

console.log(t.format({ dateStyle: 'full', locale: 'de-DE' }));
// "Donnerstag, 15. Februar 2024"
```

*For more details on formatting features, see the [Format Guide](./tempo.format.md).*

---

## Initialization & Fallbacks

If you do not explicitly provide a `locale` when initializing `Tempo`, it will gracefully attempt to infer it from the environment:
1. It checks the browser's prioritized language list (`navigator.languages[0]`).
2. It falls back to the system's primary language (`navigator.language`).
3. If no system language is exposed (such as on headless servers without `Intl` extensions), it falls back safely to `'en-US'`.

Whenever an array of locales is provided (e.g. `['fr-FR', 'en-GB']`), Tempo extracts the first item in the array as the "Primary Locale". The primary locale is passed to strict native APIs (like `Intl.Locale`) to guarantee stable and deterministic formatting.
