# @tempo-kit/plugin-cultural

<p align="center">
  <a href="https://www.npmjs.com/package/@tempo-kit/plugin-cultural"><img src="https://img.shields.io/npm/v/@tempo-kit/plugin-cultural?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/tempo-kit"><img src="https://img.shields.io/npm/dependency-version/@tempo-kit/plugin-cultural/peer/tempo-kit?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@tempo-kit/plugin-cultural"><img src="https://img.shields.io/npm/l/@tempo-kit/plugin-cultural?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/cultural.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

Traditional and cultural calendar Terms for [`tempo-kit`](https://www.npmjs.com/package/tempo-kit): **Western Tropical Zodiac** (`ZodiacTerm`) and **East Asian Sexagenary Lunar Zodiac** (`EasternTerm`) with regional variants (`cn`, `jp`, `kr`, `vn`).

## Installation

```bash
npm install tempo-kit @tempo-kit/plugin-cultural
```

## Quick Start

```typescript
import { Tempo } from 'tempo-kit';
import { CulturalPlugin } from '@tempo-kit/plugin-cultural';

Tempo.use(CulturalPlugin);

const t = new Tempo('2026-04-05');
t.term.zdc;                 // 'Aries'
t.term.zodiac.emoji;        // '♈'
t.term.sign;                // 'Horse'
t.term.shengxiao.element;   // 'Fire'
t.format('{#zdc.emoji} {#zdc} • {#sign.emoji} {#sign.element} {#sign}');
```

Or import individual terms or auto-register via `./install`:

```typescript
import '@tempo-kit/plugin-cultural/install';
```

```typescript
import { Tempo } from 'tempo-kit/core';
import { ZodiacTerm } from '@tempo-kit/plugin-cultural/zodiac';
import { EasternTerm } from '@tempo-kit/plugin-cultural/eastern';

Tempo.use([ZodiacTerm, EasternTerm]);
```

## License

MIT
