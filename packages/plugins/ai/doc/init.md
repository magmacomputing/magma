# `initAI` — Provider Initialization & Farm Configuration

`initAI()` sets up the global configuration for `@magmacomputing/tempo-plugin-ai`, managing provider authentication, multi-provider execution modes, global SLAs/timeouts, and caching strategies.

## Basic Usage

```typescript
import { initAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize with BYOK (Bring Your Own Key) provider credentials
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY },
    { id: 'openai', key: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
  ],
  timeout: 5000, // 5-second global SLA default
  debug: true    // Enable operational trace logging (development-only)
});
```

> **Tip**: `initAI` returns a `Promise<void>` and is fully re-callable! Calling it synchronously without `await` instantly initializes local configurations so you can call `parseAI` immediately, while `await initAI()` guarantees that remote provider manifest defaults are fetched and applied before proceeding (with explicit provider configuration values always taking precedence over remote manifest defaults).

## Execution Modes & Multi-Provider Options

The AI plugin supports three multi-provider execution strategies (`fallback`, `race`, `consensus`):

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

Detailed diagnostic context—including `rawPrompt`, `normalizedPrompt`, `reasoning`, confidence scores, and rate limit snapshots—is attached directly to the returned `Tempo` instance via the `.ai` property when `debug: true` is enabled.

> [!WARNING]
> **Diagnostic Security Notice**: Inspecting or exposing the `.ai` metadata property (such as `rawPrompt` or `reasoning`) in public UI components or client-side telemetry may expose raw user inputs. Ensure sensitive diagnostic fields on `Tempo.ai` are sanitized before forwarding instances to external monitoring tools.

## Configuration Options Reference

```typescript
export interface AiConfig {
  /** List of configured AI providers */
  providers?: AiProvider[];
  /** Default execution mode across providers ('fallback' | 'race' | 'consensus') */
  mode?: 'fallback' | 'race' | 'consensus';
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
  /** Optional hook to intercept and resolve dynamic provider defaults */
  fetchDefaults?: (providerId: string) => Promise<Partial<AiProvider> | null> | Partial<AiProvider> | null;
  /** URL for dynamic remote provider manifest updates, or `false` to disable */
  remoteConfigUrl?: string | false;
}
```
