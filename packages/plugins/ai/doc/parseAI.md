# `parseAI` — Natural Language Point-in-Time Parsing

`parseAI()` is the primary entry point for converting complex, unstructured natural language date/time expressions into deterministic `Tempo` instances.

## Basic Usage

```typescript
import { parseAI, initAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize AI providers
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY }
  ]
});

// Parse natural language
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");

console.log(dt.format('{yyyy}-{mm}-{dd}')); // 2026-11-17
console.log(dt.ai?.confidence);             // 0.98
```

## Options & Overrides

`parseAI(input, options)` accepts per-request options:

```typescript
const dt = await parseAI("Third Friday of October", {
  anchor: '2026-05-10T12:00:00Z', // Anchor date for relative calculations
  timeZone: 'Australia/Sydney',   // Context timezone
  locale: 'en-AU',                // Context locale
  minConfidence: 0.85,            // Require at least 0.85 confidence score
  timeout: 3000,                  // 3-second SLA call-site timeout
  force: true,                    // Skip native pre-parsing & cache lookup
  debug: true                     // Enable operational trace logging & .ai metadata
});
```

## Multi-Provider Execution Modes

`parseAI` supports all six multi-provider execution strategies (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`) configured globally or overridden per-request.

For a comprehensive guide, decision flowcharts, and configuration details for all execution modes, refer to the [Multi-Provider Execution Modes Guide](./modes.md).


## Batch Array Parsing

Pass an array of prompts to process multiple queries in parallel while preserving index ordering:

```typescript
const [dt1, dt2] = await parseAI([
  "New Years Day 2026",
  "Groundhog Day 2026"
]);

console.log(dt1.format('{yyyy}-{mm}-{dd}')); // 2026-01-01
console.log(dt2.format('{yyyy}-{mm}-{dd}')); // 2026-02-02
```

## Diagnostic Metadata (`.ai`)

When a date is parsed, a frozen diagnostic metadata object is attached to the returned `Tempo` instance:

```typescript
console.log(dt.ai);
/*
{
  provider: 'groq',
  cached: false,
  confidence: 0.98,
  ambiguous: false,
  granularity: 'day',
  rawIso: '2026-11-17T00:00:00'
}
*/
```
