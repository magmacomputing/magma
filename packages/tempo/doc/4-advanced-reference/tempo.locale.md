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

*For deeper details on layout configurations and ambiguous digits, see the [Ambiguity Resolution Guide](../2-core-concepts/tempo.parse.md).*

---

## 2. Multi-Lingual Parsing (Input)

By default, Tempo parses structural English abbreviations (e.g., `Jan`, `Feb`, `Mon`, `Tue`). However, Tempo is capable of natively parsing foreign languages by dynamically learning from the runtime environment.

When you nominate a non-English `locale` (or an array of locales like `['fr-FR', 'es-ES']`):
- Tempo asks the native ECMAScript `Intl` API how to spell months, weekdays, and relative events (like "tomorrow" or "yesterday") in the specified languages.
- It dynamically compiles new, high-performance Regular Expressions containing these localized abbreviations (and automatically handles accent variations, matching both `próximo` and `proximo`).
- It injects these patterns into its lexer, allowing Tempo to instantly understand strings like `'15 Janvier 2024'` or `'15 febrero 2024'`.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Tempo learns French and Spanish months & weekdays at runtime!
// Custom relative modifier keywords ('próximo') and noise articles ('el') can be registered in the registry.
Tempo.init({ 
  locale: ['fr-FR', 'es-ES'],
  registry: {
    modifiers: { '+': ['próximo', 'proximo', 'siguiente'] },
    ignores: ['el', 'la', 'los', 'las']
  }
});

const a = new Tempo('15 janvier 2024');  // Matches French
const b = new Tempo('el próximo lunes');  // Matches Spanish ("next Monday")
```

*For more details on setting up and optimizing international parsing, see [Internationalized Parsing](../2-core-concepts/tempo.parse.md#internationalized-parsing-locales).*

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

*For more details on formatting features, see the [Format Guide](../2-core-concepts/tempo.format.md).*

### Global LOCALE Registry
The easiest way to augment or override translations globally is via the `locales` configuration option. Translations added here will apply to *any* plugin that resolves the specified key:
```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        locales: {
            fr: {
                morning: 'Matinée',
                afternoon: 'Après-midi',
                // Supports native Intl.PluralRules objects for ordinals!
                ordinal: { one: 'er', other: 'e' }
            }
        }
    }
});

const t = new Tempo('2024-05-15 10:30', { locale: 'fr-FR' });
console.log(t.format('{#tod:locale}')); // "Matinée"
console.log(t.format('{dd:ord}'));      // "15e"
```

> [!NOTE]
> **Ordinal Localization**: While the `:locale` modifier automatically delegates to native APIs for months and weekdays, the `:ord` modifier **requires** a dictionary in the global `locales` registry for non-English languages. If no `ordinal` dictionary is found, Tempo will fall back to English suffixes (`st`, `nd`, `rd`, `th`). By providing a "Plural Object" mapping as shown above, Tempo natively evaluates the active `Intl.PluralRules` category and automatically appends the correct suffix!

### Term Bundled Dictionary
Plugin authors can optionally bundle a `locale` dictionary directly into their custom Term definition:
```typescript
Tempo.use({
    terms: [{
        key: 'shift',
        label: 'Shift',
        locale: {
            es: 'Turno',
            de: 'Schicht'
        },
        // ... logic
    }]
});
```
*Note: A user's Global `locales` config will always take precedence over a plugin's bundled dictionary.*
---

## Initialization & Fallbacks

If you do not explicitly provide a `locale` when initializing `Tempo`, it will gracefully attempt to infer it from the environment:
1. It checks the browser's prioritized language list (`navigator.languages[0]`).
2. It falls back to the system's primary language (`navigator.language`).
3. If no system language is exposed (such as on headless servers without `Intl` extensions), it falls back safely to `'en-US'`.

Whenever an array of locales is provided (e.g. `['fr-FR', 'en-GB']`), Tempo extracts the first item in the array as the "Primary Locale". The primary locale is passed to strict native APIs (like `Intl.Locale`) to guarantee stable and deterministic formatting.

### Regional Calendar & Environment Fallbacks

Tempo delegates regional calendar metadata (such as `firstDay` of the week, regional `weekend` days, and text `direction`) directly to the ECMAScript `Intl.Locale` Info API powered by the host runtime's Unicode CLDR/ICU database.

> [!NOTE]
> **Host Environment & Default Baseline Fallbacks**
> 
> - **Modern Runtimes (Node 18.19+, Node 20+, Modern Browsers)**:
>   Tempo pulls dynamic, fully authoritative CLDR data directly from the host engine for all 250+ world territories (e.g. Sunday start for `en-US`, Monday start for `en-GB`, Saturday/Sunday weekend for France, Friday/Saturday for Saudi Arabia).
> 
> - **Legacy or Stripped Environments (Minimal Docker / Older Engines)**:
>   If running in an environment lacking the native `Intl.Locale` Info API, Tempo applies a **best-effort regional heuristic** for major cohorts (like US, Canada, and Middle Eastern locales).
> 
> - **Default Baseline Settings**:
>   If a locale or territory is not covered by these heuristics, Tempo **deliberately falls back to standard baseline settings**:
>   - **First day of week**: Monday (`1`, matching ISO 8601)
>   - **Weekend days**: Saturday & Sunday (`[6, 7]`)
>   - **Text direction**: Left-to-Right (`'ltr'`)
> 
> **Tip for Docker Deployments**: When packaging server applications in minimal Linux or Alpine containers, ensure your Node.js runtime has full ICU support (standard official `node` container images include full ICU by default) so your applications enjoy full native CLDR accuracy across all locales.

---

## 4. `Intl.LocaleInfo` & Regional Calendar Integration

Tempo bridges the mathematical rigor of the ISO 8601 engine with the practical, cultural expectations of calendars around the world (e.g., Sunday-first weeks in North America and Japan, Friday–Saturday weekends in the Middle East).

### Inspecting Cultural Metadata (`t.intl`)

Every `Tempo` instance provides a frozen, globally memoized `t.intl` getter returning `ResolvedLocaleInfo` with zero per-instance allocations:

```typescript
const t = new Tempo('2026-09-16', { locale: 'en-US' });

console.log(t.intl.firstDay);        // 7 (Sunday)
console.log(t.intl.weekend);         // [6, 7] (Saturday, Sunday)
console.log(t.intl.region);          // 'US'
console.log(t.intl.script);          // 'Latn'
console.log(t.intl.direction);       // 'ltr'
console.log(t.intl.hourCycle);       // 'h12'
console.log(t.intl.numberingSystem); // 'latn'
console.log(t.intl.baseName);        // 'en-US'
```

### Opt-in Regional Calendar Math (`localeInfo: true`)

By default, Tempo protects your backend and machine logic with strict ISO 8601 invariants (`t.set({ week: 'start' })` always snaps to Monday). 

To adapt week mutations to human cultural conventions, enable `localeInfo: true`:

```typescript
// Enable globally or per-instance:
Tempo.init({ locale: 'en-US', localeInfo: true });

const t = new Tempo('2026-09-16'); // Wednesday
t.set({ week: 'start' });          // Snaps to previous Sunday (2026-09-13 00:00:00)
t.set({ week: 'mid' });            // Snaps to Wednesday (2026-09-16 00:00:00, 3 days after start)
t.set({ week: 'end' });            // Snaps to Saturday (2026-09-19 23:59:59.999999999)
```

### Dedicated ISO Escape Hatches (`isoWeek`, `wy`)

When `localeInfo: true` is active, you can always guarantee strict ISO 8601 Monday-start boundaries using dedicated ISO tokens:

```typescript
t.set({ isoWeek: 'start' });       // Always snaps to Monday 00:00:00
t.set({ wy: 'start' });            // Equivalent dedicated ISO week boundary
t.set({ isoWeek: 'mid' });         // Always snaps to Thursday 00:00:00
t.set({ isoWeek: 'end' });         // Always snaps to Sunday 23:59:59.999999999
```

### Cultural Formatting Tokens

- **`{dow:locale}`**: Formats a 1-based day-of-week index relative to the active locale's `firstDay` (e.g. Sunday = `1` in `en-US` and `ar-SA` [where Saturday is `7`], Monday = `1` in `en-GB`). Because the developer explicitly requested `:locale`, this evaluates directly using `t.intl.firstDay`. Standard `{dow}` continues to evaluate to ISO Monday = `1` strictly.
- **`{hh:locale}`**: Adapts hour formatting to the region's `hourCycle` (12-hour format `00..11` in `h11` regions, `01..12` in `h12` regions like `en-US`, and 24-hour format `00..23` in `h23`/`h24` regions like `fr-FR`). Compose with `:raw` (`{hh:locale:raw}`) for unpadded hours.
- **`{time:locale}`**: Formats a complete localized time string, automatically including localized meridiem markers in `h12` locales (`"03:30:45 pm"`) and 24-hour time in `h23` locales (`"15:30:45"`).
- **Localized Numerals (`:locale`)**: When applied to numeric tokens (`{yyyy:locale}`, `{mm:locale}`, `{dd:locale}`), transliterates digits into the region's native numbering system (e.g. `٢٠٢٦-١٠-٢٤` in `ar-EG`). Base tokens without `:locale` (`{yyyy}-{mm}-{dd}`) always maintain strict ASCII digits for machine safety.
- **BiDi Isolation**: When formatting localized text tokens (`{mon:locale}`, `{wkd:locale}`) in RTL regions (Arabic, Hebrew), Tempo wraps text in Unicode BiDi isolates to prevent bidirectional text disruption.
- **`{intl.<property>}`**: Directly embeds resolved regional metadata into format templates (e.g. `{intl.region}`, `{intl.script}`, `{intl.direction}`, `{intl.firstDay}`).
