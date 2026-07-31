# Rate Limits & Cache Management

When using third-party AI APIs, your application is subject to strict rate limits. 

The plugin automatically tracks these limits by reading the standard `x-ratelimit-*` HTTP headers returned by providers like OpenAI and Groq. 

## Tracking Quota Real-time
To expose this data without ruining the clean `Promise<Tempo>` return type of the parse method, the plugin provides a dedicated utility function: `getAiRateLimits()`.

```typescript
import { getAiRateLimits } from '@magmacomputing/tempo-plugin-ai';

// Returns the stats from the most recent LLM proxy request
const stats = getAiRateLimits(); 

if (stats) {
  console.log(`Remaining Tokens: ${stats.remainingTokens}`); 
  console.log(`Remaining Requests: ${stats.remainingRequests}`); 
  console.log(`Limits Reset At: ${stats.resetAt.format('{hh}:{mi}:{ss}')}`); 
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

By default, the plugin maintains an internal `Map` of strings to their respective ISO 8601 results to drastically reduce LLM API calls and latency on repetitive queries. 

### Array Processing & Token Economics

When you pass an array of strings to `parseAI`, the plugin intentionally does **not** batch them into a single massive LLM request. Instead, it iterates through the array and processes each string individually. 

This is by design for three critical reasons:
1. **Cache Efficiency**: Individual processing allows the plugin to instantly resolve duplicate strings against the local cache, saving massive amounts of API tokens. If you pass an array of 10,000 dates, but only 1,000 are unique, the plugin only makes 1,000 requests. 
2. **Token Economics**: A single request consumes ~100 tokens (System Prompt + User String + Output ISO). Given that frontier models cost pennies per million tokens, the risk of array-misalignment bugs (see below) far outweighs the negligible savings of batching system prompts.
3. **Deterministic Safety**: LLMs are language models, not arrays. If you pass 50 strings, smaller models often hallucinate and return 49 strings, completely breaking your array indexing. By querying sequentially, we guarantee a strict 1:1 mapping and ensure one invalid string doesn't crash the entire batch.

> [!WARNING]  
> **Granular Time Gotcha**: The cache key is automatically salted with the **calendar date** (`yyyy-mm-dd`) of the execution anchor. By default this uses the system execution date, but when `options.anchor` is explicitly set, it uses the caller-provided anchor date. Note that keeping a fixed anchor date retains the same cache key across midnight boundaries, so an automatic midnight cache miss is not guaranteed.

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

### Extensible Caching (Enterprise)
For edge environments or custom application architectures, the plugin supports custom cache implementations!

You can provide any object that implements the standard **synchronous** `Map<string, string>` interface (`get`, `set`, `has`, `delete`). Note that all cache adapter methods must execute synchronously, as the internal cache lookup engine does not await promise-returning cache operations.

```typescript
// Custom synchronous cache implementation
initAI({
  providers: [{ id: 'groq', key: '...' }],
  cache: new MyCustomSyncCache()
});
```
