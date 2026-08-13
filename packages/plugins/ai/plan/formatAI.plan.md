# Implementation Plan: `formatAI`

## 1. Overview & Goal
`formatAI` transforms a `Tempo` instance, `Date`, timestamp, or ISO string into human-friendly, contextual narrative text tailored to specific prompts, UI tones, business domains, or relative countdown styles (e.g., *"this Friday at 5:00 PM EST (in 5 days)"*, *"Q3 Fiscal Close — 14 business days remaining"*).

By combining deterministic date-time grounding (formatted ISO components, day of week, relative difference to anchor/now, season, quarter) with LLM prompt execution, `formatAI` eliminates date hallucination while delivering expressive, localized language.

---

## 2. Public API & Type Definitions

### 2.1 Types (`packages/plugins/ai/src/types/format.type.ts`)
```typescript
import type { Tempo, DateTime } from '@magmacomputing/tempo';
import type { AiOptions } from './common.type.js';
import type { TempoAiError } from '../core/error.js';

export interface AiFormatOptions extends AiOptions {
	/** Reference anchor date for relative calculations (defaults to now). */
	anchor?: DateTime;
	/** Target IANA timezone (defaults to Tempo instance timezone or global options). */
	timeZone?: string;
	/** Target BCP 47 locale or language tag (defaults to global options or 'en-US'). */
	locale?: string | string[];
	/** Desired narrative tone or formatting style hint (e.g. 'casual', 'formal', 'compact', 'countdown'). */
	style?: string;
	/** Custom regional context (e.g. 'AU-NSW', 'US-CA'). */
	region?: string;
}

export interface FormatItem {
	/** Date-time instance, Temporal object, or string to format. */
	date: DateTime;
	/** Prompt instructions guiding the output narrative. */
	prompt?: string;
}

export interface TempoAiFormatResult {
	/** Formatted narrative string. */
	formatted: string;
	/** Confidence score between 0.0 and 1.0. */
	confidence: number;
	/** ID of the provider that fulfilled the request (or 'cache'). */
	provider: string;
	/** Optional step-by-step rationale from the LLM. */
	reasoning?: string;
}
```

### 2.2 Function Signature (`packages/plugins/ai/src/functions/format.ts`)
```typescript
export async function formatAI(items: FormatItem[], options?: AiFormatOptions): Promise<(TempoAiFormatResult | TempoAiError)[]>;
export async function formatAI(date: DateTime, prompt?: string, options?: AiFormatOptions): Promise<TempoAiFormatResult>;
```

---

## 3. Mathematical Grounding & Prompt Strategy

### 3.1 Grounding Calculation
To guarantee accuracy, pre-compute:
* **Canonical ISO Representation**: `targetTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')`
* **Target Timezone & Offset**: `targetTempo.tz`, `targetTempo.offset`
* **Day of Week & Ordinal**: `targetTempo.dow` (1=Mon, 7=Sun), weekday name
* **Relative Delta to Anchor**:
  * Calendar days: `Math.round(anchorTempo.until(targetTempo, 'day') * 100) / 100`
  * Elapsed hours: `Math.round(anchorTempo.until(targetTempo, 'hour') * 100) / 100`
  * Relative direction: Past / Present / Future

### 3.2 Context & System Prompt
```markdown
Grounding Context:
- Target Date-Time: 2026-08-14T17:00:00 (America/New_York)
- Day of Week: Friday (Day 5)
- Reference Anchor: 2026-08-12T08:00:00 (America/New_York)
- Relative Delta: +2.38 days (+57.0 hours) in the Future
- Target Locale: en-US
- Formatting Style: casual
- Prompt: "Express as an upcoming meeting reminder with relative countdown"
```

Schema enforcement:
```json
{
  "formatted": "this Friday at 5:00 PM EST (in 2 days)",
  "confidence": 0.98,
  "reasoning": "Target timestamp is in 2 days on Friday afternoon."
}
```

---

## 4. Caching & Dispatch Pipeline

1. **Cache Key Partition**:
   `format::${targetTempo.epoch.ms}::${anchorTempo.epoch.ms}::${normalizedPrompt}::${tz}::${loc}::${style}::${region}`
2. **Multi-tier Caching**:
   - Check `AiCacheAdapter` (Redis / Cloudflare KV) then local `Tempo.cache`.
   - Validate non-empty `formatted` and check `effectiveMinConfidence`.
3. **Execution Modes**:
   - Dispatch via `executeWithMode` supporting all 6 modes (`Fallback`, `Race`, `Consensus`, `Hedged`, `RoundRobin`, `Adaptive`).
4. **Batch Processing**:
   - Concurrent `Promise.all` / `Promise.allSettled` (with `softErrors: true` normalizing rejections to `TempoAiError`).

---

## 5. Verification & Test Plan
* **Unit Tests (`packages/plugins/ai/test/format.test.ts`)**:
  - Valid date formatting across diverse prompt instructions (business SLA, casual relative, compact countdown).
  - Timezone normalization (preserves target instant in requested timeZone).
  - Cache hit preservation and region/style cache isolation.
  - Multi-provider execution modes (Race, Consensus, Hedged).
  - Batch array processing with `softErrors: true`.
  - Confidence threshold rejection (`minConfidence`).
* **Documentation (`packages/plugins/ai/doc/formatAI.md`)**:
  - TSDoc, basic usage with `initAI`, options guide, batch examples.
