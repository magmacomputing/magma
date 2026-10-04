![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-snap

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-snap?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-snap/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-snap?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides robust time rounding and interval snapping functionality across standard time components (`hours`, `minutes`, `seconds`, `milliseconds`, `microseconds`, and `nanoseconds`).

By default, the plugin effortlessly snaps dates to a configurable minute-interval. This is invaluable when building UI components like time-pickers and calendar grids, downsampling telemetry streams, or aligning timestamps to multimedia frame boundaries.

---

## 🚀 Installation & Quickstart

```bash
npm install @magmacomputing/tempo-plugin-snap
```

<PluginRepl plugin="snap" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

Tempo.use(SnapPlugin);

const t = new Tempo('2026-06-01T14:08:00Z');

// Snaps to the nearest 15 minutes by default
const snapped = t.snap();
console.log(snapped.format('{hh}:{mi}')); // "14:15"

// Or explicitly provide units and intervals
const snapHour   = t.snap({ hh: 1 });
const snapSecond = t.snap({ ss: 30 });
const snapMs     = t.snap({ ms: 100 });

// Directional snapping (floor vs ceiling)
const snapUp   = t.snap({ mi: 15, direction: 'up' });   // 14:15
const snapDown = t.snap({ mi: 15, direction: 'down' }); // 14:00
```

### Zero-Boilerplate Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-snap/install';

const t = new Tempo('2026-06-01T14:08:00Z');
console.log(t.snap().format('{hh}:{mi}')); // "14:15"
```

---

## 📚 API Surface Catalog

The Snap plugin extends `Tempo.prototype` with a fluent, immutable `snap()` method:

| Method | Target | Options Argument | Returns | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`t.snap(options?)`** | Instance | `SnapOptions?: OneKey<SnapKey, number> & { direction?: 'up' \| 'down' }` | `Tempo` | Returns a **new** Tempo instance rounded to the nearest interval of the specified time unit. Sub-units are cleared to zero. |

### Supported Units (`SnapKey`)

The options object accepts exactly one time component mapped to a numeric step:

| Unit Key | Long Aliases | Description | Example |
| :--- | :--- | :--- | :--- |
| `'hh'` | `'hour'`, `'hours'` | Snaps to hour interval (e.g. nearest 1, 2, or 4 hours) | `t.snap({ hh: 1 })` |
| `'mi'` | `'minute'`, `'minutes'` | Snaps to minute interval (default: `15`) | `t.snap({ mi: 15 })` |
| `'ss'` | `'second'`, `'seconds'` | Snaps to second interval (e.g. 10s, 30s) | `t.snap({ ss: 30 })` |
| `'ms'` | `'millisecond'`, `'milliseconds'` | Snaps to millisecond interval | `t.snap({ ms: 50 })` |
| `'us'` | `'microsecond'`, `'microseconds'` | Snaps to microsecond interval | `t.snap({ us: 500 })` |
| `'ns'` | `'nanosecond'`, `'nanoseconds'` | Snaps to nanosecond interval | `t.snap({ ns: 1000 })` |

> [!NOTE]
> **Time Components Only**: Date units (`days`, `months`, `years`) are strictly disallowed in `snap()`. For calendar date manipulation, use Tempo core's native `.startOf('month')`, `.startOf('week')`, or `.add({ days: 1 })`.

---

## 📖 Architecture & Specialized Guides

- **[Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md)**: Interactive calendar UI scheduling grids (15m/30m drop slots), InfluxDB/Prometheus telemetry downsampling buckets, and 60fps/25fps multimedia frame boundary snapping.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
