![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-astro

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-astro/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-astro"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-astro?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides precise astronomical events (Equinoxes and Solstices via `t.term.astro`, `t.term.astronomy`, `t.term.equinox`, `t.term.solstice`), with automatic hemisphere adjustment based on your configured `sphere`.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-astro
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro'; // Auto-registers Astro terms!

const t = new Tempo('2026-03-20', { sphere: 'north' });

// Get the Astronomical Event key ('Vernal', 'Summer', 'Autumnal', 'Winter')
console.log(t.term.astro);
// Output: 'Vernal'

// Query via aliases
console.log(t.term.equinox);  // 'Vernal' or 'Autumnal'
console.log(t.term.solstice); // 'Summer' or 'Winter'

// Get detailed Astronomical metadata
console.log(t.term.astronomy);
// Output: { key: 'Vernal', season: 'Spring', event: 'Equinox', sphere: 'north', ... }
```

### Response Payload

#### Astronomical Seasons (`t.term.astronomy`)
When resolving the `astro` / `astronomy` / `equinox` / `solstice` terms, the plugin intelligently returns the correct astronomical event, traditional season, and range boundaries based on your configured hemisphere (`sphere`):

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

> **Did you know?**
> `t.term.astronomy.season` returns the *Astronomical* season calculated by the precise timing of solstices and equinoxes. This will often differ from `t.term.season` in the core library, which uses standard Meteorological/Civil calendar boundaries (e.g., 1st of the month).
> For real-time solar daylight/twilight, lunar phase, and tidal tracking, install `@magmacomputing/tempo-plugin-celestial`.

## Documentation

For full API reference, advanced configuration, and detailed explanations of the astronomical calculations, please visit the official **[Astro Plugin Documentation ↗](https://magmacomputing.github.io/magma/doc/9-plugins/astro.index.html)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
