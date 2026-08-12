# `contextAI` — Context & Regional Inference

`contextAI()` is designed to analyze unstructured or ambiguous text (e.g. user biographies, locations, or email bodies) and infer their regional configuration settings. It resolves these properties to a standard configuration object containing timezone, locale, calendar system, and hemisphere.

This is highly useful for user onboarding settings, automatic context mapping for calendar syncs, and geolocating inputs dynamically without maintaining static geographic mapping tables.

---

## Basic Usage

```typescript
import { contextAI } from '@magmacomputing/tempo-plugin-ai';

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
  
  /** Inferred hemisphere, constrained strictly to 'north' or 'south' (omitted if unknowable) */
  sphere?: 'north' | 'south' | undefined;
  
  /** Confidence score between 0.0 (highly ambiguous) and 1.0 (certain) */
  confidence: number;
  
  /** The identifier of the AI provider that successfully resolved this context */
  provider: string;
  
  /** Step-by-step reasoning explaining the inference */
  reasoning?: string;
}
```

---

## Key Architectural Behaviors

### 1. Hemisphere (Sphere) Constraint
To prevent downstream calendar season calculation issues, the inferred `sphere` value is strictly mapped to `'north' | 'south'`. If the hemisphere cannot be determined with certainty, the `sphere` property is returned as `undefined` (omitted from the payload) rather than defaulting to a synthetic string like `"unknown"`. This allows simple truthy checks:
```typescript
if (context.sphere) {
  // Apply hemisphere calculations
}
```

### 2. Workstation Grounding Context
When executing, `contextAI` resolves the local environment settings of the current runner (e.g., from `navigator.language` / `Intl` settings in browser contexts, or Node environment variables) via `Tempo.options` and sends them as a grounding baseline to the LLM. If the input text is devoid of geographic clues, the LLM will fall back directly to these workstation/browser settings.

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
// 1. Deduces the context
const ticketContext = await contextAI("customer issue from our London office");
// ticketContext = { timeZone: 'Europe/London', locale: 'en-GB', sphere: 'north' }

// 2. Feed the output context directly as options into parseAI
const resolutionTime = await parseAI("issue occurred on 04/05/2026 at 3 PM", ticketContext);
// 1. Correctly parses 04/05 to May 4th (UK format) rather than April 5th.
// 2. Adjusts to BST/GMT (Europe/London).
```
