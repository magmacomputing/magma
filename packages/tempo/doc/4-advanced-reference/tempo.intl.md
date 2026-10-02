# Internationalization (Intl) & Locale in Tempo

The `locale` configuration setting (`config.locale`) and internationalization subsystem are foundational pillars of the Tempo engine. Because Tempo delegates heavily to native ECMAScript APIs (`Intl` and `Temporal`), the `locale` parameter is responsible for driving three distinct behavioral systems:

1. **Ambiguity Resolution** (How ambiguous dates are ordered)
2. **Multi-lingual Parsing** (How foreign text is lexed)
3. **Auto-localization Formatting** (How output strings are generated)

> [!NOTE]
> **Scope & Design Philosophy**
> Tempo focuses strictly on high-performance date-time mathematics, localized calendar heuristics, and temporal token formatting. General-purpose string manipulation (such as `Intl.DisplayNames`, `Intl.Segmenter`, or `Intl.Collator`) is intentionally delegated directly to standard native ECMAScript engines.

When you initialize Tempo (or let it infer its environment), the `locale` dictates how it interprets and communicates dates.

---

## 1. Ambiguity Resolution (Date Layout)

When parsing an ambiguous string like `04/05/2024`, the engine must decide if it's April 5th (`MDY` order) or May 4th (`DMY` order). 

Tempo uses the active `locale` as a critical piece of metadata to resolve this:
- It resolves your `locale` (e.g. `'en-US'` or `'en-GB'`) to determine the active region.
- It cross-references the locale's region or language against the internal `MONTH_DAY` registry to check its preferred layout.
- If the locale inherently prefers `MDY` (as in the United States), Tempo dynamically swaps its parsing order to attempt `Month-Day-Year` patterns *before* it attempts `Day-Month-Year` patterns.

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
- Custom format masks can leverage `:locale` modifiers (e.g. `{hh:locale}`, `{time:locale}`, `{mon:locale}`, `{geo.sphere:locale}`) to apply local hour-cycles, localized month names, spatial hemisphere translations, and numbering system transliteration.

---

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

## 4. `Intl.Locale` Info & Regional Calendar Integration

Tempo delegates regional calendar and cultural metadata directly to the ECMAScript [`Intl.Locale` Info API](https://github.com/tc39/proposal-intl-locale-info) (such as [`Intl.Locale.prototype.getWeekInfo()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo) and `getTextInfo()`), bridging the mathematical rigor of the ISO 8601 engine with the practical cultural expectations of calendars around the world (e.g., Sunday-first weeks in North America and Japan, Friday–Saturday weekends in the Middle East).

### Inspecting Cultural Metadata (`t.intl.info`)

Every `Tempo` instance provides a structured `t.intl` namespace:
- **`t.intl.info`**: Returns a frozen, memoized `ResolvedLocaleInfo` object. Guaranteed to be fully populated across all runtimes (providing standard ISO/CLDR fallbacks if running in minimal or stripped environments).
- **`t.intl.locale`**: Returns the memoized native ECMAScript `Intl.Locale` instance (typed as `Intl.Locale | undefined` to safely handle legacy or headless environments that lack `Intl.Locale`).

```typescript
const t = new Tempo('2026-09-16', { locale: 'en-US' });

// Cultural calendar metadata via t.intl.info (always defined):
console.log(t.intl.info.firstDay);        // 7 (Sunday)
console.log(t.intl.info.weekend);         // [6, 7] (Saturday, Sunday)
console.log(t.intl.info.region);          // 'US'
console.log(t.intl.info.script);          // 'Latn'
console.log(t.intl.info.direction);       // 'ltr'
console.log(t.intl.info.hourCycle);       // 'h12'
console.log(t.intl.info.numberingSystem); // 'latn'
console.log(t.intl.info.baseName);        // 'en-US'

// Native Intl.Locale instance via t.intl.locale (use optional chaining):
console.log(t.intl.locale?.language);             // 'en'
console.log(t.intl.locale?.maximize().baseName);  // 'en-Latn-US'
```

> [!NOTE]
> **Type Safety & Environment Portability**: While `t.intl.info.*` properties are guaranteed non-nullish across all platforms, `t.intl.locale` directly exposes the host engine's native `Intl.Locale`. TypeScript strict checking encourages optional chaining (`t.intl.locale?....`) when directly interacting with the native instance prototype.

> [!TIP]
> **Backward Compatibility**: Direct access via `t.intl.firstDay`, `t.intl.weekend`, etc., remains supported as a deprecated fallback during v4.x, but new code should target `t.intl.info.*`.

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

- **`{dow:locale}`**: Formats a 1-based day-of-week index relative to the active locale's `firstDay` (e.g. Sunday = `1` in `en-US` and `ar-SA` [where Saturday is `7`], Monday = `1` in `en-GB`). Because the developer explicitly requested `:locale`, this evaluates directly using `t.intl.info.firstDay`. Standard `{dow}` continues to evaluate to ISO Monday = `1` strictly.
- **`{hh:locale}`**: Adapts hour formatting to the region's `hourCycle` (12-hour format `00..11` in `h11` regions, `01..12` in `h12` regions like `en-US`, and 24-hour format `00..23` in `h23`/`h24` regions like `fr-FR`). Compose with `:raw` (`{hh:locale:raw}`) for unpadded hours.
- **`{time:locale}`**: Formats a complete localized time string, automatically including localized meridiem markers in `h12` locales (`"03:30:45 pm"`) and 24-hour time in `h23` locales (`"15:30:45"`).
- **Localized Numerals (`:locale`)**: When applied to numeric tokens (`{yyyy:locale}`, `{mm:locale}`, `{dd:locale}`), transliterates digits into the region's native numbering system (e.g. `٢٠٢٦-١٠-٢٤` in `ar-EG`). Base tokens without `:locale` (`{yyyy}-{mm}-{dd}`) always maintain strict ASCII digits for machine safety.
- **BiDi Isolation**: When formatting localized text tokens (`{mon:locale}`, `{wkd:locale}`) in RTL regions (Arabic, Hebrew), Tempo wraps text in Unicode BiDi isolates to prevent bidirectional text disruption.
- **`{intl.<property>}`**: Directly embeds resolved regional metadata into format templates (e.g. `{intl.region}`, `{intl.script}`, `{intl.direction}`, `{intl.firstDay}`).

---

## 5. High-Performance `Intl` Utility Hub

In addition to inspecting regional calendar metadata, the `t.intl` namespace is designed as a zero-overhead, pre-bound internationalization utility hub. 

Native ECMAScript `Intl` formatters (`Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.DateTimeFormat`) are powerful but can be slow to initialize in tight loops because they re-parse Unicode CLDR databases on each constructor call. `Tempo.intl` eliminates this overhead through an internal $O(1)$ LRU memoization pipeline pre-bound to the active instance's `locale` and `timeZone`:

### Pre-Bound Formatting Operations

```typescript
const t = new Tempo('2026-10-02', { locale: 'fr-FR' });

// 1. Relative Time Formatting (Pre-bound to t.locale)
t.intl.relativeTime(-2, 'day');              // "il y a 2 jours"
t.intl.relativeTime(3, 'month');             // "dans 3 mois"

// 2. Localized List Formatting (Pre-bound to t.locale)
t.intl.list(['lundi', 'mardi', 'mercredi']);  // "lundi, mardi et mercredi"

// 3. Pre-Memoized Native DateTimeFormat Instance
const dtf = t.intl.dtf({ dateStyle: 'full' }); // Instant O(1) cached Intl.DateTimeFormat

// 4. Plural Category Rules
t.intl.plural(1);                            // 'one'
t.intl.plural(5);                            // 'other'
```

### Architectural Benefits

| Feature | Raw Native `Intl` | `Tempo.intl` Utility Hub |
| :--- | :--- | :--- |
| **Instantiation Cost** | Repeated CLDR/ICU initialization | $O(1)$ Globally memoized cache |
| **Context Wiring** | Manual `locale` & `timeZone` passing | Automatically bound to instance context |
| **Memory Footprint** | Manual GC management required | 0 bytes added to `Tempo` instances |
| **Relative & List Formatting** | Multi-line constructor boilerplate | Clean, humanized one-liners |
