![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-astro

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-astro/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that calculates exact astronomical seasons (Equinoxes and Solstices) using the **Jean Meeus polynomial algorithm** and computes real-time lunar cycle phases (`t.term.moon`, `t.term.lunar`). 

> [!NOTE]
> **Mean-Polynomial Approximation (Ch. 27)**
> This plugin specifically implements the mean-polynomial calculation from Chapter 27 of Meeus' *Astronomical Algorithms*. To keep the library extremely lightweight, it omits the massive periodic correction tables required for exact apparent calculations. It is strictly enforced to support the mathematical range of **-1000 to +3000 AD**.

Because these are true astronomical calculations, the plugin precisely determines solar boundaries and lunar synodic month progress (~29.53 days). It is also **hemisphere-aware**: by configuring your Tempo instance with a `sphere` (e.g., `sphere: 'south'`), the plugin accurately flips the Vernal Equinox from Spring to Autumn, and flips moon phase emoji shapes (`🌘` vs `🌒`) to mirror how observers view the moon in southern night skies.

::: info Meteorological vs Astronomical
Unlike Tempo's built-in **Meteorological** `season` Term — which rigidly snaps to the 1st day of calendar months — this **Astronomical** plugin calculates the dynamic, true solar and lunar boundaries.
:::

## Installation

```bash
npm install @magmacomputing/tempo-plugin-astro
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro'; // Auto-registers Astro & Lunar terms!

const t = new Tempo('2026-03-20');

// Get the Astronomical Event mapping
console.log(t.term.astro);
// Output: 'Vernal'

// Get current Moon Phase key
console.log(t.term.moon);
// Output: 'waxing-crescent'

// Get full Lunar cycle metadata
console.log(t.term.lunar);
// Output: { key: 'waxing-crescent', phase: 'Waxing Crescent', illumination: 0.23, ageDays: 4.1, isWaxing: true, emoji: '🌒', ... }
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

#### Lunar Phases (`t.term.lunar`)

```javascript
{
  key: 'full-moon',   // Short machine-friendly key ('full-moon', 'new-moon', etc.)
  phase: 'Full Moon', // Human-readable phase title
  index: 5,           // 1-based phase step index (1: New Moon ... 5: Full Moon ... 8: Waning Crescent)
  illumination: 0.98,
  ageDays: 14.8,
  isWaxing: false,
  emoji: '🌕',         // Emojis adjust for sphere: 'south' vs 'north' (undefined if sphere is omitted)
  group: 'lunar',
  start: <Tempo start of phase>,
  end: <Tempo end of phase>
}
```

::: tip Did you know?
**Seasons:** `t.term.astronomy.season` returns the *Astronomical* season calculated by the precise timing of solstices and equinoxes. This will often differ from `t.term.season.key` in the core library, which uses standard Meteorological/Civil calendar boundaries (e.g., 1st of the month).
:::

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
