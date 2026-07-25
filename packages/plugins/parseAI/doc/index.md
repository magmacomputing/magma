![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai)

> [!WARNING]
> **🧪 EXPERIMENTAL PLUGIN**
> This plugin relies on Generative AI. While it uses strict JSON schemas and validation to force deterministic outputs, LLMs (especially smaller models) can still hallucinate complex calendar math. We are actively collecting feedback on prompt engineering and model reliability. Please report any strange behavior or unexpected hallucinations on the [Magma GitHub Issues](https://github.com/magmacomputing/magma/issues) page!

Tempo community plugin for LLM-powered natural language parsing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse complex natural language expressions into `Tempo` instances.

> **Note**: This plugin is **not** a silver-bullet replacement for all your parsing needs! `Tempo.parse()` natively handles structured dates and formats phenomenally well using its Aliases, Layouts, and Snippets. The `parseAI` plugin is specifically designed to be an alternative path for handling completely unstructured, conversational human language that would otherwise be impossible to Regex.

> **CRITICAL SECURITY WARNING**: Raw LLM API keys must **never** be exposed in a client-side browser bundle. BYOK (Bring Your Own Key) is only secure on backend servers (Node, edge workers). For public frontend applications, you must use a proxy service.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ai
```

## Setup & Usage

```typescript
import { parseAI, initAI, clearAiCache } from '@magmacomputing/tempo-plugin-ai';

// Initialize with your BYOK API Key
initAI({
  providers: [
    { id: 'openai', key: process.env.OPENAI_API_KEY, model: 'gpt-5.4-mini' },
  ],
  debug: true // (Optional) Enable verbose console logging
});
```

> **Tip**: `initAI` is fully re-callable! You can call it multiple times during your application's lifecycle to hot-swap API keys or update your fallback providers mid-stream without restarting your server.

```typescript
// Parse a complex natural language string!
const dt1 = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");

// Evict bad parses from the cache
clearAiCache("The penultimate Tuesday before Thanksgiving in 2026");
```

## Debugging & Forced Evaluation

When building your LLM queries, it is often useful to see exactly how `parseAI` is routing your data. 

**Global Debugging**
Passing `debug: true` into `initAI` will globally log the exact system prompt, localized context string, and stringified JSON response returned by the LLM. It will also log when a string is resolved purely natively or served from the cache!

**Forced Evaluation**
If a relative query (like `"Next Friday"`) is perfectly intercepted by the native `Tempo` layout engine, but the anchor context inheritance is returning an undesired timezone, you can forcefully bypass the deterministic engine and the cache by passing `force: true`:

```typescript
const dt = await parseAI("Next Friday at 5pm", { 
  anchor: '2026-09-01T00:00:00Z', 
  force: true, // Bypasses native parsers & cache; forces a network LLM request!
  debug: true  // Overrides the global debug flag for this specific request
});
```

## Documentation Topics

> [!IMPORTANT]
> **Production Recommendation**: Due to the complexities of LLM APIs, including caching gotchas, context injection, rate limits, and calendar math hallucinations, we politely but firmly recommend reading the three dedicated guides below before deploying this plugin in a production environment. 

To learn more about configuring and optimizing the AI Plugin, check out the dedicated guides:
- [Provider Architecture & Security](./architecture.md) (BYOK vs Proxy patterns, Frontend Security)
- [Context & Natural Language Parsing](./context.md) (How Timezone and Locale are injected)
- [Rate Limits & Cache Management](./rate-limits.md) (Tracking API quotas, handling 429 errors, and custom Redis caches)

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
