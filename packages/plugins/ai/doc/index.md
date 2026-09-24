![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ai

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ai/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ai?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo community plugin for LLM-powered natural language date parsing, schedule compilation, and temporal processing.

This plugin bridges the gap between deterministic date-math and unstructured NLP inputs, utilizing large language models (like Gemini, Groq, or OpenAI) to safely and asynchronously parse, format, and process complex natural language temporal expressions into `Tempo` instances.

::: warning 🔒 Security Notice
Raw LLM API keys must **never** be exposed in client-side browser bundles or stored in any client-side storage mechanisms (`localStorage`, `sessionStorage`, `IndexedDB`, OPFS / Origin Private File System, or browser cache). We recommend **zero browser storage** for API credentials; BYOK (Bring Your Own Key) is only secure on backend servers (Node, edge workers). For public frontend applications, route requests through a secure backend proxy service.
:::

## Installation & Quickstart
 
```bash
npm install @magmacomputing/tempo-plugin-ai
```

<PluginRepl plugin="ai" />

## Two Usage Patterns: Namespace vs Tree-Shakeable Functions

The AI plugin provides two distinct integration approaches:

| Approach | Import Syntax | Ideal For |
| :--- | :--- | :--- |
| **Cohesive Namespace** | `import { AiPlugin } from '@magmacomputing/tempo-plugin-ai'` | Full-featured apps, Node.js backends, REPLs, and IDE auto-complete via `Tempo.ai.*` |
| **Tree-Shakeable Functions** | `import { parseAI, initAI } from '@magmacomputing/tempo-plugin-ai'` | Minimal client-side bundles and microservices importing only specific functions |

---

### Pattern A: `Tempo.ai` Cohesive Namespace
Installing `AiPlugin` mounts the frozen **`Tempo.ai`** static action namespace onto `Tempo`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { AiPlugin } from '@magmacomputing/tempo-plugin-ai';

Tempo.use(AiPlugin);

// All AI capabilities are available under Tempo.ai.*
await Tempo.ai.init({ provider: 'tempo' });
const event = await Tempo.ai.parse("next Tuesday around 2:30pm");
```

#### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ai/install';

const event = await Tempo.ai.parse("next Tuesday around 2:30pm");
```

---

### Pattern B: Tree-Shakeable Standalone Functions
For bundle-sensitive projects, import individual functions directly without attaching anything to `Tempo`:

```typescript
import { initAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// 1. Initialize trial sandbox or explicit providers
await initAI({ provider: 'tempo' });

// 2. Call standalone function directly
const dt = await parseAI("The penultimate Tuesday before Thanksgiving in 2026");
console.log(dt.format('{yyyy}-{mm}-{dd}')); // 2026-11-17
```

---

## AI Function Catalog
All AI functions return a standard ES Promise and are accessible either as standalone tree-shakeable functions or via the cohesive `Tempo.ai.*` namespace.

| Standalone Function / `Tempo.ai` Method | Input | Returns (`Promise<...>`) | Description | Doc |
| :--- | :--- | :--- | :--- | :---: |
| **`parseAI`**<br/>`Tempo.ai.parse` | Natural language text string(s) | `Tempo` \| `Tempo[]` \| `(Tempo \| TempoAiError)[]` | Single point-in-time `Tempo` instance (or batch array) | <a href="./ai.parse.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`formatAI`**<br/>`Tempo.ai.format` | Date-time + prompt / style | `TempoAiFormatResult` \| `TempoAiFormatResult[]` \| `(TempoAiFormatResult \| TempoAiError)[]` | **Contextual narrative date formatting** (`formatted`, `confidence`, `provider`, `reasoning`) | <a href="./ai.format.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`extractAI`**<br/>`Tempo.ai.extract` | Unstructured text string(s) | `TempoAiExtractResult` \| `TempoAiExtractResult[]` \| `(TempoAiExtractResult \| TempoAiError)[]` | **Extracted temporal entities & calendar events** (`events: TempoExtractedEvent[]`, `confidence`, `reasoning`) | <a href="./ai.extract.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`recurrenceAI`**<br/>`Tempo.ai.recurrence` | Natural language pattern or RRULE string | `TempoRecurrenceResult` | **Iterable series of `Tempo` dates** (with `.take(n)`, `[Symbol.iterator]`, & RRULE string) | <a href="./ai.recurrence.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`scheduleAI`**<br/>`Tempo.ai.schedule` | Booking prompt + busy constraints | `TempoScheduleResult` | **Resolved appointment slot** (`start`, `end`, `slot`, `alternatives`, `ai.conflictBumped`) | <a href="./ai.schedule.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`diffAI`**<br/>`Tempo.ai.diff` | Start & End dates + prompt | `TempoAiDiffResult` \| `TempoAiDiffResult[]` \| `(TempoAiDiffResult \| TempoAiError)[]` | **Narrative time delta & business days** (`formatted`, `businessDays`, `days`, `hours`, `holidays`) | <a href="./ai.diff.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`contextAI`**<br/>`Tempo.ai.context` | Context text string(s) | `TempoContext` \| `TempoContext[]` \| `(TempoContext \| TempoAiError)[]` | **Inferred regional context** (`timeZone`, `locale`, `calendar`, `sphere`) | <a href="./ai.context.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |
| **`initAI`**<br/>`Tempo.ai.init` | Provider config & API keys | `void` | Configured AI provider farm | <a href="./ai.init.html" class="btn btn-secondary icon-btn" title="View Documentation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></a> |

### Summary of Distinct Return Contracts

To streamline error handling and data consumption, return shapes across the AI plugin follow three distinct contracts:

| Category | Functions | Return Type | Single Query Low-Confidence / Failure | Batch Array `softErrors: true` Contract |
| :--- | :--- | :--- | :--- | :--- |
| **Point-in-Time Date** | `parseAI` | `Tempo` (with `.ai`) | Throws `TempoAiError` (or returns invalid `Tempo` if `minConfidence` threshold unmet) | Returns invalid `Tempo` (`isValid === false`) in array position |
| **Structured AI Objects** | `formatAI`<br/>`extractAI`<br/>`diffAI`<br/>`contextAI` | `TempoAiFormatResult`<br/>`TempoAiExtractResult`<br/>`TempoAiDiffResult`<br/>`TempoContext` | Throws `TempoAiError` (422 for low confidence, 429 for quota, 500 for network) | Returns typed `TempoAiError` object directly in array position |
| **Intervals & Generators** | `scheduleAI`<br/>`recurrenceAI` | `TempoScheduleResult` (Proxied `Interval<Tempo>`)<br/>`TempoRecurrenceResult` (`.take(n)`) | Throws `TempoAiError` (Single item query only) | N/A (Single query operations) |

## Architecture & Infrastructure Guides

> [!IMPORTANT]
> **Production Recommendation**: Due to the complexities of LLM APIs, including caching gotchas, context injection, rate limits, and calendar math hallucinations, we strongly recommend reading the dedicated guides below before deploying this plugin in a production environment. 

- [Security & Privacy Architecture](./security.md) (Smart Debug Telemetry, PII Masking, HTTPS & Proxy Introspection)
- [Multi-Provider Execution Modes](./modes.md) (Hedged, RoundRobin, Adaptive, Race, Consensus, Fallback)
- [Provider Architecture & Security](./architecture.md) (BYOK vs Proxy patterns, Browser Security, TLS 1.3 & Privacy Guarantees)
- [Grounding & Natural Language Parsing](./grounding.md) (How Timezone and Locale are injected)
- [Rate Limits & Cache Management](./rate-limits.md) (Tracking API quotas, handling 429 errors, and custom Redis caches)

## Community Feedback & Production Notice

> [!NOTE]
> **Community Feedback & Prompt Engineering**
> While `@magmacomputing/tempo-plugin-ai` utilizes deterministic grounding, schema enforcement, and confidence validation, LLM outputs can vary across models and prompt styles. We actively welcome community feedback and prompt optimizations—please report any edge cases or suggestions on the [Magma GitHub Issue Tracker](https://github.com/magmacomputing/magma/issues/new?template=bug_report_ai.yml).
>
> **Production Notice & "As-Is" Disclaimer**: Magma Computing Solutions and the Tempo core maintainers provide `@magmacomputing/tempo-plugin-ai` "as-is" without warranty of any kind. Large Language Models operate probabilistically; developers and system architects are responsible for validating AI-generated temporal outputs before committing them to financial, legal, medical, or life-critical applications.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.

