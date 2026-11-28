
## Future Horizons / Exploratory Proposals (Post-v5.0 GA)

For features and architectural investigations targeted beyond the initial v5.0 General Availability release, refer to active exploratory RFCs:

* **Optional Formatter & Semicolon Policy (`biome.json` / `.prettierrc`)** *(deferred; decide post-v5)*:
  - Evaluate whether to add a repository-wide formatter config (`semi: true`) and clean up remaining un-semicoloned files (e.g. VitePress theme files) without blocking the v5.0.0 release.

* **`Temporal`-Native / `Tempo`-Optional Term Evaluation** *(low-priority thought experiment)*:
  - Currently, a consumer wanting to evaluate a Term plugin (e.g. `QuarterTerm`) on a `Temporal.ZonedDateTime` can import `tempo-kit/core` to provide the lightweight `Tempo` wrapper mechanism without loading optional modules (`FormatModule`, `DurationModule`, `MutateModule`, `ParseModule`).
  - **Future exploration** (if standalone `Temporal.ZonedDateTime` in → `Temporal` out is ever desired):
    1. *Accept raw `ZonedDateTime` as `this`/anchor*: Replace `fallback.constructor` in term helpers such as `toIsoTempo` (`packages/plugins/.terms/src/term.quarter.ts`) with `getHost(fallback)`.
    2. *True `Tempo`-free `getTermRange` & `defineSpan`*: `defineSpan` already falls back to `Temporal.Duration` when `DurationModule` and `Host.duration` are absent; adding a `raw` / host-optional path in `getTermRange` (`packages/tempo/src/plugin/term/term.util.ts`) to return `Temporal.ZonedDateTime` directly for `span.start` / `span.end` (when no `Host` is present) would allow range-based terms to run purely on `Temporal` primitives.

# Future Horizons / Cultural Term Roadmap

As **Tempo v5** separates universal civic/business terms (`CivicTerms` and `FiscalTerm` in `tempo-kit/terms`) from traditional, cultural, and historical calendar systems (`@tempo-kit/plugin-cultural`), the following Term additions are planned for future minor releases of `@tempo-kit/plugin-cultural`—leveraging `Temporal`'s built-in non-ISO calendar engines:

## Planned Additions for `@tempo-kit/plugin-cultural`

1. **East Asian 24 Solar Terms (`JieqiTerm` / `#jieqi`)**
   * Solar-longitude-based traditional terms (*Lichun*, *Qingming*, *Mangzhong*, *Dongzhi*, etc.) used across East Asian agriculture, seasonal commerce, and cultural observances.
2. **Japanese Eras / Wareki (`NengoTerm` / `#nengo`)**
   * Era boundaries (*Meiji*, *Taishō*, *Shōwa*, *Heisei*, *Reiwa*) backed by `Temporal`'s native `'japanese'` calendar for Japanese business, legal, and government date formatting and parsing.
3. **Hijri & Hebrew Month Scopes (`HijriTerm`, `HebrewTerm`)**
   * Native `Temporal` `'islamic-umalqura'` and `'hebrew'` month boundaries with `.span` progress/remaining metrics (e.g. *Ramadan*, *Shawwal*, *Tishrei*, *Nisan*) for globalized observance and event calendars.
4. **Liturgical Seasons (`LiturgicalTerm`)**
   * Ecclesiastical calendar seasons (*Advent*, *Christmastide*, *Epiphany*, *Lent*, *Eastertide*, *Pentecost*, *Ordinary Time*) complementing `@tempo-kit/plugin-holidays`.
5. **Traditional UK / Celtic Quarter & Cross-Quarter Days (`QuarterDaysTerm`)**
   * Historical English, Scottish, and Irish Quarter Days and Cross-Quarter Days (*Lady Day*, *Midsummer*, *Michaelmas*, *Imbolc*, *Beltane*, *Lughnasadh*, *Samhain*).
6. **Generational Cohorts (`GenerationTerm` / `#gen`)**
   * Standard demographic cohort ranges (*Silent Generation*, *Baby Boomers*, *Gen X*, *Millennials*, *Gen Z*, *Gen Alpha*) for HR, demographic, and analytics queries.
