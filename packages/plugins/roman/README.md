# @magmacomputing/tempo-plugin-roman

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-roman"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-roman?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-roman/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-roman"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-roman?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, zero-dependency Tempo community plugin providing **classical Roman calendar arithmetic** (*Kalends*, *Nones*, *Ides*, *Ante Diem*), **leap year bissextile handling**, and **AUC (*Ab Urbe Condita*) year conversions**.

---

## ⚡ Classical Roman Calendar Mechanics

Ancient Roman timekeeping operated backwards from three lunar anchor points:
- **Kalends** (*Kalendae*): 1st of every month.
- **Nones** (*Nonae*): 7th in "MOM-J" months (March, October, May, July); 5th in all others.
- **Ides** (*Idus*): 15th in "MOM-J" months; 13th in all others.
- **Pridie**: The day immediately preceding an anchor (e.g. *Pridie Idus Octobres* = October 14).
- **Ante Diem**: Inclusive backward counting from an anchor (e.g. *Ante diem XVII Kalendas Novembres* = October 16).
- **Bissextile Day**: Doubling of the 6th day before the March Kalends (*ante diem bis sextum Kalendas Martias*, February 24 in leap years).
- **AUC (*Ab Urbe Condita*)**: Years reckoned from the traditional founding of Rome in 753 BCE ($2026 \text{ CE} \implies 2779 \text{ AUC}$, $44 \text{ BCE} \implies 710 \text{ AUC}$).

---

## 📦 Installation

```bash
npm install @magmacomputing/tempo-plugin-roman
```

---

## 📦 Import Paths & Bundle Options

Choose the import path that best fits your application's size and feature requirements:

| Import Path | Minified Size | What's Included |
| :--- | :--- | :--- |
| `import '@magmacomputing/tempo-plugin-roman/install'` | **~15 KB** | Full Roman calendar arithmetic, Latin phrasing/parsing, AUC conversions, and ~20 landmark consul years (Cicero, Caesar, Brutus, Basilius). Auto-installs plugin. |
| `import '@magmacomputing/tempo-plugin-roman/consuls'` | **~70 KB** | Batteries-included: full Roman calendar plugin + complete **1,050-year Fasti consulares** catalog (509 BCE–541 CE). Auto-installs plugin in one import. |
| `import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman'` | **~15 KB** | Core plugin definition for explicit installation via `Tempo.use(RomanPlugin)`. |

---

## 🚀 Quick Start

### Option A: Lean Core Plugin (Zero-Boilerplate)

```typescript
import '@magmacomputing/tempo-plugin-roman/install';
import { Tempo } from '@magmacomputing/tempo';

// 1. Classical Roman calendar arithmetic & Latin phrasing
const t = new Tempo('2026-10-16');
const roman = t.toRomanClassical();
console.log(roman.latin);      // "ante diem XVII Kalendas Novembres"
console.log(roman.shortLatin); // "a.d. XVII Kal. Nov."
console.log(roman.auc);        // 2779 (AUC)

// 2. Ides of March (44 BCE = astronomical year -43)
const idesOfMarch = new Tempo('-000043-03-15');
console.log(idesOfMarch.toRomanClassical().latin); // "Idibus Martiis"
console.log(idesOfMarch.consuls);                  // "C. Julio Caesare V, M. Antonio coss."

// 3. Leap year bissextile day (February 24 in leap year)
const leapDay = new Tempo('2024-02-24');
console.log(leapDay.toRomanClassical().latin); // "ante diem bis sextum Kalendas Martias"
```

### Option B: Full Consular Catalog (Single Import)

If you need the entire historical Fasti covering all 1,050 years from 509 BCE through 541 CE:

```typescript
import '@magmacomputing/tempo-plugin-roman/consuls';
import { Tempo } from '@magmacomputing/tempo';

// Resolves any year across the Republic and Empire
const trajan = new Tempo('0100-01-01');
console.log(trajan.consuls);
// "Imp. Caesare Nerva Trajano Augusto III, Sex. Julio Frontino III coss."
```

### Option C: Explicit Installation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman';

Tempo.use(RomanPlugin);
```

---

## 📖 Static Utilities (`Tempo.roman`)

The plugin exposes pure calculation functions directly under `Tempo.roman`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-roman/install';

// AUC Conversion
Tempo.roman.yearToAuc(2026);              // 2779
Tempo.roman.yearToAuc(44, 'BCE');         // 710
Tempo.roman.aucToYear(710, 'historical'); // { year: 44, era: 'BCE' }

// Round-trip Gregorian from Roman anchor
const date = Tempo.roman.fromClassical('Kalends', 11, 2026, 'ante_diem', 17);
console.log(date); // { year: 2026, month: 10, day: 16 }

// Consular dating formula (landmark seed table available by default)
const cicero = new Tempo('-000062-03-15');
console.log(cicero.consuls); // "M. Tullio Cicerone, C. Antonio Hybrida coss."
```

---

## 📜 License

MIT © [Magma Computing](https://github.com/magmacomputing)
