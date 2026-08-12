# Rate Limits & Cache Management

When using third-party AI APIs, your application is subject to strict rate limits. 

The plugin automatically tracks these limits by reading the standard `x-ratelimit-*` HTTP headers returned by providers like OpenAI and Groq. 

## Tracking Quota Real-time

Quota and rate-limit metadata can be inspected in two convenient ways:

### 1. Request-Locked Instance Metadata (`dt.ai.limits`)
Every `Tempo` instance returned by `parseAI` includes a frozen `.ai.limits` snapshot representing the rate limit state returned by provider HTTP headers for *that specific request*. Note that `.ai.limits` is guaranteed only for provider-backed network requests where rate-limit headers are returned by the selected provider; results resolved via native parsing (`provider: 'native'`) or cache hits (`provider: 'cache'`) may omit `.ai.limits` (`undefined`).

```typescript
const dt = await parseAI("The third Friday of next month");

if (dt.ai?.limits) {
  console.log(`Remaining Tokens: ${dt.ai.limits.remainingTokens}`);
  console.log(`Remaining Requests: ${dt.ai.limits.remainingRequests}`);
  console.log(`Resets At: ${dt.ai.limits.resetAt?.format('{hh}:{mi}:{ss}')}`);
}
```

### 2. Global State Utility (`getAiRateLimits()`)
For quick status checks or global monitoring across the application lifecycle, `getAiRateLimits()` exposes the stats from the most recent LLM request:

```typescript
import { getAiRateLimits } from '@magmacomputing/tempo-plugin-ai';

// Returns global stats from the most recent LLM proxy request
const stats = getAiRateLimits(); 

if (stats) {
  console.log(`Remaining Tokens: ${stats.remainingTokens}`); 
  console.log(`Remaining Requests: ${stats.remainingRequests}`); 
  console.log(`Limits Reset At: ${stats.resetAt?.format('{hh}:{mi}:{ss}')}`); 
}
```

## Handling Quota Exhaustion (429s)

If you actually exhaust your quota and the provider rejects the request (e.g., HTTP 429 Too Many Requests), the plugin will instantly attempt to failover to the next provider in your configuration array.

If all providers fail, the plugin will throw a `TempoAiError`. This custom error class includes a highly valuable `retryAt` property:

```typescript
import { parseAI, TempoAiError } from '@magmacomputing/tempo-plugin-ai';

try {
  const dt = await parseAI("The third Friday of next month");
} catch (error) {
  if (error instanceof TempoAiError && error.code === 429) {
    // Safely queue the remaining batch of dates until your minute-limit resets!
    console.warn(`All API quotas exhausted. Retry after: ${error.retryAt}`);
  }
}
```

## Cache Management

By default, Tempo AI functions integrate directly with `Tempo.cache` (`BoundedCache`) to store pre-resolved ISO 8601 results, drastically reducing LLM API calls and network latency on repetitive queries. 

### Array Processing & Token Economics

When you pass an array of inputs to AI functions (such as `parseAI`), the plugin intentionally does **not** batch them into a single massive LLM request. Instead, it iterates through the array and processes each item individually. 

This is by design for three critical reasons:
1. **Cache Efficiency**: Individual processing allows AI functions to instantly resolve duplicate strings against `Tempo.cache`, saving massive amounts of API tokens. If you pass an array of 10,000 dates, but only 1,000 are unique, only 1,000 network requests are made. 
2. **Token Economics**: A single request consumes ~100 tokens (System Prompt + User String + Output ISO). Given that frontier models cost cents per million tokens, the risk of array-misalignment bugs (see below) far outweighs the negligible savings of batching system prompts.
3. **Deterministic Safety**: LLMs are language models, not arrays. If you pass 50 strings, smaller models often hallucinate and return 49 strings, completely breaking your array indexing. By querying sequentially, we guarantee a strict 1:1 mapping and ensure one invalid string doesn't crash the entire batch.

> [!WARNING]  
> **Granular Time Gotcha**: The cache key is automatically salted with the **calendar date** (`yyyy-mm-dd`) of the execution anchor. By default this uses the system execution date, but when `options.anchor` is explicitly set, it uses the caller-provided anchor date. Note that keeping a fixed anchor date retains the same cache key across midnight boundaries, so an automatic midnight cache miss is not guaranteed.

### Soft Errors in Array Batches

When processing arrays of inputs, an unparseable input or provider failure on one item will throw an error by default, stopping execution. Passing `softErrors: true` allows AI functions to return invalid `Tempo` instances (`isValid === false`) for failing items while completing the rest of the array:

```typescript
const dates = await parseAI(["Thanksgiving 2026", "INVALID_PROMPT_STRING"], { softErrors: true });
console.log(dates[0].isValid); // true
console.log(dates[1].isValid); // false
```

### Static Glossary Seeding

In addition to dynamic cache lookups, `initAI` can be initialized with a pre-seeded `BoundedCache` or synchronous `Map` containing immortal static business terms (e.g. company glossaries). Static entries bypass TTL expiration and LLM network requests:

```typescript
const glossary = new Map([
  ['fiscal_q3_start', '2026-07-01T00:00:00Z'],
  ['annual_shutdown', '2026-12-24T00:00:00Z']
]);

initAI({
  providers: [{ id: 'openai', key: process.env.OPENAI_API_KEY }],
  cache: glossary
});

const start = await parseAI('fiscal_q3_start'); // Resolves instantly from static cache without hitting network!
```

### Bypassing Cache & Forcing Network Requests
Passing `cache: false` disables reading and writing to the cache, but native pre-parsing may still resolve standard phrases. To guarantee an LLM provider request while disabling caching of the response, combine `force: true` with `cache: false`:

```typescript
// Forces an LLM network request and prevents reading or writing to cache
const dt = await parseAI("The last Friday before Christmas", { force: true, cache: false });
```

### Evicting Bad Parses
If the LLM hallucinates or returns an incorrect absolute date, you can explicitly purge the string from the cache:

```typescript
import { clearAiCache } from '@magmacomputing/tempo-plugin-ai';

// Evict a single string
clearAiCache("2nd tuesday in nov");
```

### Forcing a Refresh
If you want to explicitly query the LLM again and *overwrite* the existing cache entry with the new result, use the `force: true` flag:

```typescript
const dt = await parseAI("Q3_START", { force: true });
```

### Extensible Caching & Async Storage Adapters (`AiCacheAdapter`)

By default, parsed AI responses are cached in memory using `Tempo.cache` (`BoundedCache`). For distributed serverless environments (e.g. Next.js, Cloudflare Workers, Express) or cluster nodes, you can pass a custom synchronous or asynchronous storage adapter (`AiCacheAdapter`):

```typescript
import { initAI, parseAI, type AiCacheAdapter } from '@magmacomputing/tempo-plugin-ai';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_URL!, token: process.env.UPSTASH_TOKEN! });

// Implement custom async Redis storage adapter with namespacing & prefix deletion support
const redisAdapter: AiCacheAdapter = {
  get: async (key) => (await redis.get<string>(`tempo:ai:${key}`)) ?? undefined,
  set: async (key, value, ttlMs) => {
    if (ttlMs !== undefined) await redis.set(`tempo:ai:${key}`, value, { px: ttlMs });
    else await redis.set(`tempo:ai:${key}`, value);
  },
  delete: async (key) => {
    await redis.del(`tempo:ai:${key}`);
  },
  clear: async (prefix) => {
    const pattern = prefix ? `tempo:ai:${prefix}*` : `tempo:ai:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  }
};

initAI({
  providers: [{ id: 'groq', key: process.env.GROQ_API_KEY!, ttl: 7200000 }], // Provider-specific TTL (2 hours)
  cacheAdapter: redisAdapter,
  ttl: 3600000 // Global default TTL (1 hour)
});

// Call-site TTL override (15 minutes)
const dt = await parseAI("next Monday at 9am", { ttl: 900000 });
```

### Cascading TTL Resolution Policies

The plugin calculates cache TTL per entry using a strict resolution hierarchy:
1. **Call-site `options.ttl`**: `parseAI(prompt, { ttl: 900000 })`
2. **Provider-level `provider.ttl`**: `providers: [{ id: 'groq', ttl: 7200000 }]`
3. **Global `initAI({ ttl: 3600000 })`**
4. **Default TTL**: `3,600,000` ms (1 hour)

### Fail-Open Cache Resilience

Custom storage adapter calls (`adapter.get` and `adapter.set`) are wrapped in safe error handlers. If an external Redis instance crashes or encounters a network partition, the plugin logs a debug warning (if `debug: true`) and gracefully fails open to direct LLM resolution without crashing the application request.
