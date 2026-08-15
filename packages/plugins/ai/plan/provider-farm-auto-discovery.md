# Provider Farm Auto-Discovery & Zero-Config Architecture Plan

## 1. Objective

Enable seamless, zero-configuration auto-discovery of AI provider farm credentials, SLA defaults, and execution modes for `@magmacomputing/tempo-plugin-ai`. 

This design:
1. Replaces manual `initAI({ providers: [...] })` boilerplate with automated discovery.
2. Integrates directly with Tempo's unified configuration (`tempo.config.*` under `plugins.ai`).
3. Uses `@magmacomputing/tempo/library`'s `getContext()` for runtime-safe JavaScript engine identification (Node.js, Deno, Bun, Browser, Apps Script).
4. Enables instant execution of all AI functions (`parseAI`, `formatAI`, `diffAI`, `extractAI`, `recurrenceAI`, `scheduleAI`, `contextAI`) when standard environment variables or configuration files are present.

---

## 2. Current State & Limitations

- **Mandatory Initialization**: `initAI(config: AiConfig)` currently requires a full configuration object with explicit `providers` array mapping.
- **Immediate Rejection on Missing Config**: Directly calling `parseAI('...')` without prior `initAI()` throws a `TempoAiError('No AI providers configured. Please call initAI().', 400)`.
- **Configuration Sprawl**: There is no direct synchronization between Tempo core's `tempo.config.*` (discovered by `Tempo.bootstrap()`) and the AI plugin state.
- **Runtime Environment Fragility**: Ad-hoc checks like `typeof process !== 'undefined'` fail to leverage Tempo's standardized environment abstractions.

---

## 3. Architectural Design

```
                     ┌──────────────────────────────────────────────┐
                     │ AI Function Call (e.g. parseAI, formatAI)    │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │ Are providers loaded in _state? │
                           └────────┬─────────────────┬──────┘
                             (Yes)  │                 │ (No)
                                    ▼                 ▼
                         ┌─────────────────┐ ┌────────────────────────────────┐
                         │ Execute Handler │ │ resolveAutoDiscoveredConfig()  │
                         └─────────────────┘ └────────────────┬───────────────┘
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ▼                                         ▼                                         ▼
   ┌─────────────────────────────────┐       ┌─────────────────────────────────┐       ┌─────────────────────────────────┐
   │ 1. Active Tempo Config          │       │ 2. Runtime File Resolution      │       │ 3. Environment Variable Scan    │
   │ Inspect `Tempo.config` for      │  ───► │ If getContext() is NodeJS/Deno, │  ───► │ Scan process.env / global env   │
   │ `plugins.ai` or `ai` block      │       │ invoke Tempo's resolveConfig()  │       │ for GROQ_API_KEY, OPENAI_...,   │
   │ (e.g. from Tempo.bootstrap())   │       │ on `tempo.config.*`             │       │ GEMINI_..., MISTRAL_API_KEY     │
   └─────────────────────────────────┘       └─────────────────────────────────┘       └─────────────────────────────────┘
                                                              │
                                                              ▼
                                             ┌─────────────────────────────────┐
                                             │ Interpolate ${ENV} Variables &  │
                                             │ Merge with DEFAULT_PROVIDERS    │
                                             └────────────────┬────────────────┘
                                                              │
                                                              ▼
                                             ┌─────────────────────────────────┐
                                             │ Cache in _state & Execute       │
                                             └─────────────────────────────────┘
```

---

## 4. Key Components & Specifications

### 4.1. Runtime Discovery via `getContext()`

Instead of raw `process` checks, use `getContext()` from `@magmacomputing/tempo/library` to determine environment capabilities safely:

```ts
import { getContext, CONTEXT } from '@magmacomputing/tempo/library';

export function isServerRuntime(): boolean {
	const { type } = getContext();
	return type === CONTEXT.NodeJS || type === CONTEXT.Deno;
}

export function isBrowserRuntime(): boolean {
	const { type } = getContext();
	return type === CONTEXT.Browser;
}
```

### 4.2. Unified `tempo.config.*` Schema

AI configuration is declared directly in `tempo.config.json`, `tempo.config.ts`, or `tempo.config.js`:

```json
{
  "timeZone": "Australia/Sydney",
  "locale": "en-AU",
  "plugins": {
    "ai": {
      "mode": "fallback",
      "timeout": 5000,
      "minConfidence": 0.85,
      "providers": [
        { "id": "groq", "key": "${GROQ_API_KEY}" },
        { "id": "openai", "key": "${OPENAI_API_KEY}", "model": "gpt-4o-mini" }
      ]
    },
    "snap": {
      "mi": 15
    }
  }
}
```

### 4.3. Environment Variable Interpolation

Support `${VAR_NAME}` and `$env:VAR_NAME` template strings in configuration values:

```ts
function interpolateEnvValue(value: string, env: Record<string, string | undefined>): string {
	return value.replace(/\$\{(?:env:)?([A-Z0-9_]+)\}/gi, (_, varName) => env[varName] ?? '');
}
```

### 4.4. Well-Known Provider Auto-Detection Table

When no explicit configuration file or provider list is provided, the engine scans the environment for standard provider tokens and maps them to built-in `DEFAULT_PROVIDERS`:

| Provider ID | Target Environment Variable(s) | Default Model Target |
| :--- | :--- | :--- |
| `groq` | `GROQ_API_KEY` | `openai/gpt-oss-120b` |
| `openai` | `OPENAI_API_KEY` | `gpt-5.4-mini` |
| `gemini` | `GEMINI_API_KEY`, `GOOGLE_API_KEY` | `gemini-3.6-flash` |
| `mistral` | `MISTRAL_API_KEY` | `mistral-small-latest` |

---

## 5. API Surface Changes

### 5.1. Optional `initAI(config?: AiConfig)`

`initAI` becomes fully optional-parameterized:

```ts
/**
 * Initializes the AI provider farm.
 * If called with no arguments or omitted providers, automatically discovers
 * configuration from Tempo.config, tempo.config.* files, or runtime environment variables.
 *
 * @param config - Optional AI configuration overrides
 */
export async function initAI(config: AiConfig = {}): Promise<void>
```

### 5.2. Lazy Auto-Discovery in AI Handlers

All AI entrypoints (`parseAI`, `formatAI`, `diffAI`, `extractAI`, `recurrenceAI`, `scheduleAI`, `contextAI`) resolve the provider farm dynamically if uninitialized:

```ts
// src/functions/parse.ts
if (!availableProviders || availableProviders.length === 0) {
	const discovered = await resolveAutoDiscoveredProviders(options?.debug);
	if (!discovered || discovered.length === 0) {
		throw new TempoAiError(
			'No AI providers configured. Set GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or configure tempo.config.json.',
			400
		);
	}
	availableProviders = discovered;
}
```

---

## 6. Implementation Roadmap

### Phase 1: Discovery Subsystem (`src/core/discovery.ts`)
- [ ] Implement `isServerRuntime()` and `getRuntimeEnv()` using `getContext()`.
- [ ] Implement `interpolateEnv()` utility for recursive string expansion on config objects.
- [ ] Implement `scanWellKnownEnvProviders()` against `DEFAULT_PROVIDERS`.
- [ ] Implement `resolveTempoConfigAi()` to query `Tempo.config.plugins?.ai` or invoke `resolveConfig()`.

### Phase 2: `initAI` Signature & Lifecycle Update (`src/core/init.ts`)
- [ ] Update `initAI(config: AiConfig = {})` default argument handling.
- [ ] Integrate discovery resolution into synchronous and asynchronous `initAI` initialization branches.
- [ ] Ensure key redaction (`[REDACTED]`) in `getAiConfig()` properly handles auto-discovered credentials.

### Phase 3: JIT Lazy Discovery in AI Handlers
- [ ] Update `parseAI`, `formatAI`, `diffAI`, `extractAI`, `recurrenceAI`, `scheduleAI`, and `contextAI` to invoke lazy discovery before failing.
- [ ] Preserve custom call-site overrides (`options.providers`).

### Phase 4: Testing & Verification
- [ ] **Unit Tests**:
  - Test `getContext()` environment branching (mocking Browser vs Node.js vs Deno).
  - Test `${ENV_VAR}` interpolation (found vs missing).
  - Test provider farm construction from environment variables (`GROQ_API_KEY`, etc.).
  - Test `Tempo.bootstrap()` loading `plugins.ai` config block.
- [ ] **Integration Tests**:
  - Zero-arg `initAI()` with mock environment variables.
  - Zero-call `parseAI('...')` direct invocation with mock environment variables.
  - Error assertion when no keys and no config files are present.

### Phase 5: Documentation
- [ ] Update `doc/init.md` with Zero-Config & Auto-Discovery instructions.
- [ ] Add `tempo.config.json` configuration recipe to `doc/index.md`.
- [ ] Document browser vs server auto-discovery patterns in `doc/architecture.md`.
