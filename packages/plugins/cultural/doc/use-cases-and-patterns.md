<div class="plugin-eyebrow">
  <a href="./index.html">← @tempo-kit/plugin-cultural</a>
</div>

<br>

# Use Cases & Production Patterns

`@tempo-kit/plugin-cultural` decouples cultural and traditional calendar Terms from `tempo-kit`'s core bundle while providing full Tempo Term capabilities (shorthand navigation, ordinals, formatting tokens, and `.span` progress metrics).

---

## 1. Localized East Asian Zodiac Badges (`cn` / `jp` / `kr` / `vn`)

### The Challenge
East Asian New Year campaigns and localization pipelines share the 12-year zodiac animal cycle (paired with the 5 elements in the 60-year sexagenary cycle), but regional audiences expect localized animal names and characters—such as **Cat (`Mão / Mèo`)** instead of **Rabbit** in Vietnam, **Sheep** instead of **Goat** in Japan/Korea, and **Wild Boar** instead of **Pig** in Japan.

> [!NOTE]
> `EasternTerm` derives its animal, element, and `.span` boundaries (`YYYY-01-01` to `(YYYY+1)-01-01`) from the **Gregorian calendar year** (`t.yy`), not the lunisolar New Year boundary. Dates in January or early February prior to Lunar New Year will resolve to that Gregorian year's sign.

### Implementation Pattern

```typescript
import { Tempo } from 'tempo-kit';
import { EasternTerm } from '@tempo-kit/plugin-cultural/eastern';

Tempo.use(EasternTerm);

const jpDate = new Tempo('2019-06-01', { locale: 'ja-JP' });
console.log(jpDate.term.sign);                     // 'Wild Boar'
console.log(jpDate.term.shengxiao.emoji);          // '🐗'
console.log(jpDate.term.shengxiao.variants.jp);    // { animal: 'Wild Boar', emoji: '🐗', character: '亥', romanized: 'Inoshishi' }

const vnDate = new Tempo('2023-06-01', { locale: 'vi-VN' });
console.log(vnDate.term.sign);                     // 'Cat'
console.log(vnDate.term.shengxiao.variants.vn);    // { animal: 'Cat', emoji: '🐈', character: 'Mão / Mèo' }
```

---

## 2. Western Tropical Zodiac Navigation & Formatting

### The Challenge
Lifestyle, editorial, and social platforms often need to compute sign transitions, render formatted badges, or jump to the start of an astrological window without hardcoding month/day lookup tables.

### Implementation Pattern

```typescript
import { Tempo } from 'tempo-kit';
import { ZodiacTerm } from '@tempo-kit/plugin-cultural/zodiac';

Tempo.use(ZodiacTerm);

const t = new Tempo('2026-04-05');
console.log(t.format('{#zdc.emoji} {#zdc} ({#zdc.symbol})')); // '♈ Aries (Ram)'
console.log(t.term.zodiac.span.start.format('{yyyy}-{mm}-{dd}')); // '2026-03-21'

// Jump to the next sign boundary
const nextTaurus = t.set('#zdc.>taurus');
console.log(nextTaurus.format('{yyyy}-{mm}-{dd}')); // '2026-04-20'
```
