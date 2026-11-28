# Cultural Terms (`@tempo-kit/plugin-cultural`)

The `@tempo-kit/plugin-cultural` plugin provides traditional and cultural calendar Terms for **Tempo**:

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
