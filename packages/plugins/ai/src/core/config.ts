import { secure, type ValueOf } from '@magmacomputing/tempo/library';
import type { AiProvider } from '../types/index.js';

/**
 * ## AiMode
 * Execution modes across the provider farm:
 * - `Fallback` ('fallback'): Sequential provider rotation until one succeeds.
 * - `Race` ('race'): Concurrent speculative requests; returns fastest success.
 * - `Consensus` ('consensus'): Concurrent requests across all providers with confidence voting.
 * - `Hedged` ('hedged'): Staggered latency hedging (near-Race speed with reduced token usage).
 * - `RoundRobin` ('roundrobin'): Cyclic load balancing across provider pool.
 * - `Adaptive` ('adaptive'): Proactive telemetry-aware rate-limit avoidance.
 */
export const AiMode = Object.freeze({
	Fallback: 'fallback',
	Race: 'race',
	Consensus: 'consensus',
	Hedged: 'hedged',
	RoundRobin: 'roundrobin',
	Adaptive: 'adaptive',
} as const);

export type AiMode = ValueOf<typeof AiMode>

/**
 * Keywords reserved by parseAI to avoid provider configuration collisions.
 */
export const RESERVED_PROVIDER_IDS: ReadonlySet<string> = new Set(['native', 'cache', 'consensus', 'fallback', 'builtin']);

/**
 * Built-in default endpoint and model configurations for popular providers.
 */
export const DEFAULT_PROVIDERS: Readonly<Record<string, Partial<AiProvider>>> = secure({
	groq: {
		url: 'https://api.groq.com/openai/v1/chat/completions',
		models: {
			default: 'openai/gpt-oss-20b',
			fast: 'openai/gpt-oss-20b',
			large: 'openai/gpt-oss-120b'
		},
		tokenParam: 'max_tokens'
	},
	openai: {
		url: 'https://api.openai.com/v1/chat/completions',
		models: {
			default: 'gpt-5.4-mini',
			fast: 'gpt-5.4-mini',
			reasoning: 'o3-mini'
		},
		tokenParam: 'max_completion_tokens'
	},
	gemini: {
		url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
		models: {
			default: 'gemini-3.7-flash',
			fast: 'gemini-3.7-flash',
			reasoning: 'gemini-2.5-pro'
		},
		tokenParam: 'max_tokens'
	},
	mistral: {
		url: 'https://api.mistral.ai/v1/chat/completions',
		models: {
			default: 'mistral-small-latest',
			fast: 'mistral-small-latest',
			large: 'mistral-large-latest'
		},
		tokenParam: 'max_tokens'
	}
});
