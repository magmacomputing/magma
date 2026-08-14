# `scheduleAI` — Intelligent Appointment Booking & Conflict Resolution

`scheduleAI()` provides automated slot booking, calendar conflict detection, working hour verification, and iterative slot bumping. It evaluates a natural language booking request (e.g. *"45 min sync next Wednesday afternoon"*) alongside a list of existing busy intervals and working hours to find the best available appointment slots.

---

## Basic Usage

```typescript
import { scheduleAI, initAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize provider
await initAI({
  providers: [{ id: 'groq', key: process.env.GROQ_API_KEY }]
});

// 2. Schedule a meeting avoiding team standups
const booking = await scheduleAI("45 min sync next Wednesday afternoon", {
  anchor: "2026-08-10 09:00",
  timeZone: "America/New_York",
  events: [
    { start: "2026-08-12 14:00", end: "2026-08-12 15:00", title: "Team standup" }
  ],
  workingHours: { start: "09:00", end: "17:00" } // only match New York business hours
});

console.log(booking.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')); // 2026-08-12 15:00
console.log(booking.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}'));   // 2026-08-12 15:45
console.log(booking.durationMinutes);                            // 45
console.log(booking.ai?.conflictBumped);                         // true (pushed past team standup)
```

---

## Configuration Options (`TempoScheduleOptions`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`anchor`** | `TempoDateInput` | Anchor reference time to evaluate relative dates from. Defaults to workstation/browser current time. |
| **`events`** | `TempoInterval[]` | A list of existing busy calendar intervals that the meeting must not overlap with. |
| **`workingHours`** | `TempoWorkingHours` | Daily time window constraint (HH:MM formats) inside which slots must fit. |
| **`timeZone`** | `string` | Target IANA timezone to calculate the booking slot and boundaries within. |
| **`minConfidence`**| `number` | Minimum confidence score threshold (0.0 to 1.0) required to return a valid slot. |
| **`mode`** | `AiMode` | Concurrency routing strategy (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`). Refer to the [Multi-Provider Execution Modes Guide](./modes.md). |

### `TempoInterval` Interface
```typescript
interface TempoInterval {
  start: TempoDateInput;
  end: TempoDateInput;
  title?: string;
}
```

---

## Result Schema (`TempoScheduleResult`)

```typescript
export interface TempoScheduleResult {
  /** The calculated start timestamp of the selected slot */
  start: Tempo;
  
  /** The calculated end timestamp of the selected slot */
  end: Tempo;
  
  /** The resolved slot represented as a Tempo Interval object */
  slot: Interval<Tempo>;
  
  /** The duration of the resolved meeting in minutes */
  durationMinutes: number;
  
  /** Alternative available slot intervals that also satisfy all constraints */
  alternatives: Interval<Tempo>[];
  
  /** Metadata on the AI resolution process */
  ai?: {
    provider: string;
    confidence: number;
    conflictBumped: boolean; // True if the slot was pushed/bumped to avoid a busyEvent conflict
    reasoning?: string;
  };
}
```

---

## Internal Conflict Bumping Engine

When an LLM proposes a slot (like Wednesday at 2:00 PM), `scheduleAI` doesn't just trust it blindly. It runs a deterministic check using Tempo's native `Interval.overlaps()` method against your `events` list:
1. If the proposed slot overlaps with any busy event, the engine shifts (bumps) the slot forward iteratively.
2. It re-verifies the new slot against all other busy events and working hours constraints.
3. If it successfully lands on a free spot, it marks `ai.conflictBumped: true`.
4. If no free spot can be found within the proposed date frame, it returns a failed interval with low confidence.

This decoupled architecture ensures that the LLM is used for parsing intent (finding the duration and preferred time slot) while Tempo's math engine handles the strict conflict prevention.
