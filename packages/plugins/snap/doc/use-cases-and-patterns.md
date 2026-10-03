<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-snap</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

This guide demonstrates how `@magmacomputing/tempo-plugin-snap` provides deterministic time boundary alignment across calendar user interfaces, high-frequency telemetry downsampling, and multimedia synchronization pipelines.

---

## 1. Interactive Calendar Drag-and-Drop Grid Snapping

### Problem Statement
In scheduling platforms (e.g. Google Calendar, Calendly, Acuity), user mouse drag events and touch gestures emit unrounded timestamp coordinates (e.g. `14:08:22`). Appointment booking systems require appointments to snap to clean 15-minute or 30-minute block boundaries without creating awkward overlapping gaps.

### Architectural Solution
Use `t.snap({ mi: 15, direction: 'down' })` to establish the slot start boundary and calculate slot duration intervals. The deterministic floor/ceil behavior guarantees grid alignment regardless of mouse position.

```
Pointer Coordinate: 14:08:22
         │
         ├─── direction: 'down' ───► Slot Start: 14:00:00
         │
         └─── + 30m Duration    ───► Slot End:   14:30:00
```

### Production Implementation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

Tempo.use(SnapPlugin);

export interface AppointmentSlot {
  start: Tempo;
  end: Tempo;
  label: string;
}

/**
 * Resolves raw mouse-drop timestamp into an aligned calendar slot.
 */
export function resolveCalendarSlot(rawDropTime: Tempo, durationMinutes = 30): AppointmentSlot {
  // 1. Floor to current 15-minute grid slot
  const start = rawDropTime.snap({ mi: 15, direction: 'down' });

  // 2. Add requested meeting duration
  const end = start.add({ minutes: durationMinutes });

  return {
    start,
    end,
    label: `${start.format('{hh}:{mi}')} - ${end.format('{hh}:{mi}')}`
  };
}

// User clicks/drags at 14:08:22
const rawClick = new Tempo('2026-06-01T14:08:22Z');
const slot = resolveCalendarSlot(rawClick, 30);

console.log(slot.start.format('{hh}:{mi}')); // "14:00"
console.log(slot.end.format('{hh}:{mi}'));   // "14:30"
console.log(slot.label);                     // "14:00 - 14:30"
```

---

## 2. High-Frequency Metric Telemetry Downsampling (InfluxDB / Prometheus)

### Problem Statement
Distributed microservices, IoT sensors, and load balancers emit millions of high-frequency events with microsecond jitter (e.g. `14:08:22.450123Z`). Storing or graphing raw individual points overwhelms dashboard databases. Aggregating metrics into fixed time-series buckets (e.g. 10-second or 1-minute tumbling windows) requires normalizing event timestamps before insertion into time-series tables.

### Architectural Solution
Downsample raw event timestamps to fixed second or minute boundaries using `t.snap({ ss: 10, direction: 'down' })`. This assigns every sample within the interval to the identical bucket key in constant $O(1)$ time without database grouping overhead.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

Tempo.use(SnapPlugin);

interface TelemetryPoint {
  sensorId: string;
  temperature: number;
  timestamp: string; // ISO string
}

export class MetricBucketAggregator {
  private buckets = new Map<string, number[]>();

  /**
   * Ingests a raw sample and groups it into a 10-second tumbling bucket.
   */
  ingest(point: TelemetryPoint) {
    const rawTime = new Tempo(point.timestamp);

    // Floor to nearest 10-second bucket
    const bucketKey = rawTime.snap({ ss: 10, direction: 'down' }).format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}Z');

    const list = this.buckets.get(bucketKey) ?? [];
    list.push(point.temperature);
    this.buckets.set(bucketKey, list);
  }

  getAverages(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [bucket, values] of this.buckets.entries()) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      result[bucket] = Number(avg.toFixed(2));
    }
    return result;
  }
}

// Execution with jittery timestamps
const aggregator = new MetricBucketAggregator();

aggregator.ingest({ sensorId: 'temp-1', temperature: 21.4, timestamp: '2026-06-01T14:08:22.450Z' });
aggregator.ingest({ sensorId: 'temp-1', temperature: 21.8, timestamp: '2026-06-01T14:08:27.890Z' });
aggregator.ingest({ sensorId: 'temp-1', temperature: 22.1, timestamp: '2026-06-01T14:08:31.100Z' });

console.log(aggregator.getAverages());
// Output:
// {
//   "2026-06-01T14:08:20Z": 21.60,  // (21.4 + 21.8) / 2
//   "2026-06-01T14:08:30Z": 22.10
// }
```

---

## 3. Multimedia Frame Boundary Alignment (60fps / 25fps)

### Problem Statement
In video editing pipelines, subtitle synchronization engines, and WebAudio processors, cues and animation keys must align with physical display refresh boundaries. At 60 frames per second, each frame lasts approximately `16.67ms` (approx `17ms`), while PAL video runs at `40ms` per frame (25fps). Subtitles or cue points that fall between frame transitions cause screen tearing or missed render intervals.

### Architectural Solution
Use sub-second millisecond snapping (`t.snap({ ms: 17 })` or `t.snap({ ms: 40 })`) to snap arbitrary event times to the nearest physical render frame boundary.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

Tempo.use(SnapPlugin);

/**
 * Aligns video subtitle cue timestamps to 60fps frame boundaries (~17ms per frame).
 */
export function alignToVideoFrame(rawTimestampMs: number, fps: 60 | 25 = 60): Tempo {
  const stepMs = fps === 60 ? 17 : 40;
  const t = new Tempo(rawTimestampMs);

  // Snap to nearest frame boundary
  return t.snap({ ms: stepMs });
}

// Subtitle cue recorded with system clock jitter at 42ms
const rawCue = 42;
const aligned = alignToVideoFrame(rawCue, 60);

console.log('Original ms:', rawCue);      // 42
console.log('Aligned frame ms:', aligned.ms); // 34 (17 * 2 = 34ms frame boundary)
```
