import { secure } from '@magmacomputing/library';
import type { AiProvider } from '../types/index.js';

/**
 * ## AiMode
 * Execution modes across the provider farm:
 * - `Fallback` ('fallback'): Sequential provider rotation until one succeeds.
 * - `Race` ('race'): Concurrent speculative requests; returns fastest success.
 * - `Consensus` ('consensus'): Concurrent requests across all providers with confidence voting.
 */
export const AiMode = Object.freeze({
	Fallback: 'fallback',
	Race: 'race',
	Consensus: 'consensus'
} as const);

export type AiMode = (typeof AiMode)[keyof typeof AiMode];

/**
 * Keywords reserved by parseAI to avoid provider configuration collisions.
 */
export const RESERVED_PROVIDER_IDS: ReadonlySet<string> = new Set(['native', 'cache']);

/**
 * Built-in default endpoint and model configurations for popular providers.
 */
export const DEFAULT_PROVIDERS: Record<string, Readonly<Partial<AiProvider>>> = secure({
	groq: {
		url: 'https://api.groq.com/openai/v1/chat/completions',
		model: 'llama-3.3-70b-versatile',
		tokenParam: 'max_tokens'
	},
	openai: {
		url: 'https://api.openai.com/v1/chat/completions',
		model: 'gpt-5.4-mini',
		tokenParam: 'max_completion_tokens'
	},
	gemini: {
		url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
		model: 'gemini-3.6-flash',
		tokenParam: 'max_tokens'
	},
	mistral: {
		url: 'https://api.mistral.ai/v1/chat/completions',
		model: 'mistral-small-latest',
		tokenParam: 'max_tokens'
	}
});
