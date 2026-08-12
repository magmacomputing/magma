# `recurrenceAI` — Recurrence Rules & Schedule Translation

`recurrenceAI()` provides multi-directional translation between natural language repeating schedule descriptions (*"Every 2nd Tuesday of the month at 3pm"*) and RFC 5545 **RRULE strings**, generating paged `Tempo` instance batches on demand.

## Basic Usage

```typescript
import { recurrenceAI, initAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize provider configuration
await initAI({
  providers: [{ id: 'groq', key: process.env.GROQ_API_KEY }]
});

// 2. Natural Language Input (human-in -> RRule & Tempo batches out)
const result = await recurrenceAI("Every 2 weeks on Friday at 9am", {
  locale: 'fr-FR',  // Output localized human summary
  count: 5          // Default batch size
});

console.log(result.rrule);     // "FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;BYHOUR=9"
console.log(result.summary);   // "Chaque 2 semaines le vendredi à 09:00"
console.log(result.isFinite);  // false (recurs indefinitely)
console.log(result.size);      // Infinity
```

## Stateful Paged Batching (`.take(n)`)

`recurrenceAI` maintains an internal date cursor. Calling `.take(n)` repeatedly returns consecutive batches of `Tempo` instances:

```typescript
// Fetch initial batch of 5 items
const batch1 = result.take(5);
console.log(batch1.length); // 5

// Fetch NEXT batch of 5 items starting right where batch 1 left off
const batch2 = result.take(5);
console.log(batch2.length); // 5
```

When a finite schedule (e.g. `COUNT=10`) completes, `.take(n)` returns an empty array `[]` to signal exhaustion:

```typescript
const finiteResult = await recurrenceAI("FREQ=MONTHLY;BYDAY=1MO;COUNT=2");

const b1 = finiteResult.take(2); // [ Tempo(Month 1), Tempo(Month 2) ]
const b2 = finiteResult.take(2); // [] (Exhausted)
```

## Native RRULE Parsing (Zero Network Overhead)

Passing a raw RFC 5545 RRULE string directly to `recurrenceAI` bypasses network LLM calls entirely (`provider: 'rrule-parser'`), functioning as an instant native parser:

```typescript
const native = await recurrenceAI("FREQ=MONTHLY;BYDAY=1MO;COUNT=12");

console.log(native.provider); // "rrule-parser" (Instant native resolution)
console.log(native.isFinite); // true
console.log(native.size);     // 12
```

## Lazy Iteration (`for...of`)

`TempoRecurrenceResult` implements `[Symbol.iterator]`, allowing lazy iteration over occurrences up to the batch limit (`count: 5` by default). 

When iterating over open-ended schedules (`isFinite === false`), build a `break` termination clause into the loop:

```typescript
const schedule = await recurrenceAI("Every Friday");

for (const occurrence of schedule) {
  // Always include a termination condition for open-ended schedules
  if (occurrence.year > 2028) break;

  console.log(occurrence.format('{yyyy}-{mm}-{dd}'));
}
```

## Result Interface

```typescript
export interface TempoRecurrenceResult {
  /** Standard RFC 5545 RRULE string (e.g. 'FREQ=WEEKLY;BYDAY=TU') */
  rrule: string;
  
  /** Localized human-friendly schedule summary */
  summary: string;
  
  /** Reasoning / explanation of how the recurrence pattern was parsed */
  reasoning?: string;
  
  /** True if schedule has an explicit end date or count limit; false if infinite */
  isFinite: boolean;
  
  /** Total count of occurrences if finite, or Infinity (Number.POSITIVE_INFINITY) */
  size: number;
  
  /** Advances cursor and returns the next batch of N Tempo instances */
  take(count?: number): Tempo[];
  
  /** Lazy generator yielding Tempo instances */
  [Symbol.iterator](): Generator<Tempo, void, unknown>;
  
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  
  /** Provider ID responsible for processing or 'rrule-parser' */
  provider: string;
}
```
