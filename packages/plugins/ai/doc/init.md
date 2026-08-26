# `initAI` — Provider Initialization & Farm Configuration

`initAI()` sets up the global configuration for `@magmacomputing/tempo-plugin-ai`, managing provider authentication, multi-provider execution modes, global SLAs/timeouts, and caching strategies.

## Zero-Config Auto-Discovery

`@magmacomputing/tempo-plugin-ai` features a zero-boilerplate auto-discovery architecture. In server environments (Node.js, Deno, Bun), calling `initAI()` is **completely optional** when standard environment variables (`GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`) or a `tempo.config.json` file are present.

```typescript
import { parseAI } from '@magmacomputing/tempo-plugin-ai';

// When GROQ_API_KEY is present in the environment:
// Zero setup required — providers and SLAs are auto-discovered lazily on first call!
const dt = await parseAI("next Friday at 4pm");
```

### Configuration Resolution Order

Configuration is automatically discovered and resolved in the following priority:
1. **Call-site explicit overrides** (`options.providers`, `options.mode`).
2. **Explicit `initAI(config)` parameters**.
3. **Active `Tempo.config.plugins.ai`** (in-memory or loaded via `Tempo.bootstrap()`).
4. **Filesystem `tempo.config.*` files** (JSON, JSONC, JS, TS).
5. **Runtime Environment Variables** (`GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`).

### `tempo.config.json` Example

You can declare AI provider configurations directly within your project's `tempo.config.json` using template variable interpolation:

```json
{
  "timeZone": "Australia/Sydney",
  "locale": "en-AU",
  "plugins": {
    "ai": {
      "mode": "fallback",
      "timeout": 5000,
      "minConfidence": 0.85,
      "providers": [
        { "id": "groq", "key": "${GROQ_API_KEY}" },
        { "id": "openai", "key": "$env:OPENAI_API_KEY", "model": "gpt-4o-mini" }
      ]
    }
  }
}
```

## Basic Usage (Explicit Configuration)

```typescript
import { initAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize with custom provider credentials and execution options
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY },
    { id: 'openai', key: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
  ],
  timeout: 5000, // 5-second global SLA default
  debug: true    // Enable operational trace logging (automatically PII-sanitized in production)
});
```

> **Tip**: `initAI` returns a `Promise<void>` and is fully re-callable! Calling it synchronously without `await` instantly initializes local configurations so you can call `parseAI` immediately, while `await initAI()` guarantees that remote provider manifest defaults are fetched and applied before proceeding (with explicit provider configuration values always taking precedence over remote manifest defaults).

### Dynamic Provider Credentials & Context Suppliers

The provider `key` configuration supports asynchronous or synchronous supplier functions (`AsyncEvaluable<string>`), allowing automated secret vault retrieval and dynamic token refreshing. Provider attributes (`url`, `model`) as well as global context settings (`timeZone`, `locale`, `calendar`, `sphere`) accept synchronous supplier functions (`Evaluable<T>`).

This enables automated secret vault rotation, dynamic AI gateways, and multi-tenant context resolution evaluated just-in-time on every HTTP dispatch:

```typescript
import { initAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize with dynamic async key resolver and per-request context
initAI({
  providers: [
    {
      id: 'openai',
      // Resolved dynamically per-request: enables secret vault rotation without restarting
      key: async () => await secretVault.getApiKey('openai'),
      // Dynamic proxy endpoint
      url: () => getActiveGatewayUrl()
    }
  ],
  // Dynamic timezone / locale resolution
  timeZone: () => currentRequestContext.timeZone,
  locale: () => currentRequestContext.locale
});
```

## Execution Modes & Multi-Provider Options

The AI plugin supports six multi-provider execution strategies (`fallback`, `race`, `consensus`, `adaptive`, `hedged`, `roundrobin`):

* **`fallback`** (default): Queries providers sequentially in array order until one succeeds.
* **`race`**: Sends concurrent requests to all providers, returning the fastest valid response.
* **`consensus`**: Queries providers concurrently and boosts confidence when outputs agree.
* **`hedged`**: Initiates staggered latency hedging, querying subsequent providers if the primary is slow.
* **`roundrobin`**: Cyclic load balancing across the provider pool.
* **`adaptive`**: Proactive telemetry-aware rate-limit avoidance.

For a comprehensive guide, decision flowcharts, and configuration details for all execution modes, refer to the [Multi-Provider Execution Modes Guide](./modes.md).

```typescript
// 1. Fallback mode (default): query providers sequentially in array order until one succeeds
initAI({
  mode: 'fallback',
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY },    // Primary provider
    { id: 'openai', key: process.env.OPENAI_API_KEY } // Fallback provider
  ]
});

// 2. Race mode: send concurrent requests to all providers, returning the fastest valid response
const fastest = await parseAI("Third Friday of October", { mode: 'race' });

// 3. Consensus mode: query providers concurrently and boost confidence when outputs agree
const agreed = await parseAI("The penultimate Tuesday before Thanksgiving", { 
  mode: 'consensus',
  minConfidence: 0.85
});

// 4. Hedged mode: speculative concurrency with staggered delay (e.g. 800ms)
const hedged = await parseAI("First Monday of December", {
  mode: 'hedged',
  hedgeDelay: 800
});
```

## Timeout Controls & SLAs

Prevent hanging requests using the 3-tier timeout hierarchy (`call-site` > `provider` > `global` > `default 15s`):

```typescript
initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY, options: { timeout: 2000 } } // 2s timeout for fast provider
  ],
  timeout: 5000 // 5s global default timeout
});

// Hard 3-second SLA override for a specific call-site
const dt = await parseAI("Next Tuesday at 4pm", { timeout: 3000 });
```

## Operational Trace Logging & Debugging

**Operational Trace Logging**
Passing `debug: true` into `initAI` (or setting `{ debug: true }` on a per-request options object) outputs concise operational trace logs (prefixed with `[tempo-plugin-ai]`) to the developer console for monitoring provider fallback decisions and execution timing.

Detailed diagnostic context—including provider resolution, execution lineage, confidence scores, and when `debug: true` is active, `rawPrompt`, `normalizedPrompt`, and rate-limit snapshots—is attached directly to the returned `Tempo` instance via the `.ai` property for `parseAI`. Structured functions (`formatAI`, `diffAI`, `extractAI`, `contextAI`, `scheduleAI`) surface their respective typed properties directly on the result object (such as `res.confidence`, `res.provider`, and optional `res.reasoning`).

> [!TIP]
> **Smart Debug & Proxy Introspection**: In production environments (`NODE_ENV === 'production'`), terminal logging via `console.log(date.ai)` or `console.log(result)` automatically sanitizes and masks PII (emails, phones, bearer tokens) while preserving 100% in-memory data integrity for application code. Refer to the [Security & Privacy Architecture Guide](./security.md).

## Configuration Options Reference

```typescript
export interface AiConfig {
  /** List of configured AI providers */
  providers?: AiProvider[];
  /** Default execution mode across providers ('fallback' | 'race' | 'consensus' | 'hedged' | 'roundrobin' | 'adaptive') */
  mode?: 'fallback' | 'race' | 'consensus' | 'hedged' | 'roundrobin' | 'adaptive';
  /** Speculative hedge delay in milliseconds (hedged mode only, default: 800ms) */
  hedgeDelay?: number;
  /** Global SLA timeout in milliseconds */
  timeout?: number;
  /** Global debug flag for operational trace logging */
  debug?: boolean;
  /** Synchronous Map or BoundedCache for static glossary terms */
  cache?: Map<string, string>;
  /** Custom cache adapter for distributed storage (e.g. Redis, KV) */
  cacheAdapter?: AiCacheAdapter;
  /** Global default time-to-live in milliseconds for cache adapters */
  ttl?: number;
  /** Minimum confidence threshold for AI parsing results (0.0 to 1.0) */
  minConfidence?: number;
  /** Dynamic or static default timezone context (string | (() => string)) */
  timeZone?: Evaluable<string>;
  /** Dynamic or static default locale context (string | string[] | (() => string | string[])) */
  locale?: Evaluable<string | string[]>;
  /** Dynamic or static default calendar context (string | (() => string)) */
  calendar?: Evaluable<string>;
  /** Dynamic or static default celestial sphere context (string | (() => string)) */
  sphere?: Evaluable<string>;
  /** Optional hook to intercept and resolve dynamic provider defaults */
  fetchDefaults?: (providerId: string) => Promise<Partial<AiProvider> | null> | Partial<AiProvider> | null;
  /** URL for dynamic remote provider manifest updates, or `false` to disable */
  remoteConfigUrl?: string | false;
}
```
