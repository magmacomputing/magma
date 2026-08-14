# `extractAI` — Unstructured Text & Calendar Event Extraction

`extractAI()` scans unstructured, multi-paragraph text (emails, meeting transcripts, chat logs, task notes, calendar invitations) to automatically identify, parse, and extract all embedded temporal entities and time-bound events into structured `TempoAiExtractResult` records containing native `Tempo` instances.

Relative expressions (such as *"tomorrow at 10am"*, *"next Tuesday from 1 to 3pm"*, *"final deliverables due Friday EOD"*) are resolved and mathematically grounded against an explicit or current reference `anchor` timestamp, timezone, and calendar system.

---

## Basic Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { initAI, extractAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize AI providers
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  ]
});

const emailText = `
Hi team,
Let's schedule our Sprint Review tomorrow from 10:00 AM to 11:30 AM in Room 4A.
Also, reminder that all pull requests and documentation are due next Friday by 5:00 PM.
`;

const anchor = new Tempo('2026-08-10T09:00:00Z'); // Monday morning

const result = await extractAI(emailText, { anchor, timeZone: 'America/New_York' });

for (const event of result.events) {
  console.log(`[${event.type}] ${event.label}`);
  console.log(`  Start: ${event.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')}`);
  if (event.end) {
    console.log(`  End:   ${event.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}')}`);
  }
  console.log(`  Source: "${event.rawText}" (Confidence: ${event.confidence})`);
}
```

---

## Configuration Options (`AiExtractOptions`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`anchor`** | `TempoDateInput` | Reference anchor date for relative expressions (defaults to current time). |
| **`timeZone`** | `string` | Target IANA timezone for grounding and output Tempo instances. |
| **`locale`** | `string \| string[]` | Target BCP 47 locale or language tag (e.g. `'en-US'`, `'fr-FR'`). |
| **`calendar`** | `string` | Calendar system (e.g. `'gregory'`, `'hebrew'`, `'islamic'`). |
| **`categories`** | `string[]` | Optional list of categories to filter entities (e.g. `['meeting', 'deadline']`). |
| **`region`** | `string` | Regional context (e.g. `'AU-NSW'`, `'US-NY'`) passed to LLM grounding. |
| **`force`** | `boolean` | If true, bypasses cache to force a fresh LLM query. |
| **`cache`** | `boolean` | If false, disables writing to and reading from cache adapters. |
| **`cacheAdapter`** | `AiCacheAdapter` | Custom cache engine (e.g., Redis, Cloudflare KV) for caching results. |
| **`ttl`** | `number` | Time-to-live override in milliseconds for cached results (defaults to 24h). |
| **`minConfidence`**| `number` | Minimum confidence score threshold (0.0 to 1.0) required. Throws `TempoAiError(422)` if lower. |
| **`mode`** | `AiMode` | Concurrency routing strategy (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`). Refer to the [Multi-Provider Execution Modes Guide](./modes.md). |
| **`softErrors`** | `boolean` | If true, returns `TempoAiError` into array indices instead of rejecting batch queries. |

---

## Result Schema (`TempoAiExtractResult`)

```typescript
export interface TempoAiExtractResult {
  /** Array of extracted events with instantiated Tempo objects. */
  events: TempoExtractedEvent[];
  
  /** Overall extraction confidence score between 0.0 and 1.0. */
  confidence: number;
  
  /** ID of the provider that fulfilled the request (or 'cache'). */
  provider: string;
  
  /** Optional summary or reasoning from the LLM. */
  reasoning?: string | undefined;
}

export interface TempoExtractedEvent {
  /** Short descriptive label or title of the extracted event/activity. */
  label: string;
  
  /** Start date-time point as an instantiated Tempo instance. */
  start: Tempo;
  
  /** Optional end date-time point (if an interval or duration was mentioned). */
  end?: Tempo | undefined;
  
  /** Classification category ('point' | 'interval' | 'deadline' | 'recurrence' | 'tentative'). */
  type: TempoEventType;
  
  /** Raw text snippet extracted from the source document. */
  rawText?: string | undefined;
  
  /** Confidence score for this specific entity extraction (0.0 to 1.0). */
  confidence: number;
}
```

---

## Key Architectural Behaviors

### 1. Mathematical Grounding & Hallucination Suppression
To prevent hallucinated dates, `extractAI` calculates grounding anchor coordinates before dispatching to the LLM:
- Localized ISO reference timestamp and timezone
- Day of the week name and ordinal index
- Target calendar system and regional context
- Constrained JSON schema ensuring valid ISO dates

### 2. Native `Tempo` Instances
Extracted start and end points are immediately instantiated as live `Tempo` objects, ready for subsequent date math, interval arithmetic, or timezone shifting:

```typescript
const result = await extractAI(transcript);
const meeting = result.events[0];

// Instant date operations with Tempo
const reminderTime = meeting.start.subtract('15 minutes');
console.log(`Set alarm for: ${reminderTime.format('{h12}:{mi} {mer}')}`);
```

### 3. Multi-Tier Distributed Caching
`extractAI` integrates multi-tier caching (in-memory and optional asynchronous `AiCacheAdapter` such as Redis or Cloudflare KV). Cached ISO timestamps are rehydrated into live `Tempo` objects upon cache hits:

```typescript
const result = await extractAI(documentText, {
  cacheAdapter: redisCacheAdapter,
  ttl: 86_400_000, // 24 hours
});
```

### 4. Parallel Batch Extraction
Process arrays of documents concurrently with optional `softErrors` fault-tolerance:

```typescript
const documents = [
  "Team offsite next Thursday from 9am to 5pm.",
  "Project proposal submission deadline is August 20 at midnight."
];

const results = await extractAI(documents, { softErrors: true });
```
