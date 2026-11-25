![Tempo Plugin](/plugin-logo.svg)

# @tempo-kit/plugin-holidays

<p align="center">
  <a href="https://www.npmjs.com/package/@tempo-kit/plugin-holidays"><img src="https://img.shields.io/npm/v/@tempo-kit/plugin-holidays?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/tempo-kit"><img src="https://img.shields.io/npm/dependency-version/@tempo-kit/plugin-holidays/peer/tempo-kit?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@tempo-kit/plugin-holidays"><img src="https://img.shields.io/npm/l/@tempo-kit/plugin-holidays?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

The **Regional Holidays Plugin** provides bank holiday resolution, weekend observation shifts, SLA working hours calculations, and business day arithmetic for [Tempo](https://github.com/magmacomputing/magma/tree/main/packages/tempo).

---

## Key Features

- **Zero-Latency Built-in Calendars**: Instant synchronous holiday calculation for US, Australia, United Kingdom, Canada, Germany, France, Japan, and New Zealand.
- **`t.geo.country` Resolution Cascade**: Automatically resolves national calendars via explicit option, `tempo.geo.country`, `tempo.intl.info.region`, or BCP-47 `tempo.locale`.
- **Global Long-Tail Coverage (100+ Countries)**: Dynamic async preloading via `tempo-kit-fns` with automatic 24-hour TTL caching in runtime storage.
- **SLA Working Hours Calculation**: `t.holidays.workingHoursUntil(deadline)` calculates business hours between dates, taking into account working hour windows, weekends, and regional holidays.
- **Cultural Weekend Awareness**: Automatically respects cultural workweeks (e.g. Friday/Saturday weekend in Middle Eastern locales like `ar-SA`).

---

## Installation

```bash
npm install @tempo-kit/plugin-holidays
```

---

## Quickstart

<PluginRepl plugin="holidays" />

```typescript
import '@tempo-kit/plugin-holidays/install';
import { Tempo } from 'tempo-kit';

// Australia Day (Jan 26)
const t = new Tempo('2026-01-26', { geo: { country: 'AU' } });

console.log(t.holidays.isHoliday());          // true
console.log(t.holidays.name);                 // 'Australia Day'
console.log(t.holidays.isBusinessDay());      // false

// Advance to next valid business day past holidays & weekends
const nextWorkDay = t.holidays.nextBusinessDay();
console.log(nextWorkDay.format('{yyyy}-{mm}-{dd}')); // '2026-01-27'

// Calculate SLA working hours between dates
const start = new Tempo('2026-01-23 15:00:00', { geo: { country: 'AU' } }); // Friday 3pm
const deadline = new Tempo('2026-01-27 11:00:00', { geo: { country: 'AU' } }); // Tuesday 11am
console.log(start.holidays.workingHoursUntil(deadline)); // 4.0 hours (2h Fri + 0h Sat/Sun/Mon-Holiday + 2h Tue)
```

---

## Topic Guides

- [Business Days & SLA Arithmetic](./business-days.md) - Working day calculations, `addBusinessDays`, `nextBusinessDay`, and `workingHoursUntil`.
- [Regional Calendars & Dynamic Preloading](./regional-calendars.md) - Built-in country rules, state overlays, observation shifts, and async preloading for 100+ countries.
- [Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md) - Multi-tenant SaaS SLA engines, T+2 trade settlement, payroll rolling conventions, and HR leave accounting.

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
