![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-astro

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-astro/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides precise astronomical events (Equinoxes and Solstices) and lunar cycle calculations (`t.term.moon`, `t.term.lunar`), with automatic hemisphere adjustment based on your configured `sphere`.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html)**

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

// Get the current Moon Phase key
console.log(t.term.moon);
// Output: 'waxing-crescent'

// Get detailed Lunar cycle metadata
console.log(t.term.lunar);
// Output: { key: 'waxing-crescent', phase: 'Waxing Crescent', illumination: 0.23, ageDays: 4.1, isWaxing: true, emoji: '🌒', ... }
```

### Response Payload

#### Astronomical Seasons (`t.term.astronomy`)
When resolving the `astro` / `astronomy` term, the plugin intelligently returns the correct astronomical event, traditional season, and range boundaries based on your configured hemisphere (`sphere`):

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
  start: <Tempo start of season>,
  end: <Tempo end of season>
}
```

#### Lunar Phases (`t.term.lunar`)
Resolving `t.term.lunar` provides rich synodic cycle metadata, human-readable phase names, and phase range boundaries:

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

> **Did you know?**
> `t.term.astronomy.season` returns the *Astronomical* season calculated by the precise timing of solstices and equinoxes. This will often differ from `t.term.season` in the core library, which uses standard Meteorological/Civil calendar boundaries (e.g., 1st of the month).

## Documentation

For full API reference, advanced configuration, and detailed explanations of the astronomical calculations, please visit the official **[Astro Plugin Documentation ↗](https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
