![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-astro

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-astro/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that calculates the exact astronomical season (Equinoxes and Solstices) for any date using the **Jean Meeus polynomial algorithm**. 

> [!NOTE]
> **Mean-Polynomial Approximation (Ch. 27)**
> This plugin specifically implements the mean-polynomial calculation from Chapter 27 of Meeus' *Astronomical Algorithms*. To keep the library extremely lightweight, it omits the massive periodic correction tables required for exact apparent calculations. It is strictly enforced to support the mathematical range of **-1000 to +3000 AD**.

Because it is a true astronomical calculation rather than a fixed calendar date, it precisely determines the exact minute the sun crosses the celestial equator. It is also **hemisphere-aware**: by configuring your Tempo instance with a `sphere` (e.g., `sphere: 'south'`), the plugin accurately flips the Vernal Equinox from Spring to Autumn.

::: info Meteorological vs Astronomical
Unlike Tempo's built-in **Meteorological** `season` Term — which rigidly snaps to the 1st day of calendar months — this **Astronomical** plugin calculates the dynamic, true solar boundaries that shift slightly year-over-year.
:::
## Installation

```bash
npm install @magmacomputing/tempo-plugin-astro
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { AstroTerm } from '@magmacomputing/tempo-plugin-astro';

// Pass the plugin to `Tempo.init` to register it into the runtime.
Tempo.init({ 
  extends: [AstroTerm] 
});

const t = new Tempo('2026-03-20');

// Get the Astronomical Event mapping
console.log(t.term.astro);
// Output: 'Vernal'
```

### Response Payload

When resolving the term, the plugin intelligently returns the correct astronomical event and its corresponding traditional season based on your configured hemisphere (`sphere`):

```javascript
{
  key: 'Vernal',     // Flips to 'Autumnal' if sphere is set to 'south'
  season: 'Spring',  // Flips to 'Autumn' if sphere is set to 'south'
  sphere: 'north',   // Flips to 'south' if sphere is set to 'south'
  event: 'Equinox',
  group: 'astronomy',
  year: 2026,
  month: 3,
  day: 20,
  hour: 14,
  minute: 45,
  second: 0
}
```

You can also access the full metadata object containing the sub-second precision fields via the `astronomy` term:

```typescript
console.log(t.term.astronomy);
// Output: { key: 'Vernal', group: 'astronomy', year: 2026, month: 3, day: 20, hour: 14, minute: 45, ... }
```

::: tip Did you know?
**Seasons:** `t.term.astronomy.season` returns the *Astronomical* season calculated by the precise timing of solstices and equinoxes. This will often differ from `t.term.season.key` in the core library, which uses standard Meteorological/Civil calendar boundaries (e.g., 1st of the month).
:::

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
