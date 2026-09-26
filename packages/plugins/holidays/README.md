![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-holidays

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-holidays"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-holidays?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-holidays/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-holidays"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-holidays?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/holidays.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

Regional bank holiday, public holiday, and business day SLA scheduling plugin for [Tempo](https://github.com/magmacomputing/magma/tree/main/packages/tempo).

Provides zero-latency synchronous bank holiday resolution for top economies (US, AU, GB, CA, DE, FR, JP, NZ), weekend observation shifts, Easter Computus, and business day arithmetic directly integrated with `t.geo.country`.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-holidays
```

---

## Quick Start

### 1. Fluent OOP Namespace API (Automatic Auto-Install)

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

// Resolves automatically via t.geo.country
const t = new Tempo('2026-01-26', { geo: { country: 'AU' } });

console.log(t.holidays.isHoliday());          // true
console.log(t.holidays.name);                 // 'Australia Day'
console.log(t.holidays.isBusinessDay());      // false

// Advance to next valid business day past holidays & weekends
const nextWorkDay = t.holidays.nextBusinessDay();
console.log(nextWorkDay.format('{yyyy}-{mm}-{dd}')); // '2026-01-27'

// Add N working business days
const deadline = t.holidays.addBusinessDays(5);
console.log(deadline.format('{yyyy}-{mm}-{dd}'));

// Calculate SLA working hours
const start = new Tempo('2026-01-23 15:00:00', { geo: { country: 'AU' } });
const end = new Tempo('2026-01-27 11:00:00', { geo: { country: 'AU' } });
console.log(start.holidays.workingHoursUntil(end)); // 4.0 hours
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=holidays)**

### 2. Pure Tree-Shakeable Functional API

```typescript
import { isPublicHoliday, isBusinessDay, getHolidayName, addBusinessDays, workingHoursBetween } from '@magmacomputing/tempo-plugin-holidays';
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('2026-12-25');

console.log(isPublicHoliday(t, { country: 'US' })); // true
console.log(getHolidayName(t, { country: 'US' }));  // 'Christmas Day'
console.log(isBusinessDay(t, { country: 'US' }));   // false

const fiveDaysLater = addBusinessDays(t, 5, { country: 'US' });
```

---

## Supported Built-in Countries

| Country | Code | Features Supported |
| :--- | :--- | :--- |
| **United States** | `US` | All Federal holidays, floating Mondays, Juneteenth, CA/FL day after Thanksgiving, weekend observation shifts. |
| **Australia** | `AU` | National holidays, state overlays (NSW, VIC, QLD, WA, SA, TAS, ACT, NT), King's Birthday variations, Melbourne Cup, dual Christmas/Boxing Day shifts. |
| **United Kingdom** | `GB` | England & Wales, Scotland (2nd Jan, Summer Bank, St Andrew's), Northern Ireland (St Patrick's, Battle of the Boyne). |
| **Canada** | `CA` | Federal statutory holidays, Victoria Day, Canada Day, Civic Holiday, Truth and Reconciliation Day, Family Day / provincial variations. |
| **Germany** | `DE` | Federal holidays, German Unity Day, Easter floating holidays (Corpus Christi, Ascension, Pentecost), Catholic/Protestant state holidays. |
| **France** | `FR` | National holidays, Bastille Day, Armistice, Victory in Europe, Ascension, Alsace-Moselle overlays (Good Friday, St. Stephen's Day). |
| **Japan** | `JP` | National holidays, Golden Week, Vernal & Autumnal Equinoxes, Mountain Day, Silver Week, Furikae Kyūjitsu (substitute holidays). |
| **New Zealand** | `NZ` | National holidays, Waitangi Day, ANZAC Day, Matariki statutory dates, Mondayisation rules. |

---

## Documentation

📖 **[Read the Official Holidays Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/holidays.index.html)**

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the [MIT License](./LICENSE). No license token is required.
