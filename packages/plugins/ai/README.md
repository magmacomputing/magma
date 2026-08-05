![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

> **Tempo community plugin for LLM-powered natural language parsing.**

This plugin bridges deterministic date math and unstructured NLP inputs, leveraging LLMs (Gemini, Groq, OpenAI, Ollama) to asynchronously parse complex natural language expressions into type-safe `Tempo` instances.

> 🔒 **Security Notice**: Raw LLM API keys must **never** be exposed in client-side browser bundles or client storage (`localStorage`, `sessionStorage`, `IndexedDB`). BYOK is only safe on backend servers or edge runtime proxies.

---

## ⚡ Quick Start

### 📦 Installation

```bash
npm install @magmacomputing/tempo-plugin-ai
```

### 🎯 Usage

```typescript
import { parseAI, initAI, clearAiCache } from '@magmacomputing/tempo-plugin-ai';

// Initialize with your BYOK API keys
initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY! }
  ]
});

// Parse natural language into a Tempo instance!
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");

console.log(dt.format('{yyyy}-{mm}-{dd}')); // 2026-11-17
console.log(dt.ai?.confidence);            // 0.98
console.log(dt.ai?.provider);              // 'groq'

// Evict cached resolution
clearAiCache("The penultimate Tuesday before Thanksgiving in 2026");
```

---

## ✨ Features & Architecture

* 🤖 **Multi-Provider Routing**: Native support for Groq, OpenAI, Gemini, Mistral, and local Ollama nodes with automatic fallback.
* 🌐 **Dynamic Provider Manifest**: Model IDs and endpoints are lazily updated via hosted JSON manifests with 1500ms fail-open air-gapped fallbacks.
* ⚡ **Two-Tier Caching**: Combines fast local in-memory LRU caching (`BoundedCache`) with optional async storage adapters (`AiCacheAdapter` for Redis / Cloudflare KV).
* ⏱️ **Cascading TTL Policies**: Granular TTL control at call-site, provider, or global levels for TTL-enforcing storage adapters (built-in `Tempo.cache` maintains its independently configured TTL).
* 🛡️ **Fail-Safe Confidence Bounds**: Configurable `minConfidence` thresholds and array batch processing with soft-error handling.

---

## 📚 Documentation

For complete API references, architecture guides, and advanced examples (Redis adapters, custom provider setups, race/consensus execution modes):

📖 **[Read the Official AI Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html)**

---

## ⚖️ Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
