![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

> [!WARNING]
> **🧪 EXPERIMENTAL PLUGIN**
> This plugin relies on Generative AI. While it uses strict JSON schemas and validation to force deterministic outputs, LLMs (especially smaller models) can still hallucinate complex calendar math. We are actively collecting feedback on prompt engineering and model reliability. Please report any strange behavior or unexpected hallucinations on the [Magma GitHub Issues](https://github.com/magmacomputing/magma/issues) page!

> [!CAUTION]
> **LLM Output Disclaimer**: Magma Computing Solutions and the Tempo core maintainers provide `@magmacomputing/tempo-plugin-ai` "as-is" without warranty of any kind. Large Language Models are probabilistic text generators, not deterministic calculators. Developers and organization operators are solely responsible for validating AI-generated date and time outputs before relying on them in financial, legal, medical, or time-critical production systems.

Tempo community plugin for LLM-powered natural language parsing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse complex natural language expressions into `Tempo` instances.

> **Note**: This plugin is **not** a silver-bullet replacement for all your parsing needs! `Tempo.parse()` natively handles structured dates and formats phenomenally well using its Aliases, Layouts, and Snippets. The `parseAI` plugin is specifically designed to be an alternative path for handling completely unstructured, conversational human language that would otherwise be impossible to Regex.
>
> **CRITICAL SECURITY WARNING**: Raw LLM API keys must **never** be exposed in a client-side browser bundle. BYOK (Bring Your Own Key) is only secure on backend servers (Node, edge workers). For public frontend applications, you must use a proxy service.

## Ideal Use-Cases

Good `parseAI` candidates represent unstructured, conversational, or event-driven natural language expressions that are impossible to Regex or parse with standard relative offset rules:

- **Holiday & Relative Calendar Math**: `"The Friday after Thanksgiving"`, `"The penultimate Tuesday before Christmas"`
- **Named Cultural / Event Terms**: `"Star Wars Day at 5pm"`, `"A fortnight after Labor Day"`
- **Conversational Relative Terms**: `"The last working day of Q3"`, `"Midday on the summer solstice"`

> **Avoid Simple Offsets**: Phrases like `"in 5 minutes"`, `"tomorrow"`, or `"next Friday"` are natively intercepted and resolved by core `Tempo` without calling the LLM (unless `force: true` is passed).

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
  debug: true // (Development-only) Enable verbose console logging
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
Passing `debug: true` into `initAI` is intended for **development environments only**. It will globally log system prompts, localized context, and raw LLM responses to the console. Because prompts, context, and responses may contain user-supplied or sensitive data, disable `debug: true` or redact sensitive logs in production.

**Forced Evaluation**
If a relative query (like `"The Friday after Thanksgiving"`) is intercepted by the native `Tempo` layout engine, but the anchor context inheritance is returning an undesired timezone, you can forcefully bypass the deterministic engine and the cache by passing `force: true`:

```typescript
const dt = await parseAI("The Friday after Thanksgiving", { 
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
