# `diffAI` — Contextual & Business Date Deltas

`diffAI()` expresses the temporal delta between two `Tempo` instances, timestamps, or date strings in human, business, or operational terms.

While core `Tempo` provides precise numeric calculations (`start.until(end, 'day')`), `diffAI` bridges the gap to domain-specific narrative explanations (e.g. accounting working days, delivery SLAs, relative countdowns, and sprint planning summaries) backed by arithmetic grounding.

---

## Basic Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { initAI, diffAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize AI providers
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  ]
});

const start = new Tempo('2026-08-01T09:00:00Z'); // Saturday
const end = new Tempo('2026-08-10T17:00:00Z');   // Next Monday

const diff = await diffAI(start, end, 'explain in terms of business working days');

console.log(diff.formatted);    // "5 business days (approx. 224 calendar hours)"
console.log(diff.businessDays); // 5
console.log(diff.days);         // 9.33
console.log(diff.hours);        // 224
console.log(diff.confidence);   // 0.96
```

---

## Configuration Options (`AiDiffOptions`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`holidays`** | `string[]` | Explicit array of holiday dates (`'YYYY-MM-DD'`) to exclude from business days. |
| **`region`** | `string` | Regional context (e.g., `'AU-NSW'`, `'US'`) passed to LLM grounding. |
| **`timeZone`** | `string` | Target IANA timezone for date boundaries and calculation. |
| **`locale`** | `string \| string[]` | Locale for narrative language formatting. |
| **`force`** | `boolean` | If true, bypasses the cache to initiate a fresh LLM query. |
| **`cache`** | `boolean` | If false, disables writing to and reading from cache adapters. |
| **`cacheAdapter`** | `AiCacheAdapter` | Custom cache engine (e.g., Redis) for caching results on this request. |
| **`ttl`** | `number` | Time-to-live override in milliseconds for cached results. |
| **`minConfidence`**| `number` | Minimum confidence score threshold (0.0 to 1.0) required. Throws `TempoAiError(422)` if lower. |
| **`mode`** | `AiMode` | Concurrency routing strategy (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`). Refer to the [Multi-Provider Execution Modes Guide](./modes.md). |
| **`softErrors`** | `boolean` | If true, returns `TempoAiError` into array indices instead of rejecting batch queries. |

---

## Result Schema (`TempoAiDiffResult`)

```typescript
export interface TempoAiDiffResult {
  /** Human-friendly, contextual narrative text summarizing the difference */
  formatted: string;
  
  /** Total calendar days between start and end */
  days?: number | undefined;
  
  /** Total elapsed calendar hours between start and end */
  hours?: number | undefined;
  
  /** Total business working days (excluding weekends and matching holidays) */
  businessDays?: number | undefined;
  
  /** List of holiday dates (YYYY-MM-DD) encountered within the interval */
  holidays?: string[] | undefined;
  
  /** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
  confidence: number;
  
  /** Resolution source ('cache' or provider ID like 'groq', 'gemini', 'openai') */
  provider: string;
  
  /** Step-by-step reasoning or justification provided by the engine/LLM */
  reasoning?: string | undefined;
}
```

---

## Key Architectural Behaviors

### 1. Native Grounding Context
To guarantee arithmetic precision and prevent LLM hallucinations, `diffAI` natively computes exact calendar days, elapsed hours, and business working days (excluding Saturdays, Sundays, and provided holidays) using `Tempo` before dispatching to the LLM. These metrics are supplied as grounding constraints in the system prompt.

### 2. Public Holiday Exclusions
You can supply regional public holidays (e.g., from `@magmacomputing/tempo-fns` via `getPublicHolidays`) to automatically adjust business day counters:

```typescript
import { getPublicHolidays } from '@magmacomputing/tempo-fns';

const holidays = (await getPublicHolidays(2026, 'AU')).map(h => h.date);

const result = await diffAI('2026-12-24', '2027-01-04', 'calculate net business days', {
  holidays,
  region: 'AU',
});

console.log(result.businessDays); // 5 (Christmas, Boxing Day, New Year's Day excluded)
console.log(result.holidays);     // ['2026-12-25', '2026-12-26', '2027-01-01']
```

### 3. Directional Awareness & Reverse Intervals
When the end date is earlier than the start date, `diffAI` indicates past/backward direction and provides negative business day counts (e.g. `-5` business days), allowing the LLM to format relative past descriptions (e.g. `"5 business days ago"`).

### 4. Parallel Batch Processing
You can pass an array of diff pairs to resolve multiple deltas concurrently:

```typescript
const [diff1, diff2] = await diffAI([
  { start: '2026-08-01', end: '2026-08-05', prompt: 'summarize for billing' },
  { start: '2026-08-05', end: '2026-08-15', prompt: 'explain project sprint' },
]);
```
