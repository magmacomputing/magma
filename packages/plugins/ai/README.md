![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

> **Tempo community plugin for LLM-powered natural language date, schedule, and context processing.**

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
import { parseAI, initAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize with your API keys
await initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY! }
  ]
});

// Parse natural language into a standard Tempo instance!
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");

console.log(dt.format('{yyyy}-{mm}-{dd}')); // 2026-11-17
console.log(dt.ai?.provider);               // 'groq'
console.log(dt.ai?.confidence);             // 0.98
```

---

## 📚 AI Endpoint Catalog

| Endpoint | Description | Doc |
| :--- | :--- | :---: |
| **`parseAI`** | Parse relative/point-in-time dates (e.g. *"next Friday at 4pm"*) | <a href="./doc/parseAI.md" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`recurrenceAI`** | Convert repeating patterns (e.g. *"every 2 weeks on Friday"*) to RRULEs | <a href="./doc/recurrenceAI.md" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`diffAI`** | Calculate natural language difference & business days between dates | <a href="./doc/diffAI.md" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`scheduleAI`** | Book appointment slots around busy calendar event bounds | <a href="./doc/scheduleAI.md" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`contextAI`** | Infer timezone, locale, and calendar from user profiles/bios | <a href="./doc/contextAI.md" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |

---

## ✨ Features & Architecture

* 🤖 **Multi-Provider Routing**: Native support for Groq, OpenAI, Gemini, Mistral, and local Ollama nodes with automatic fallback.
* 🌐 **Dynamic Provider Manifest**: Model IDs and endpoints are lazily updated via hosted JSON manifests with 1500ms fail-open air-gapped fallbacks.
* ⚡ **Two-Tier Caching**: Combines fast local in-memory LRU caching (`BoundedCache`) with optional async storage adapters (`AiCacheAdapter` for Redis / Cloudflare KV).
* ⏱️ **Cascading TTL Policies**: Granular TTL control at call-site, provider, or global levels for TTL-enforcing storage adapters.
* 🛡️ **Fail-Safe Confidence Bounds**: Configurable `minConfidence` thresholds and array batch processing with soft-error handling.

---

## 📚 Complete Guides

For complete API references, architecture guides, and advanced examples:
📖 **[Read the Official AI Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/ai.index.html)**

---

## ⚖️ Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
