# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-ai` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-04

### Added
- **3-Tier Timeout Resolution Hierarchy**: Introduced flexible, multi-level request timeout control for LLM API queries to prevent network hangs and ensure predictable SLAs:
  1. *Call-site override*: `parseAI(input, { timeout: 3000 })`
  2. *Provider-specific override*: `{ id: 'groq', options: { timeout: 2000 } }`
  3. *Global baseline default*: `initAI({ timeout: 5000 })` (falls back to default 15,000ms).
- **Timeout-Triggered Provider Cascade**: Stalled or slow provider requests trigger an `AbortSignal` cancellation, allowing `AiMode.Fallback` to instantly cascade to secondary providers and `AiMode.Race` to clean up lagging request promises.
- **Request-Locked `.ai.limits` Metadata**: Attached `limits` (`remainingRequests`, `remainingTokens`, `resetAt`) directly to the `.ai` metadata container (`TempoAiMeta`) of returned `Tempo` instances, locking HTTP header rate-limit snapshots to individual requests and preventing concurrency overwrites.
- **Async Storage Adapters (`AiCacheAdapter`)**: Introduced custom storage engine support (`AiCacheAdapter`) in `initAI` and `parseAI` for distributed serverless environments (e.g. Upstash Redis, Cloudflare KV, Memcached).
- **Cascading Cache TTL Hierarchy**: Implemented strict 4-tier TTL resolution (`options.ttl` > `provider.ttl` > `global config.ttl` > default 1 hour) for fine-grained cache entry expiration control on stores enforcing TTL.
- **Fail-Open Storage Resilience**: Custom cache adapter errors during `get()` or `set()` operations fail open silently to direct LLM resolution, preserving application request uptime.
- **Dynamic Remote Provider Manifest (`loadRemoteManifest`)**: Lazily fetches remote provider defaults (`providers.v1.json`) on initialization with a 1500ms timeout and automatic air-gapped fallback to compiled `DEFAULT_PROVIDERS`.
- **Cache Eviction Synchronization**: Enhanced `clearAiCache()` to flush matching keys and prefixes across both `Tempo.cache` and custom `AiCacheAdapter` storage engines, returning `Promise<void>` to await async adapter eviction.

## [0.2.0] - 2026-07-30

### Added
- **Parallel Array Batching & Index Locking**: Concurrently processes array prompt inputs via `Promise.all` (or `Promise.allSettled` when `softErrors: true`) with guaranteed index-locked alignment between inputs and output arrays.
- **Multi-Stream Provider Execution Modes (`AiMode`)**: Added `mode` options (`AiMode.Fallback`, `AiMode.Race`, `AiMode.Consensus`) for fine-grained control over provider routing, speculative racing, and multi-LLM consensus verification with confidence boosting.
- **Runtime Configuration Module (`parseAI.config.ts`)**: Extracted `AiMode`, `RESERVED_PROVIDER_IDS`, and `DEFAULT_PROVIDERS` into a runtime module adhering to Tempo's monorepo `as const` object map and `Object.freeze()` immutability standards.
- **Secured `.ai` Metadata Interceptor**: Proxy-based `.ai` metadata injection for frozen `Tempo` instances, preserving private class field access while exposing provider resolution lineage, ambiguity metrics, and PII-isolated debugging fields (`debug: true`).
- **Semantic LLM Failure & Soft Error Handling**: Opt-in `softErrors: true` for returning `TempoAiError` objects directly within batch output arrays without throwing, and graceful mapping of LLM `"INVALID"` responses to `isValid = false` `Tempo` instances.
- **Centralized Caching Integration**: Powered by core Tempo's centralized `BoundedCache` singleton (`Tempo.cache`) enforcing memory safety, capacity-bounded LRU eviction (`maxSize`), time-to-live expiration (`ttl`), and static immortal glossary isolation.
- **Multi-Provider Fallback Routing**: Robust failover loop across configured LLM providers (`groq`, `openai`, `gemini`, `mistral`, or custom endpoints). Supports custom `tokenParam` mappings (`max_tokens` vs `max_completion_tokens`) and request timeout control via `AbortController`.
- **Rate Limit Tracking (`getAiRateLimits`)**: Inspects provider HTTP response headers (`x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`, `x-ratelimit-reset-tokens`) and exposes real-time quota status via `getAiRateLimits()`, including a `resetAt` `Tempo` timestamp.
- **Structured Error Handling (`TempoAiError`)**: Custom error class providing HTTP status codes (`code`) and optional `retryAt` `Tempo` timestamps. Features a circuit-breaker that immediately stops provider failovers when an LLM returns an explicit `INVALID` parse result (422 status).
- **Documentation & Spec Suite**: Complete architectural guides (`architecture.md`, `context.md`, `rate-limits.md`, `index.md`) and a full Vitest test suite (`test/index.spec.ts`) covering live and mocked provider workflows.

### Changed & Performance
- **Centralized Caching Architecture**: Delegated all cache capacity and TTL parameters directly to core `Tempo.init()`, allowing `initAI` to focus strictly on LLM provider registration.
- **Non-Destructive Glossary Appending**: Custom glossaries provided via `initAI({ cache })` are safely appended to `Tempo.cache` as static immortal terms without destructive overrides.
- **Silent Native Pre-Parsing & Cache Controls**: `parseAI` attempts fast, zero-latency native `Tempo` resolution and checks `Tempo.cache` before initiating LLM network calls. Supports `cache: false` to bypass cache lookups and `force: true` to force a fresh LLM API request.
- **Anchor Instance Reuse & Cache Salting**: Reuses anchor `Tempo` instances to minimize memory allocations and salts cache keys with the anchor's date and system context (`timeZone`, `calendar`, `locale`, `sphere`), preventing stale cache hits across midnight boundaries or context shifts.
- **Resilient Cache Invalidation**: Normalized cache key input (whitespace trimming and case insensitivity) for `clearAiCache` and internal lookups.

## [0.1.0] - 2026-07-26

### Added
- Initial scaffolding of the AI natural language parsing plugin.
- Functional exports for `parseAI`, `initAI`, and `clearAiCache`.
- Initial provider fallback-routing engine supporting HTTP requests to configured LLM provider endpoints.
