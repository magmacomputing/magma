# `formatAI` — Contextual & Narrative Date Formatting

`formatAI()` formats a `Tempo` instance, TC39 `Temporal` object, Date, or timestamp into human-friendly, contextual narrative text tailored to specific UI tones, relative time frames, or business domains.

While core `Tempo` provides token-based template formatting (`t.format('{yyyy}-{mm}-{dd}')`), `formatAI` bridges the gap to contextual, localized human descriptions that token patterns alone cannot capture (e.g. countdowns, calendar invites, conversational reminders, and domain summaries), backed by mathematical grounding.

---

## Basic Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { initAI, formatAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize AI providers
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  ]
});

const target = new Tempo('2026-08-07T17:00:00[America/New_York]');

// "this Friday at 5:00 PM EST (in 5 days)"
const result = await formatAI(target, 'friendly reminder tone with relative countdown');

console.log(result.formatted);  // "this Friday at 5:00 PM EST (in 5 days)"
console.log(result.confidence); // 0.98
console.log(result.provider);   // 'groq'
```

---

## Configuration Options (`AiFormatOptions`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`anchor`** | `Tempo.DateTime` | Reference anchor date for relative delta calculations (defaults to current time). |
| **`style`** | `string` | Narrative style or tone hint (e.g. `'casual'`, `'formal'`, `'compact'`, `'countdown'`). |
| **`region`** | `string` | Regional context (e.g., `'AU-NSW'`, `'US-CA'`) passed to LLM grounding. |
| **`timeZone`** | `string` | Target IANA timezone for output formatting. |
| **`locale`** | `string \| string[]` | Target BCP 47 locale or language tag (e.g. `'fr-FR'`, `'en-US'`). |
| **`force`** | `boolean` | If true, bypasses the cache to initiate a fresh LLM query. |
| **`cache`** | `boolean` | If false, disables writing to and reading from cache adapters. |
| **`cacheAdapter`** | `AiCacheAdapter` | Custom cache engine (e.g., Redis, Cloudflare KV) for caching results. |
| **`ttl`** | `number` | Time-to-live override in milliseconds for cached results (defaults to 24h). |
| **`minConfidence`**| `number` | Minimum confidence score threshold (0.0 to 1.0) required. Throws `TempoAiError(422)` if lower. |
| **`mode`** | `AiMode` | Concurrency routing strategy (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`). Refer to the [Multi-Provider Execution Modes Guide](./modes.md). |
| **`softErrors`** | `boolean` | If true, returns `TempoAiError` into array indices instead of rejecting batch queries. |

---

## Result Schema (`TempoAiFormatResult`)

```typescript
export interface TempoAiFormatResult {
  /** Formatted narrative string. */
  formatted: string;
  
  /** Confidence score between 0.0 and 1.0. */
  confidence: number;
  
  /** ID of the provider that fulfilled the request (or 'cache'). */
  provider: string;
  
  /** Optional step-by-step rationale from the LLM. */
  reasoning?: string | undefined;
}
```

---

## Key Architectural Behaviors

### 1. Native Grounding Context
To eliminate LLM date and day-of-week hallucinations, `formatAI` computes deterministic grounding metrics before constructing the prompt:
- Exact ISO timestamp and timezone
- Day of the week name and ordinal (e.g. `Friday`, Day 5)
- Relative delta in calendar days and elapsed hours compared to anchor
- Directionality (`'past'`, `'present'`, `'future'`)

These metrics are injected into the system prompt as immutable constraints.

### 2. TC39 Temporal & Universal Interoperability
`formatAI` seamlessly accepts `Tempo` instances, native JavaScript `Date` objects, ISO strings, timestamps, and TC39 `Temporal` objects (`Temporal.ZonedDateTime`, `Temporal.Instant`, `Temporal.PlainDateTime`, `Temporal.PlainDate`):

```typescript
import { Temporal } from '@magmacomputing/tempo/library';

const zdt = Temporal.ZonedDateTime.from('2026-08-05T15:00:00+10:00[Australia/Sydney]');
const result = await formatAI(zdt, 'compact relative format');
```

### 3. Multi-Tier Distributed Caching
`formatAI` integrates multi-tier caching (in-memory + optional asynchronous `AiCacheAdapter` such as Redis or Cloudflare KV). Cache keys incorporate input timestamp, anchor timestamp, normalized prompt, timezone, locale, region, and style to ensure complete cache correctness:

```typescript
const result = await formatAI(target, 'casual invitation', {
  cacheAdapter: redisCacheAdapter,
  ttl: 3_600_000, // 1 hour
});
```

### 4. Parallel Batch Formatting
Format multiple dates and prompts concurrently with optional `softErrors` resilience:

```typescript
const results = await formatAI([
  { date: '2026-08-03T09:00:00Z', prompt: 'calendar invite' },
  { date: '2026-08-05T18:00:00Z', prompt: 'flight departure notification' },
], { softErrors: true });
```
