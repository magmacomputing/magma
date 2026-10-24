![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-roman

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-roman"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-roman?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-roman/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-roman"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-roman?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, zero-dependency Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem that provides **classical Roman calendar arithmetic** (*Kalends*, *Nones*, *Ides*, *Ante Diem*), **leap year bissextile handling**, and **AUC (*Ab Urbe Condita*) year conversions**.

---

## Key Features

- **Classical Anchors**: Resolves any date to its Roman *Kalends*, *Nones*, or *Ides* anchor, including *Pridie* and inclusive *ante diem* counts.
- **Latin Phrasing**: Emits full (`ante diem XVII Kalendas Novembres`) and abbreviated (`a.d. XVII Kal. Nov.`) forms with correct Ablative/Accusative declensions.
- **Bissextile Day**: Reproduces the classical leap-year doubling of the sixth day before the March Kalends (`a.d. bis VI Kal. Mart.`).
- **AUC Year Reckoning**: Bidirectional *Ab Urbe Condita* conversion for CE, BCE, and astronomical years.
- **Classical Latin Parser**: Robust parser recognizing arbitrary Latin expressions (e.g. `a.d. IV Id. Mart. 710 AUC`, `Idibus Martiis Cicerone coss.`) with calendar validation.
- **Fasti Consulares (509 BCE–541 CE)**: Historical catalog of Roman Consuls with Latin ablative absolute (`coss.`) formatting and searching (full catalog via `./consuls`, with landmark years in core).
- **Lossless Round-Trips**: `Tempo.roman.fromClassical()` maps any classical date back to its exact calendar day.
- **Immutable Results**: Every structured result is frozen; zero runtime dependencies beyond Tempo.

---

## Installation & Import Paths

```bash
npm install @magmacomputing/tempo-plugin-roman
```

### Choose Your Import Path

| Import Path | Minified Size | What's Included |
| :--- | :--- | :--- |
| `import '@magmacomputing/tempo-plugin-roman/install'` | **~15 KB** | Full Roman calendar arithmetic, Latin phrasing/parsing, AUC conversions, and ~20 landmark consul years (Cicero, Caesar, Brutus, Basilius). Auto-installs plugin. |
| `import '@magmacomputing/tempo-plugin-roman/consuls'` | **~70 KB** | Batteries-included: full Roman calendar plugin + complete **1,050-year Fasti consulares** catalog (509 BCE–541 CE). Auto-installs plugin in one import. |
| `import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman'` | **~15 KB** | Core plugin definition for explicit installation via `Tempo.use(RomanPlugin)`. |

---

## Quickstart

<PluginRepl plugin="roman" />

### Option A: Lean Core Plugin (Zero-Boilerplate)

```typescript
import '@magmacomputing/tempo-plugin-roman/install';
import { Tempo } from '@magmacomputing/tempo';

// 1. Compute classical Roman date and Latin phrasing
const today = new Tempo('2026-10-16');
const classical = today.toRomanClassical();

console.log(`Roman Date: ${classical.latin}`);      // "ante diem XVII Kalendas Novembres"
console.log(`Abbreviated: ${classical.shortLatin}`);// "a.d. XVII Kal. Nov."
console.log(`Anchor: ${classical.anchor}`);         // "Kalends"
console.log(`Year AUC: ${today.auc} AUC`);          // 2779 AUC

// 2. Ides of March (44 BCE = astronomical year -43)
const idesOfMarch = new Tempo('-000043-03-15');
console.log(idesOfMarch.toRomanClassical().latin);  // "Idibus Martiis"
console.log(idesOfMarch.toAUC());                   // 710 (AUC)
console.log(idesOfMarch.consuls);                  // "C. Julio Caesare V, M. Antonio coss."

// 3. Leap year bissextile day (February 24 in a leap year)
const leapDay = new Tempo('2024-02-24');
console.log(leapDay.toRomanClassical().latin);      // "ante diem bis sextum Kalendas Martias"
console.log(leapDay.toRomanClassical().shortLatin); // "a.d. bis VI Kal. Mart."

// 4. Classical Latin Date Parsing
const parsed = Tempo.roman.parse('a.d. IV Id. Mart. 710 AUC');
console.log(parsed.format('{yyyy}-{mm}-{dd}'));     // "-000043-03-12" (March 12, 44 BCE)
```

### Option B: Full Consular Fasti (Single Import)

To access the complete historical Fasti consulares spanning all 1,050 years from 509 BCE through 541 CE:

```typescript
import '@magmacomputing/tempo-plugin-roman/consuls';
import { Tempo } from '@magmacomputing/tempo';

// Auto-installs RomanPlugin AND populates all 1,050 consular years
const trajanYear = new Tempo('0100-01-01');
console.log(trajanYear.consuls);
// "Imp. Caesare Nerva Trajano Augusto III, Sex. Julio Frontino III coss."

console.log(trajanYear.format('{roman:consul}'));
// "Imp. Caesare Nerva Trajano Augusto III, Sex. Julio Frontino III coss."
```

### Option C: Explicit Plugin Registration

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman';

Tempo.use(RomanPlugin);
```

---

## API Reference

### `tempo.toRomanClassical(options?: RomanCalculationOptions): ClassicalRomanDate`
Instance method calculating the complete classical Roman calendar descriptor for the instance date. Returns an immutable, frozen `ClassicalRomanDate` object.

### `tempo.toAUC(): number`
Instance method returning the year reckoned Ab Urbe Condita (AUC).

### `tempo.auc: number`
Getter returning the year in AUC.

### `Tempo.roman.toClassical(date, options?): ClassicalRomanDate`
Static calculation function resolving `Tempo`, native JavaScript `Date`, or plain `{ year, month, day }` objects into a frozen `ClassicalRomanDate`.

### `Tempo.roman.fromClassical(anchor, anchorMonth, anchorYear, relation, count?, isBissextile?, isJulian?): { year, month, day }`
Resolves classical Roman calendar anchor parameters back to modern calendar coordinates.

### `Tempo.roman.parse(input: string, options?: RomanParseOptions): Tempo`
Parses a natural classical Latin date string (e.g. `'a.d. IV Id. Mart. 710 AUC'` or `'Idibus Martiis Cicerone coss.'`) directly into a `Tempo` instance.

### `Tempo.roman.parseDate(input: string, options?: RomanParseOptions): ParsedRomanDate`
Parses a Latin date string into calendar coordinates (`{ year, month, day, auc, classical }`) without constructing an instance.

### `Tempo.roman.getConsuls(year: number): readonly string[] | undefined`
Retrieves the eponymous Roman consuls for an astronomical year from the Fasti consulares (509 BCE–541 CE).

### `Tempo.roman.formatConsuls(year: number, style?: 'ablative' | 'nominative'): string | undefined`
Renders the eponymous consuls into a classical Latin dating formula (e.g. `"M. Tullio Cicerone, C. Antonio Hybrida coss."`).

### `Tempo.roman.findConsuls(query: string): ConsularPair[]`
Performs a substring search against the Fasti consulares and returns matching years and names.

### `Tempo.roman.yearToAuc(year: number, era?: 'CE' | 'BCE'): number`
Converts an astronomical year (or positive BCE year with explicit era) into AUC.

### `Tempo.roman.aucToYear(auc: number, format?: 'astronomical' | 'historical')`
Converts an AUC year into an astronomical integer or `{ year, era: 'CE' | 'BCE' }`.

### `Tempo.roman.getNonesDay(month: number): number`
Returns 7 for MOM-J months (March, October, May, July) and 5 for all other months.

### `Tempo.roman.getIdesDay(month: number): number`
Returns 15 for MOM-J months (March, October, May, July) and 13 for all other months.

### `Tempo.roman.isLeapYear(year: number, isJulian?: boolean): boolean`
Evaluates leap year status under Gregorian or Julian calendar rules.

---

## Topic Guides

- [Classical Fasti & Lunar Anchors](./calendar-mechanics.md) - Kalends, Nones, Ides, inclusive backward counting, bissextile intercalation, and AUC conversion mathematics.
- [Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md) - Epigraphy, numismatics, archival cataloging, and manuscript dating workflows.

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
