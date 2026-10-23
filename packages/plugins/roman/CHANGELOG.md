# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-roman` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-24

### Added
- **Phase 1: Mathematical Foundations**:
  - Classical Roman calendar date calculator resolving lunar anchors:
    - **Kalends** (*Kalendae*): 1st of every month.
    - **Nones** (*Nonae*): 7th in MOM-J months (March, October, May, July); 5th in all others.
    - **Ides** (*Idus*): 15th in MOM-J months; 13th in all others.
    - **Pridie**: Day immediately preceding an anchor.
    - **Ante Diem**: Inclusive backward counting from an anchor with proper Latin grammar declensions (Ablative for anchor days, Accusative for ante diem/pridie).
  - Leap year and classical bissextile day (*ante diem bis sextum Kalendas Martias*) intercalation on February 24 with round-trip stability.
  - Ab Urbe Condita (AUC) year conversion engine mapping bidirectional Gregorian/Julian astronomical and historical BCE/CE years.
  - Attached static `Tempo.roman` namespace with `.toClassical()`, `.fromClassical()`, `.yearToAuc()`, `.aucToYear()`, `.getNonesDay()`, `.getIdesDay()`, and `.isLeapYear()`.
  - Added `Tempo.prototype.toRomanClassical()` and `Tempo.prototype.toAUC()` instance methods, along with `Tempo.prototype.auc` getter.
  - Provided side-effect zero-boilerplate import via `@magmacomputing/tempo-plugin-roman/install`.
- **Phase 2: Formatting Engine & Latin Declensions**:
  - Full Latin and abbreviated formatting tokens: `{roman:classical}`, `{roman:short}`, `{roman:auc}`, `{roman:nominative}`, `{roman:accusative}`, `{roman:ablative}`.
  - Added `.formatRoman()` method on `Tempo.prototype`.
  - Added Latin ordinal word generator for countdowns (`words: true`).
- **Phase 3: Classical Latin Date Parser**:
  - Implemented `parseClassicalRomanDate(input, options?)` and `Tempo.roman.parse(input, options?)` / `Tempo.roman.parseDate()`.
  - Natural parsing of classical Latin expressions, supporting Kalends, Nones, Ides, Pridie, Ante Diem, bissextile leap day (`a.d. bis VI Kal. Mart.`), grammatical case declensions, and Latin ordinal words.
  - Multi-era year support (AUC, BCE/CE, and astronomical integer years).
  - Bidirectional verification against calendar arithmetic to reject impossible Roman dates.
- **Phase 4: Consular Fasti Catalog (509 BCE–541 CE)**:
  - Built-in historical database of Roman eponymous consuls from the founding of the Roman Republic (509 BCE) through the final ordinary consul of the West (541 CE).
  - Added consular formatting engine with Latin ablative absolute (`coss.` / `cos.`) and nominative case styles (`formatConsuls(year, style?)`).
  - Added `Tempo.roman.getConsuls(year)` and fuzzy search utility `Tempo.roman.findConsuls(query)`.
  - Added `{roman:consul}` format token support and `tempo.consuls` instance getter.
  - Classical parser automatically resolves consular pairs (e.g. `Idibus Martiis Cicerone coss.`).
