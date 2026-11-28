# Future Horizons & Cultural Term Roadmap

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
