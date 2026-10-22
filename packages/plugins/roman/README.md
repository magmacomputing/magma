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

## 🚀 Quick Start

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman';

// 1. Install the plugin
Tempo.use(RomanPlugin);

// 2. Compute classical Roman date and Latin phrasing
const t = new Tempo('2026-10-16');
const roman = t.toRomanClassical();

console.log(roman.latin);      // "ante diem XVII Kalendas Novembres"
console.log(roman.shortLatin); // "a.d. XVII Kal. Nov."
console.log(roman.anchor);     // "Kalends"
console.log(roman.count);      // 17
console.log(roman.auc);        // 2779

// 3. Ides of March (44 BCE = astronomical year -43)
const idesOfMarch = new Tempo('-000043-03-15');
console.log(idesOfMarch.toRomanClassical().latin); // "Idibus Martiis"
console.log(idesOfMarch.toAUC());                  // 710 (AUC)

// 4. Leap year bissextile day (February 24 in leap year)
const leapDay = new Tempo('2024-02-24');
console.log(leapDay.toRomanClassical().latin); // "ante diem bis sextum Kalendas Martias"
console.log(leapDay.toRomanClassical().shortLatin); // "a.d. bis VI Kal. Mart."
```

Or use the zero-boilerplate side-effect import:

```typescript
import '@magmacomputing/tempo-plugin-roman/install';
import { Tempo } from '@magmacomputing/tempo';

console.log(new Tempo('2026-03-15').toRomanClassical().latin); // "Idibus Martiis"
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
```

---

## 📜 License

MIT © [Magma Computing](https://github.com/magmacomputing)
