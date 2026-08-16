import { TempoAiError } from './error.js';
import { parseJSONC } from '@magmacomputing/tempo/library';

export interface ProviderModelInfo {
	id: string;
	name?: string | undefined;
	ownedBy?: string | undefined;
	created?: number | undefined;
	description?: string | undefined;
	contextWindow?: number | undefined;
	supportedGenerationMethods?: string[] | undefined;
}

export interface ListProviderModelsOptions {
	url?: string | undefined;
	timeout?: number | undefined;
}

const DEFAULT_MODELS_TIMEOUT_MS = 10_000;

/**
 * Queries an AI provider's models endpoint to retrieve available models.
 * Supports Groq, OpenAI, Google Gemini, Mistral, and OpenAI-compatible gateways.
 *
 * @param providerId - Provider identifier ('groq', 'openai', 'gemini', 'mistral', etc.)
 * @param apiKey - Private API authorization key
 * @param options - Optional endpoint URL override and request timeout
 * @returns Array of discovered model descriptors
 */
export async function listProviderModels(
	providerId: string,
	apiKey: string,
	options: ListProviderModelsOptions = {}
): Promise<ProviderModelInfo[]> {
	const normalizedId = providerId?.toLowerCase()?.trim() ?? '';
	if (!normalizedId)
		throw new TempoAiError('Provider ID is required to query models', 400);

	if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0)
		throw new TempoAiError(`API key is required to query models for provider '${providerId}'`, 401);

	const timeoutMs = options.timeout ?? DEFAULT_MODELS_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		let endpointUrl: string;
		const headers: Record<string, string> = {
			Accept: 'application/json, text/plain, */*'
		};

		switch (normalizedId) {
			case 'gemini':
				endpointUrl = options.url ?? 'https://generativelanguage.googleapis.com/v1beta/models';
				headers['x-goog-api-key'] = apiKey.trim();
				break;
			case 'groq':
				endpointUrl = options.url ?? 'https://api.groq.com/openai/v1/models';
				headers.Authorization = `Bearer ${apiKey.trim()}`;
				break;
			case 'openai':
				endpointUrl = options.url ?? 'https://api.openai.com/v1/models';
				headers.Authorization = `Bearer ${apiKey.trim()}`;
				break;
			case 'mistral':
				endpointUrl = options.url ?? 'https://api.mistral.ai/v1/models';
				headers.Authorization = `Bearer ${apiKey.trim()}`;
				break;
			default:
				endpointUrl = options.url ?? `https://api.${normalizedId}.com/v1/models`;
				headers.Authorization = `Bearer ${apiKey.trim()}`;
				break;
		}

		const response = await fetch(endpointUrl, {
			signal: controller.signal,
			headers,
			redirect: 'error'
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => '');
			throw new TempoAiError(
				`Failed to query models from ${providerId} (${response.status}): ${errorText || response.statusText}`,
				response.status
			);
		}

		const rawText = await response.text();
		const data = parseJSONC(rawText);

		// Format 1: Google Gemini { models: [{ name: "models/gemini-3.7-flash", ... }] }
		if (data && Array.isArray(data.models)) {
			return data.models.map((item: any) => ({
				id: String(item.name || '').replace(/^models\//, ''),
				name: item.displayName || undefined,
				description: item.description || undefined,
				contextWindow: typeof item.inputTokenLimit === 'number' ? item.inputTokenLimit : undefined,
				supportedGenerationMethods: Array.isArray(item.supportedGenerationMethods) ? item.supportedGenerationMethods : undefined
			})).filter((m: ProviderModelInfo) => m.id.length > 0);
		}

		// Format 2: OpenAI / Groq / Mistral { data: [{ id: "gpt-5.4-mini", ... }] }
		if (data && Array.isArray(data.data)) {
			return data.data.map((item: any) => ({
				id: String(item.id || ''),
				name: item.name || undefined,
				ownedBy: item.owned_by || undefined,
				created: typeof item.created === 'number' ? item.created : undefined,
				description: item.description || undefined,
				contextWindow: typeof item.context_window === 'number' ? item.context_window : undefined
			})).filter((m: ProviderModelInfo) => m.id.length > 0);
		}

		// Format 3: Direct Array [ { id: "model-1" }, ... ]
		if (Array.isArray(data)) {
			return data.map((item: any) => ({
				id: typeof item === 'string' ? item : String(item?.id || ''),
				name: item?.name || undefined,
				description: item?.description || undefined
			})).filter((m: ProviderModelInfo) => m.id.length > 0);
		}

		return [];
	} catch (err: any) {
		if (err instanceof TempoAiError)
			throw err;
		if (err.name === 'AbortError' || controller.signal.aborted)
			throw new TempoAiError(`Timeout querying models for provider '${providerId}' after ${timeoutMs}ms`, 504);
		throw new TempoAiError(`Network error querying models for '${providerId}': ${err?.message || err}`, 500);
	} finally {
		clearTimeout(timer);
	}
}
