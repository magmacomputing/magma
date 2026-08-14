![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo community plugin for LLM-powered natural language date parsing, schedule compilation, and temporal processing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse, format, and process complex natural language temporal expressions into `Tempo` instances.

::: warning 🔒 Security Notice
Raw LLM API keys must **never** be exposed in client-side browser bundles or stored in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`, or browser cache). BYOK (Bring Your Own Key) is only secure on backend servers (Node, edge workers). For public frontend applications, route requests through a secure backend proxy service.
:::

## Installation & Quickstart

```bash
npm install @magmacomputing/tempo-plugin-ai
```

```typescript
import { parseAI, initAI } from '@magmacomputing/tempo-plugin-ai';

// Initialize provider farm (Node/SSR backend)
await initAI({
  providers: [{ id: 'groq', key: process.env.GROQ_API_KEY }]
});

// Parse natural language temporal expressions
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");
console.log(dt.format('{yyyy}-{mm}-{dd}')); // 2026-11-17
```

## AI Function Catalog
All AI functions return a standard ES Promise wrapped object.

| Function | Input | Returns (`Promise<...>`) | Description | Doc |
| :--- | :--- | :--- | :--- | :---: |
| **`parseAI`** | Natural language text string(s) | `Tempo` \| `Tempo[]` \| `(Tempo \| TempoAiError)[]` | Single point-in-time `Tempo` instance (or batch array) | <a href="./ai.parseAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`formatAI`** | Date-time + prompt / style | `TempoAiFormatResult` \| `TempoAiFormatResult[]` \| `(TempoAiFormatResult \| TempoAiError)[]` | **Contextual narrative date formatting** (`formatted`, `confidence`, `provider`, `reasoning`) | <a href="./ai.formatAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`extractAI`** | Unstructured text string(s) | `TempoAiExtractResult` \| `(TempoAiExtractResult \| TempoAiError)[]` | **Extracted temporal entities & calendar events** (`events: TempoExtractedEvent[]`, `confidence`, `reasoning`) | <a href="./ai.extractAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`recurrenceAI`** | Natural language pattern or RRULE string | `TempoRecurrenceResult` | **Iterable series of `Tempo` dates** (with `.take(n)`, `[Symbol.iterator]`, & RRULE string) | <a href="./ai.recurrenceAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`scheduleAI`** | Booking prompt + busy constraints | `TempoScheduleResult` | **Resolved appointment slot** (`start`, `end`, `slot`, `alternatives`, `ai.conflictBumped`) | <a href="./ai.scheduleAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`diffAI`** | Start & End dates + prompt | `TempoAiDiffResult` \| `TempoAiDiffResult[]` \| `(TempoAiDiffResult \| TempoAiError)[]` | **Narrative time delta & business days** (`formatted`, `businessDays`, `days`, `hours`, `holidays`) | <a href="./ai.diffAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`contextAI`** | Context text string(s) | `TempoContext` \| `TempoContext[]` \| `(TempoContext \| TempoAiError)[]` | **Inferred regional context** (`timeZone`, `locale`, `calendar`, `sphere`) | <a href="./ai.contextAI.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |
| **`initAI`** | Provider config & API keys | `void` | Configured AI provider farm | <a href="./ai.init.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="View Documentation"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a> |

## Architecture & Infrastructure Guides

> [!IMPORTANT]
> **Production Recommendation**: Due to the complexities of LLM APIs, including caching gotchas, context injection, rate limits, and calendar math hallucinations, we politely but firmly recommend reading the dedicated guides below before deploying this plugin in a production environment. 

- [Multi-Provider Execution Modes](./modes.md) (Hedged, RoundRobin, Adaptive, Race, Consensus, Fallback)
- [Provider Architecture & Security](./architecture.md) (BYOK vs Proxy patterns, Browser Security, TLS 1.3 & Privacy Guarantees)
- [Grounding & Natural Language Parsing](./grounding.md) (How Timezone and Locale are injected)
- [Rate Limits & Cache Management](./rate-limits.md) (Tracking API quotas, handling 429 errors, and custom Redis caches)

## Community Feedback & Production Notice

> [!NOTE]
> **Community Feedback & Prompt Engineering**
> While `@magmacomputing/tempo-plugin-ai` utilizes deterministic grounding, schema enforcement, and confidence validation, LLM outputs can vary across models and prompt styles. We actively welcome community feedback and prompt optimizations—please report any edge cases or suggestions on the [Magma GitHub Issue Tracker](https://github.com/magmacomputing/magma/issues/new?template=bug_report_ai.yml).

> [!CAUTION]
> **Production Notice & "As-Is" Disclaimer**: Magma Computing Solutions and the Tempo core maintainers provide `@magmacomputing/tempo-plugin-ai` "as-is" without warranty of any kind. Large Language Models operate probabilistically; developers and system architects are responsible for validating AI-generated temporal outputs before committing them to financial, legal, medical, or life-critical applications.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

