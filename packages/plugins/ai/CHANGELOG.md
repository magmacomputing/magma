# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-ai` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-30

### Added
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
- Initial fallback-routing logic (mocked proxy).
