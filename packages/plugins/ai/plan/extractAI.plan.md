# Implementation Plan: `extractAI`

## 1. Overview & Goal
`extractAI` scans unstructured, multi-paragraph text (emails, transcripts, chat logs, meeting agendas, task notes) to identify, parse, and extract all embedded temporal entities and time-bound events into structured `TempoEvent[]` objects (`label`, `start`, `end`, `type`, `timeZone`, `confidence`).

It anchors relative mentions (e.g., *"tomorrow at 2pm"*, *"next Tuesday from 9 to 11am"*, *"the last day of next month"*) against an explicit or current reference `anchor` timestamp and timezone.

---

## 2. Public API & Type Definitions

### 2.1 Types (`packages/plugins/ai/src/types/extract.type.ts`)
```typescript
import type { Tempo } from '@magmacomputing/tempo';
import type { AiOptions } from './common.type.js';
import type { TempoAiError } from '../core/error.js';

export type TempoEventType = 'point' | 'interval' | 'deadline' | 'recurrence' | 'tentative';

export interface TempoExtractedEvent {
	/** Short descriptive label or title of the extracted event/activity. */
	label: string;
	/** Start date-time point as an instantiated Tempo instance. */
	start: Tempo;
	/** Optional end date-time point (if an interval or duration was mentioned). */
	end?: Tempo;
	/** Classification category of the temporal mention. */
	type: TempoEventType;
	/** Raw text snippet extracted from the source document. */
	rawText?: string;
	/** Confidence score for this specific entity extraction (0.0 to 1.0). */
	confidence: number;
}

export interface TempoAiExtractResult {
	/** Array of extracted events with instantiated Tempo objects. */
	events: TempoExtractedEvent[];
	/** Overall confidence score. */
	confidence: number;
	/** Provider ID that fulfilled the request (or 'cache'). */
	provider: string;
	/** Optional summary or reasoning from the LLM. */
	reasoning?: string;
}

export interface AiExtractOptions extends AiOptions {
	/** Reference anchor date-time for relative expressions (defaults to now). */
	anchor?: Tempo | Date | string | number;
	/** Reference IANA timezone (defaults to global options or 'UTC'). */
	timeZone?: string;
	/** Reference BCP 47 locale (defaults to global options or 'en-US'). */
	locale?: string | string[];
	/** Preferred calendar system (e.g. 'gregory', 'islamic', 'hebrew'). */
	calendar?: string;
	/** Optional category filter to restrict extracted entities (e.g. ['meeting', 'deadline']). */
	categories?: string[];
	/** Optional regional context (e.g. 'US-NY', 'GB'). */
	region?: string;
}
```

### 2.2 Function Signature (`packages/plugins/ai/src/functions/extract.ts`)
```typescript
export async function extractAI(texts: string[], options?: AiExtractOptions): Promise<(TempoAiExtractResult | TempoAiError)[]>;
export async function extractAI(text: string, options?: AiExtractOptions): Promise<TempoAiExtractResult>;
```

---

## 3. Grounding & Prompt Strategy

### 3.1 Context Construction
Pass anchor metadata so the LLM has a solid temporal baseline:
* **Reference Anchor**: `anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')` (`anchorTempo.tz`)
* **Reference Day of Week**: `anchorTempo.dow` / weekday name
* **Current Year / Month / Day**: Pre-resolved ISO components
* **Target Categories / Constraints**: e.g., Filter meetings, deadlines, or flights

### 3.2 System Prompt & Schema
```markdown
You are an expert temporal entity extraction engine.
Scan the user-provided text for all temporal expressions, deadlines, meetings, and intervals.
Resolve relative references ("tomorrow", "next Monday", "in 2 hours") strictly against the Reference Anchor date and timezone.

Return ONLY a valid JSON object matching this schema:
{
  "events": [
    {
      "label": "Brief descriptive title",
      "start": "ISO 8601 string (e.g. 2026-08-13T14:00:00)",
      "end": "ISO 8601 string or null",
      "type": "point | interval | deadline | recurrence | tentative",
      "rawText": "Exact text fragment from the input",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95,
  "reasoning": "Identified 2 scheduled meetings and 1 project deadline."
}
```

### 3.3 Post-Processing & Validation
1. For each item in `events`, validate `start` using `new Tempo(item.start, { timeZone: tz, locale: loc, calendar: cal })`.
2. If `item.end` is present, construct `new Tempo(item.end, { timeZone: tz, locale: loc, calendar: cal })`.
3. Filter out invalid date results gracefully.
4. Ensure returned `start` and `end` are native `Tempo` instances for immediate date arithmetic.

---

## 4. Caching & Dispatch Pipeline

1. **Cache Key Partition**:
   `extract::${normalizedTextHash}::${anchorTempo.format('{yyyy}-{mm}-{dd}')}::${tz}::${loc}::${cal}::${region}`
2. **Multi-tier Caching**:
   - Check `AiCacheAdapter` then `Tempo.cache`.
   - Reconstitute cached ISO strings into `Tempo` instances upon cache hit.
3. **Execution Modes**:
   - Dispatch via `executeWithMode` supporting all 6 modes.
4. **Batch Processing**:
   - `Promise.all` / `Promise.allSettled` (with `softErrors` normalization).

---

## 5. Verification & Test Plan
* **Unit Tests (`packages/plugins/ai/test/extract.test.ts`)**:
  - Extract multiple events from email text (e.g., meeting + follow-up deadline).
  - Resolve relative dates against custom `anchor` timestamps.
  - Interval extraction with start and end times.
  - Handle inputs containing no temporal entities (returns `events: []`).
  - Cache hit rehydration into `Tempo` instances.
  - Multi-provider execution modes (Fallback, Race, Adaptive).
  - Batch processing with `softErrors: true`.
* **Documentation (`packages/plugins/ai/doc/extractAI.md`)**:
  - TSDoc, usage examples with email text, calendar creation, and options guide.
