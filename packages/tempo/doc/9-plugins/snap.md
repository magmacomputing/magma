![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-snap

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-snap?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-snap/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-snap?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap)

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides robust time rounding and snapping functionality (e.g., snapping to the nearest 15 minutes or 1 hour block) for calendar and scheduling applications.

By default, the plugin effortlessly snaps dates to a configurable minute-interval. This is particularly useful when building UI components like time-pickers, ensuring data boundaries align perfectly with application logic.

### 💡 User Notes: Why Sub-Second Snapping?
While `hours` and `minutes` cover most UI use cases, sub-second precision (`ms`, `us`, `ns`) is invaluable for:
1. **Telemetry & Log Aggregation**: Snapping high-frequency jittery timestamps to the nearest `100ms` or `500ms` bucket for cleaner charts and analysis.
2. **Video & Audio Synchronization**: Multimedia frame rates require precise timing. Snap to the nearest `16ms` (approx 60fps) or `40ms` (25fps) to align data points with visual boundaries.
3. **Database & API Normalization**: Truncating or snapping Tempo's native nanosecond precision to the nearest `ms` before sending payloads ensures your local application state perfectly matches remote databases that don't support microseconds.
4. **Performance Benchmarking**: Grouping execution times into buckets (e.g., nearest `10ms`) for histograms.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-snap
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

// Pass the plugin to `Tempo.init` to register it into the runtime.
Tempo.init({ 
  plugins: [SnapPlugin] 
});

const t = new Tempo('2026-06-01T14:08:00Z');

// Snaps to the nearest 15 minutes by default
const snapped = t.snap();
console.log(snapped.format('{hh}:{mi}')); // "14:15"

// Or explicitly provide units and intervals
const snapHour = t.snap({ hh: 1 });
const snapSecond = t.snap({ ss: 30 });
const snapMs = t.snap({ ms: 100 });

// Force snapping direction instead of standard rounding
const snapUp = t.snap({ mi: 15, direction: 'up' });
const snapDown = t.snap({ mi: 15, direction: 'down' });
```

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
