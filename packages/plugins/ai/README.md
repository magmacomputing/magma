![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo community plugin for LLM-powered natural language parsing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse complex natural language expressions into `Tempo` instances.

> **CRITICAL SECURITY WARNING**: Raw LLM API keys must **never** be exposed in a client-side browser bundle or stored in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`, or browser cache). Client-side storage is vulnerable to XSS attacks, malicious scripts, and browser extension extraction, which can result in API key theft and quota abuse. BYOK (Bring Your Own Key) is only secure on backend servers (Node, edge workers). For public frontend applications, you must route requests through a secure backend proxy service.
>
> **LLM Output Disclaimer**: Large Language Models are probabilistic text generators, not deterministic calculators. Magma Computing Solutions and Tempo core maintainers provide `@magmacomputing/tempo-plugin-ai` "as-is". Developers and organizations are solely responsible for validating AI-generated date and time outputs before relying on them in financial, legal, medical, or time-critical production systems.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ai
```

## Setup & Usage

```typescript
import { parseAI, initAI, clearAiCache } from '@magmacomputing/tempo-plugin-ai';

// Initialize with your BYOK API Key (ensuring non-undefined string key)
initAI({
  providers: [
    ...(process.env.GROQ_API_KEY ? [{ id: 'groq', key: process.env.GROQ_API_KEY }] : []),
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
