![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-astro

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-astro/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that calculates exact astronomical seasons (Equinoxes and Solstices via `t.term.astro`, `t.term.astronomy`, `t.term.equinox`, `t.term.solstice`) using the **Jean Meeus polynomial algorithm**. 

> [!NOTE]
> **Mean-Polynomial Approximation (Ch. 27)**
> This plugin specifically implements the mean-polynomial calculation from Chapter 27 of Meeus' *Astronomical Algorithms*. To keep the library extremely lightweight, it omits the massive periodic correction tables required for exact apparent calculations. It is strictly enforced to support the mathematical range of **-1000 to +3000 AD**.

Because these are true astronomical calculations, the plugin precisely determines solar solstice and equinox boundaries. It is also **hemisphere-aware**: by configuring your Tempo instance with a `sphere` (e.g., `sphere: 'south'`), the plugin accurately flips the Vernal Equinox from Spring to Autumn.

::: info Meteorological vs Astronomical
Unlike Tempo's built-in **Meteorological** `season` Term — which rigidly snaps to the 1st day of calendar months — this **Astronomical** plugin calculates the dynamic, true solar boundaries.
:::

## Installation

```bash
npm install @magmacomputing/tempo-plugin-astro
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro'; // Auto-registers Astro terms!

const t = new Tempo('2026-03-20', { sphere: 'north' });

// Get the Astronomical Event key ('vernal', 'summer', 'autumnal', 'winter')
console.log(t.term.astro);
// Output: 'vernal'

// Query via aliases
console.log(t.term.equinox);  // 'vernal' or 'autumnal'
console.log(t.term.solstice); // 'summer' or 'winter'

// Get full Astronomical metadata
console.log(t.term.astronomy);
// Output: { key: 'Vernal', season: 'Spring', event: 'Equinox', sphere: 'north', ... }
```

### Response Payload

#### Astronomical Seasons (`t.term.astronomy`)

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
  second: 0,
  start: <Tempo start of season>,
  end: <Tempo end of season>
}
```

::: tip Did you know?
**Seasons:** `t.term.astronomy.season` returns the *Astronomical* season calculated by the precise timing of solstices and equinoxes. This will often differ from `t.term.season.key` in the core library, which uses standard Meteorological/Civil calendar boundaries (e.g., 1st of the month).
For real-time solar daylight/twilight, lunar phase, and tidal tracking, install `@magmacomputing/tempo-plugin-celestial`.
:::

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
