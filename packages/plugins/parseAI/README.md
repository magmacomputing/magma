![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai)

Tempo community plugin for LLM-powered natural language parsing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse complex natural language expressions into `Tempo` instances.

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
    { id: 'groq', key: process.env.GROQ_API_KEY },
  ]
});

// Parse a complex natural language string!
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");

// Evict bad parses from the cache
clearAiCache("The penultimate Tuesday before Thanksgiving in 2026");
```

Full documentation is available at [https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html](https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
