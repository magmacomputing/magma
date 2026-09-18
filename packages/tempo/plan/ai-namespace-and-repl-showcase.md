# AI Architecture Plan: `Tempo.ai` Namespace & Interactive REPL Showcase

## Executive Summary
This document investigates the architectural design of `@magmacomputing/tempo-plugin-ai` within the Tempo ecosystem, specifically comparing a **namespaced static API (`Tempo.ai.*`)** versus top-level static function proliferation (`Tempo.parseAI`, `Tempo.scheduleAI`, etc.), and evaluates the cognitive relationship between the static `Tempo.ai` namespace and the instance-level `t.ai` resolution metadata.

It also preserves the implementation plan for the **Freeform REPL AI Feature Showcase** and free-tier provider routing.

---

## 1. Architectural Investigation: `Tempo.ai` Namespace Design

### The Core Problem: Static Namespace Pollution vs. Namespacing
Currently, `@magmacomputing/tempo-plugin-ai` exports individual standalone functions (`parseAI`, `formatAI`, `extractAI`, `recurrenceAI`, `scheduleAI`, `diffAI`, `contextAI`). 

If attached directly to the root `Tempo` class without a namespace, this would inject 7+ separate static functions (`Tempo.parseAI()`, `Tempo.scheduleAI()`, `Tempo.formatAI()`, etc.) into the global `Tempo` object.

### The Architectural Blueprint: Following `tempo-plugin-geo` (`Tempo.geo`)
In `@magmacomputing/tempo-plugin-geo`, all static functionality is encapsulated in a dedicated, frozen namespace object:

```typescript
// Established pattern in GeoPlugin:
Tempo.geo.lookup({ ip: '...' });
Tempo.geo.resolve(target);
Tempo.geo.distance(pos1, pos2);
Tempo.geo.solarOffset(lat, lng);
```

### Proposed `AiPlugin` Definition & `Tempo.ai` Namespace
By applying this same design to `@magmacomputing/tempo-plugin-ai`, we establish a clean, discoverable, and cohesive namespace:

```typescript
export const AiPlugin = definePlugin({
  name: 'ai',
  install(TempoClass, options?: AiConfig) {
    if (!Object.hasOwn(TempoClass, 'ai')) {
      const aiNamespace: TempoAiNamespace = {
        init: (opts?: AiConfig) => initAI(opts),
        parse: (input: string | string[], opts?: AiParseOptions) => parseAI(input, opts),
        schedule: (prompt: string, opts?: AiScheduleOptions) => scheduleAI(prompt, opts),
        format: (date: any, prompt: string, opts?: AiFormatOptions) => formatAI(date, prompt, opts),
        extract: (text: string, opts?: AiExtractOptions) => extractAI(text, opts),
        diff: (t1: any, t2: any, opts?: AiDiffOptions) => diffAI(t1, t2, opts),
        recurrence: (prompt: string, opts?: AiRecurrenceOptions) => recurrenceAI(prompt, opts),
        context: (date: any, opts?: AiContextOptions) => contextAI(date, opts),
        get config() { return getAiConfig(); },
        get rateLimits() { return getAiRateLimits(); },
        models: listProviderModels
      };

      Object.defineProperty(TempoClass, 'ai', {
        value: deepFreeze(aiNamespace),
        writable: false,
        configurable: false,
        enumerable: false
      });
    }

    // Prototype method for existing instances:
    TempoClass.prototype.formatAI = function (prompt: string, opts?: any) {
      return formatAI(this, prompt, opts);
    };
  }
});
```

---

## 2. Resolving the Cognitive Question: `Tempo.ai.*` (Static) vs. `t.ai` (Instance)

### Is there a cognitive disconnect between static `Tempo.ai` and instance `t.ai`?
**No. It represents an intuitive, clean separation of concerns: "Action Engine" vs. "Result Metadata".**

| Symbol | Scope | Role | Example |
| :--- | :--- | :--- | :--- |
| **`Tempo.ai.*`** | Static Namespace | **Verb / Action Engine** — Factory and transformation operations invoking LLMs | `const t = await Tempo.ai.parse("next Friday 3pm");` |
| **`t.ai`** | Instance Property | **Noun / State & Lineage** — Immutable audit metadata recording how the instance was resolved | `console.log(t.ai.provider, t.ai.cached, t.ai.confidence);` |

### Why This Mental Model is Natural:
1. **Symmetric with Established JavaScript & Tempo Patterns**:
   - `Tempo.geo.*` (static coordinate lookups) vs. `t.config.geo` (geographic location of that specific date instance).
   - `Math.sqrt()` (static operation) vs. numeric value.
   - `Intl.DateTimeFormat` (static constructor) vs. `formatter.resolvedOptions()` (instance state).
2. **Clear Autocomplete Distinction**:
   - Typing `Tempo.ai.` in an IDE displays executable actions (`parse`, `schedule`, `format`, `extract`, `diff`).
   - Typing `t.ai.` on a resolved instance displays the inspection fields (`provider`, `model`, `cached`, `ambiguous`, `granularity`, `rawIso`).

---

## 3. Plan: Freeform REPL AI Feature Showcase & Free Model Limits

### A. Free Model Limits & Provider Matrix

| Provider / Model | Free Tier Limits | Speed & Characteristics | Requirements |
| :--- | :--- | :--- | :--- |
| **Groq Cloud** (`llama-3.3-70b-versatile`) | **30 req/min, 14,400 req/day** | **Ultra-fast (<200ms)** — Best for instant UI keystroke testing | Free Groq API Key |
| **Google Gemini** (`gemini-1.5-flash`) | **15 req/min, 1,500 req/day** | Multi-lingual temporal reasoning, generous daily caps | Free AI Studio Key |
| **OpenRouter Free** (`llama-3.1-8b:free`) | **20–50 req/day** | Zero-cost community endpoints | OpenRouter Free Account |
| **Local Ollama** (`localhost:11434`) | **Unlimited** | 100% offline local LLM execution | Running Ollama daemon |
| **Offline AST Mock Provider** | **Unlimited (0ms)** | Instant simulation of AI parsing, AST slots & confidence | Zero setup, 100% offline |

### B. REPL Dropdown Snippet Spec

```typescript
// 🤖 Natural Language Date Parsing with @magmacomputing/tempo-plugin-ai
const { AiPlugin } = await import('@magmacomputing/tempo-plugin-ai');
Tempo.use(AiPlugin);

// 1. Initialize with your preferred provider (Groq, Gemini, or Mock)
Tempo.ai.init({
  providers: [
    { id: 'groq', key: 'YOUR_FREE_GROQ_KEY' || 'mock' }
  ]
});

// 2. Parse conversational date expression
const event = await Tempo.ai.parse("Meet at the corner cafe next Tuesday around 2:30pm for 45 min", { anchor: 'now' });

console.log('Resolved Timestamp:', event.format('{wkd}, {dd} {mon} {yyyy} at {hh}:{mi}'));
console.log('AI Provider Used:', event.ai?.provider);
console.log('Ambiguity Flag:', event.ai?.ambiguous);

// 3. Multi-point recurrence schedule
const schedule = await Tempo.ai.schedule("Every second Thursday at 10am until EOFY");
console.log('Next Recurrences:', schedule.take(3).map(t => t.format('{yyyy}-{mm}-{dd} {hh}:{mi}')));

return event.format('AI Event: {wkd}, {dd} {mon} {yyyy} at {hh}:{mi}');
```

---

## 4. Tree-Shaking vs. Namespacing & Side-Effect Activation

### A. Does a `Tempo.ai` namespace undo tree-shaking?
**For consumers of the namespace object (`Tempo.ai.*`), yes—and that is intentional.** 
Because bundlers cannot statically determine which dynamic properties on an object like `Tempo.ai` will be called at runtime, importing `AiPlugin` bundles the full AI namespace (`parse`, `schedule`, `format`, `extract`, `diff`, `recurrence`, `context`).

However:
1. **Shared Infrastructure Dominance**: In `@magmacomputing/tempo-plugin-ai`, over **80% of the payload** is the shared engine core (`transport.ts`, provider failover, cache, manifests, discovery, auth). The individual functions (`parse`, `format`, `schedule`) are lightweight prompt builders and schema normalizers (~2–4 KB each).
2. **Preserving Pure Tree-Shaking via Dual-Architecture**:
   We can preserve 100% tree-shaking for constrained serverless lambdas or microservices through **Subpath Exports**:

| Import Style | Use Case | Tree-Shaking | Mutates `Tempo`? |
| :--- | :--- | :--- | :--- |
| `import '@magmacomputing/tempo-plugin-ai';` | **Full DX / Frontend / Apps** | Bundles full `Tempo.ai.*` suite | Yes (`Tempo.ai.*`) |
| `import { parseAI } from '@magmacomputing/tempo-plugin-ai/parse';` | **Microservices / Lambdas** | **100% Tree-shaken** (only `parseAI` + transport) | **No** (Zero prototype mutation) |

---

### B. Side-Effect Auto-Registration: `import '@magmacomputing/tempo-plugin-ai'`

**Yes, side-effect auto-registration should be the default pattern, aligning with Tempo's modularity standards.**

Instead of requiring developers to manually write both `import` and `Tempo.use(AiPlugin)`, importing the package as a side-effect automatically detects the active `Tempo` class and mounts the `Tempo.ai` namespace:

```typescript
// Standard Activation (1 line, zero boilerplate):
import '@magmacomputing/tempo-plugin-ai';

// Tempo.ai is immediately available:
const date = await Tempo.ai.parse("next Friday at 3pm");
```

#### How this is implemented in `packages/plugins/ai/src/index.ts`:
```typescript
// Auto-register side-effect when Tempo is globally available
if (typeof globalThis !== 'undefined' && (globalThis as any).Tempo) {
  (globalThis as any).Tempo.use(AiPlugin);
}
```

For isolated sandboxes (`Tempo.create()`) or explicit DI architectures, `AiPlugin` remains available for manual passing: `const mySandbox = Tempo.create({ plugins: [AiPlugin] });`.

---

## 5. Summary Matrix of Proposed AI Ergonomics
1. **Zero-Boilerplate Standard Import**: `import '@magmacomputing/tempo-plugin-ai'` → mounts `Tempo.ai.*`.
2. **Explicit Sandbox Import**: `import { AiPlugin } from '@magmacomputing/tempo-plugin-ai'` → for `Tempo.use(AiPlugin)`.
3. **Pure Tree-Shakeable Function**: `import { parseAI } from '@magmacomputing/tempo-plugin-ai/parse'` → standalone helper without `Tempo` class mutation.
