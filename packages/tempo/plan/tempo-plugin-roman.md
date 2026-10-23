# Plan: `@magmacomputing/tempo-plugin-roman` (Classical Roman Calendar & Latin Mechanics)

## 1. Overview & Motivation

While **Tempo core** natively supports modern and archival Roman numeral representations—such as European day-RomanMonth-year dates (`14.X.2026`), monument inscription years (`MMXXVI`, `Anno Domini MCMXCIV`), and round-trip format mask modifiers (`{yyyy:roman}`)—it intentionally does not implement ancient Roman calendar mechanics.

Ancient Roman timekeeping (*Fasti*) operated on principles completely distinct from modern ISO 8601 and Gregorian calendar arithmetic:
- Days were not numbered sequentially $1 \dots 31$; they were calculated backwards from three lunar anchor points: **Kalends** (*Kalendae*), **Nones** (*Nonae*), and **Ides** (*Idus*).
- Years were recorded by **Presiding Consuls** (e.g., *"In the consulship of Cicero and Antonius"*) or reckoned **AUC** (*Ab Urbe Condita* — from the traditional founding of Rome in 753 BC).
- Neither ECMAScript Intl nor TC39 `Temporal` support Roman calendar systems.

To preserve the lean footprint and deterministic $O(1)$ performance of Tempo core while providing complete fidelity for historians, legal scholars, genealogists, classicists, and numismatists, classical Roman calendar mechanics will be housed in a dedicated plugin: **`@magmacomputing/tempo-plugin-roman`**.

---

## 2. Core Capabilities & Scope

### A. Classical Date Calculation & Declensions
- **Anchor Calculations**:
  - **Kalends** (*Kalendae*): Always the 1st of the month.
  - **Nones** (*Nonae*): 7th in "MOM-J" months (March, October, May, July); 5th in all other months.
  - **Ides** (*Idus*): 15th in "MOM-J" months; 13th in all other months.
  - **Pridie**: The day immediately preceding an anchor (e.g., *Pridie Idus Octobres* = October 14).
  - **Ante Diem**: Inclusive backward counting from an anchor (e.g., *Ante diem XVII Kalendas Novembres* = October 16).
- **Leap Year Intercalation (*Bissextile Day*)**:
  - Classical handling of leap years by doubling the 6th day before the March Kalends (*ante diem bis sextum Kalendas Martias*).
- **Latin Grammar Support**:
  - Full Latin declensions for formal Latin inscriptions (Accusative for *ante diem*, Ablative for exact dates).
  - Standard Latin abbreviations (e.g., `a.d. XVII Kal. Nov.`).

### B. Year Reckoning Systems
1. **AUC (*Ab Urbe Condita*)**:
   - Astronomical Gregorian/Julian conversion:
     - For $\text{Year} \ge 1$: $\text{AUC} = \text{Year} + 753$ (e.g., $2026 \text{ CE} \implies 2779 \text{ AUC}$).
     - For historical BCE: $\text{AUC} = 754 - \text{Year}_{\text{BCE}}$ (e.g., $44 \text{ BCE} \implies 710 \text{ AUC}$).
2. **Consular Dating**:
   - Built-in historical catalog of Roman Consuls from 509 BCE through 541 CE.
   - Conversion of astronomical years into consular pairs (e.g., $63 \text{ BCE} \implies \text{"M. Tullio Cicerone, C. Antonio Hybrida coss."}$).

### C. Formatting & Parsing Tokens
- **Formatting Tokens**:
  - `{roman:classical}` $\rightarrow$ Full Latin date (*"Ante diem XVII Kalendas Novembres"*).
  - `{roman:short}` $\rightarrow$ Abbreviated Latin date (*"a.d. XVII Kal. Nov."*).
  - `{roman:auc}` $\rightarrow$ Year AUC (*"AUC MMDCCLXXIX"*).
  - `{roman:consul}` $\rightarrow$ Consular pair.
- **Parsing Engine**:
  - Natural parsing of classical Latin expressions:
    ```ts
    const t = Tempo.roman.parse('a.d. IV Id. Mart. 710 AUC');
    // Resolves to March 12, 44 BCE
    ```

---

## 3. Architecture & Integration

Following the standard Tempo plugin architecture:
- **Module Registration**: Installed via `Tempo.use(RomanPlugin)` or imported as tree-shakable utilities.
- **Namespace Encapsulation**: All classical Roman calculations, parsing, formatting, and conversion functions are cleanly grouped under the static `Tempo.roman` namespace and the instance `tempo.roman` property.
- **Zero Core Dependency Bloat**: All Latin vocabulary, grammar declension tables, and consular catalog remain entirely within the plugin package.

---

## 4. Phased Implementation Roadmap

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | Mathematical Foundations | **Delivered (v1.0.0)**: Kalends/Nones/Ides calculator, Leap year/bissextile handling, AUC year converter. |
| **Phase 2** | Formatting Engine | **Delivered (v1.1.0)**: Full Latin and abbreviated format tokens (`{roman:classical}`, `{roman:short}`, `{roman:auc}`, `{roman:nominative}`, `{roman:accusative}`, `{roman:ablative}`), grammatical case switches (nominative, accusative, ablative), `.formatRoman()` method, Latin ordinal words. |
| **Phase 3** | Classical Parser | **Delivered (v1.2.0)**: NLP pattern recognition for Latin date strings (`Tempo.roman.parse()`, `parseClassicalRomanDate()`), Latin ordinal words, AUC/BCE/CE year resolution, bissextile validation. |
| **Phase 4** | Consular Catalog & Docs | **Delivered (v1.2.0)**: Historical consular database (509 BCE–541 CE), `{roman:consul}` format token, `tempo.consuls` getter, Latin ablative/nominative dating formulas (`Tempo.roman.formatConsuls()`), Fasti search (`Tempo.roman.findConsuls()`), and consular year parsing. |
