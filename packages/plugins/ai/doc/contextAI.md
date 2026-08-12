# `contextAI` — Context & Regional Inference

`contextAI()` is designed to analyze unstructured or ambiguous text (e.g. user biographies, locations, or email bodies) and infer their regional configuration settings. It resolves these properties to a standard configuration object containing timezone, locale, calendar system, and hemisphere.

This is highly useful for user onboarding settings, automatic context mapping for calendar syncs, and geolocating inputs dynamically without maintaining static geographic mapping tables.

---

## Basic Usage

> [!NOTE]
> Like all Tempo AI functions, `contextAI` requires prior initialization with at least one active provider via `initAI()`.

```typescript
import { initAI, contextAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Configure the AI provider farm
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  ]
});

// 2. Infer contextual settings from unstructured text
const context = await contextAI("I'm a photographer based in Sydney, Australia.");

console.log(context.timeZone);  // "Australia/Sydney"
console.log(context.locale);    // "en-AU"
console.log(context.calendar);  // "gregory"
console.log(context.sphere);    // "south"
console.log(context.confidence); // 0.98
```

---

## Configuration Options (`AiContextOptions`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`force`** | `boolean` | If true, bypasses the cache to initiate a fresh LLM query. |
| **`cache`** | `boolean` | If false, disables writing to and reading from cache adapters. |
| **`cacheAdapter`** | `AiCacheAdapter` | Custom cache engine (e.g., Redis) for caching results on this request. |
| **`ttl`** | `number` | Time-to-live override in milliseconds for cached results. |
| **`minConfidence`**| `number` | Minimum confidence score threshold (0.0 to 1.0) required to return a valid slot. Throws `TempoAiError(422)` if lower. |
| **`mode`** | `AiMode` | Concurrency routing strategy (`fallback`, `race`, `consensus`, `hedged`, `roundrobin`, `adaptive`). Refer to the [Multi-Provider Execution Modes Guide](./modes.md). |
| **`providers`** | `AiProvider[]` | Per-request provider configuration overrides. |
| **`timeout`** | `number` | Per-request timeout in milliseconds (overrides provider and global timeouts). |
| **`hedgeDelay`** | `number` | Delay in milliseconds before initiating speculative hedging in `AiMode.Hedged` (default: `800ms`). |
| **`debug`** | `boolean` | If true, logs prompt context and LLM payloads to console. |
| **`softErrors`** | `boolean` | If true, returns `TempoAiError` into array index position instead of rejecting the entire batch query. |

---

## Result Schema (`TempoContext`)

```typescript
export interface TempoContext {
  /** Inferred IANA time zone identifier (e.g. 'America/New_York') */
  timeZone: string;
  
  /** Inferred BCP 47 language/region tag (e.g. 'en-US') */
  locale: string;
  
  /** Inferred Unicode calendar system type (e.g. 'gregory') */
  calendar: string;
  
  /** Inferred hemisphere, or undefined if ambiguous */
  sphere?: 'north' | 'south' | undefined;
  
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

### 1. Workspace Baseline Context
`contextAI` inspects the host runtime or current `Tempo` configuration (`Tempo.options.timeZone`, `Tempo.options.locale`, etc.) as a fallback baseline. If an input like `"at home"` is provided, the LLM will ground its inference in the workstation's baseline defaults.

### 2. Strict Confidence Thresholds
Using `minConfidence`, developers can guarantee that low-certainty or completely ambiguous inputs (e.g., `"in the park"`) throw a `TempoAiError(422)` rather than silently returning guessed context parameters:

```typescript
const context = await contextAI("meeting somewhere online", { minConfidence: 0.9 });
// Throws TempoAiError(422): Inferred context confidence (0.4) is below the required threshold of 0.9.
```

### 3. Timezone Validation
Before returning, the returned IANA timezone string is dynamically validated against the runtime's native JavaScript `Intl` API. If the LLM returns an unsupported or fake timezone identifier, `contextAI` throws a `TempoAiError(422)` to prevent application runtime failures.

### 4. Parallel Batch Processing
You can pass an array of strings to process multiple contexts concurrently:
```typescript
const [context1, context2] = await contextAI([
  "Working from Kyoto",
  "Living in Melbourne"
]);
```

### Combining `contextAI` with `parseAI` (The Pivot Flow)

Often, a user will mention their location in one sentence and a relative time in another. You can chain these APIs together to form a seamless date-resolution pipeline:

```typescript
import { contextAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Deduces the context
const ticketContext = await contextAI("customer issue from our London office");
// ticketContext = { timeZone: 'Europe/London', locale: 'en-GB', sphere: 'north' }

// 2. Feed the output context directly as options into parseAI
const resolutionTime = await parseAI("issue occurred on 04/05/2026 at 3 PM", ticketContext);
// 1. Correctly parses 04/05 to May 4th (UK format) rather than April 5th.
// 2. Adjusts to BST/GMT (Europe/London).
```
