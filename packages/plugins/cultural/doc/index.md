![Tempo Plugin](/plugin-logo.svg)

# @tempo-kit/plugin-cultural

<p align="center">
  <a href="https://www.npmjs.com/package/@tempo-kit/plugin-cultural"><img src="https://img.shields.io/npm/v/@tempo-kit/plugin-cultural?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/tempo-kit"><img src="https://img.shields.io/npm/dependency-version/@tempo-kit/plugin-cultural/peer/tempo-kit?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@tempo-kit/plugin-cultural"><img src="https://img.shields.io/npm/l/@tempo-kit/plugin-cultural?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight Tempo community plugin providing traditional and cultural calendar Terms:

- **`ZodiacTerm`** (`#zdc`, `#zodiac`, `#sunSign`, `#starSign`) — Western Tropical Zodiac signs with symbols, emojis, traits, shorthand navigation, ordinals, and formatting.
- **`EasternTerm`** (`#sign`, `#shengxiao`, `#lunarSign`, `#eastern`) — East Asian Sexagenary Lunar Zodiac cycle with 5 elements, Yin/Yang polarity, and regional variants (`cn`, `jp`, `kr`, `vn`).

## Installation

```bash
npm install tempo-kit @tempo-kit/plugin-cultural
```

## Usage

### Explicit Registration (Recommended)

```typescript
import { Tempo } from 'tempo-kit';
import { CulturalPlugin } from '@tempo-kit/plugin-cultural';

Tempo.use(CulturalPlugin);

const t = new Tempo('2026-04-05');
console.log(t.term.zdc);               // 'Aries'
console.log(t.term.zodiac.emoji);      // '♈'
console.log(t.term.sign);              // 'Horse'
console.log(t.term.shengxiao.element); // 'Fire'
```

### Granular Term Imports

```typescript
import { Tempo } from 'tempo-kit/core';
import { ZodiacTerm } from '@tempo-kit/plugin-cultural/zodiac';
import { EasternTerm } from '@tempo-kit/plugin-cultural/eastern';

Tempo.use([ZodiacTerm, EasternTerm]);
```

### Side-Effect Auto-Registration

```typescript
import '@tempo-kit/plugin-cultural/install';
```

## Guides

- [Use Cases & Production Patterns](./use-cases-and-patterns.md)
