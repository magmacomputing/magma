import type { AiConfig } from './base.type.js';
import type { TempoParseAiMeta } from './parse.type.js';
import type { parseAI } from '../functions/parse.js';
import type { formatAI } from '../functions/format.js';
import type { scheduleAI } from '../functions/schedule.js';
import type { extractAI } from '../functions/extract.js';
import type { diffAI } from '../functions/diff.js';
import type { recurrenceAI } from '../functions/recurrence.js';
import type { contextAI } from '../functions/context.js';
import type { initAI, resetAI, getAiRateLimits, getAiProviderRateLimits } from '../core/init.js';
import type { listProviderModels } from '../core/models.js';

/**
 * ## TempoAiNamespace
 * Cohesive static namespace for all AI-powered operations on Tempo.
 */
export interface TempoAiNamespace {
	/** Initialize the AI plugin with providers and global configuration */
	readonly init: typeof initAI;
	/** Reset AI provider state and configuration */
	readonly reset: typeof resetAI;
	/** Parse human-readable or relative temporal strings using LLM semantic reasoning */
	readonly parse: typeof parseAI;
	/** Schedule recurring date patterns or multi-point calendar events */
	readonly schedule: typeof scheduleAI;
	/** Format dates using generative natural language (e.g. conversational, email, formal) */
	readonly format: typeof formatAI;
	/** Extract dates, times, and temporal spans from unstructured text */
	readonly extract: typeof extractAI;
	/** Calculate semantic and conversational difference between two dates */
	readonly diff: typeof diffAI;
	/** Resolve complex natural recurrence rules (e.g. "every second Tuesday") */
	readonly recurrence: typeof recurrenceAI;
	/** Generate contextual and situational date explanations (e.g. business hours, time of day) */
	readonly context: typeof contextAI;
	/** List available AI models across providers */
	readonly models: typeof listProviderModels;
	/** Current active AI configuration */
	readonly config: Readonly<AiConfig>;
	/** Current AI rate limit snapshot */
	readonly rateLimits: ReturnType<typeof getAiRateLimits>;
	/** Per-provider rate limit lookup */
	readonly providerRateLimits: typeof getAiProviderRateLimits;
}

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/** Frozen AI resolution metadata attached when parsed via parseAI */
		ai?: TempoParseAiMeta | undefined;
	}

	namespace Tempo {
		const ai: TempoAiNamespace;
	}
}
