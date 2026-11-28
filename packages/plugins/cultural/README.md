# @tempo-kit/plugin-cultural

Traditional and cultural calendar Terms for [`tempo-kit`](https://www.npmjs.com/package/tempo-kit): **Western Tropical Zodiac** (`ZodiacTerm`) and **East Asian Sexagenary Lunar Zodiac** (`EasternTerm`) with regional variants.

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
import { Tempo } from 'tempo-kit';
import { ZodiacTerm } from '@tempo-kit/plugin-cultural/zodiac';
import { EasternTerm } from '@tempo-kit/plugin-cultural/eastern';

Tempo.use([ZodiacTerm, EasternTerm]);
```

## License

MIT
