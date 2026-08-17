import { TempoAiError } from './error.js';
import { isValidManifestUrl } from './manifest.js';
import { RE_SAFE_PROVIDER_ID } from './patterns.js';
import { fetchRequest, HttpError, parseJSONC } from '@magmacomputing/tempo/library';

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
export const MAX_MODELS_BYTES = 1024 * 1024;

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

	if (!RE_SAFE_PROVIDER_ID.test(normalizedId))
		throw new TempoAiError(`Invalid provider ID '${providerId}'`, 400);

	if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0)
		throw new TempoAiError(`API key is required to query models for provider '${providerId}'`, 401);

	let endpointUrl: string;
	switch (normalizedId) {
		case 'gemini':
			endpointUrl = options.url ?? 'https://generativelanguage.googleapis.com/v1beta/models';
			break;
		case 'groq':
			endpointUrl = options.url ?? 'https://api.groq.com/openai/v1/models';
			break;
		case 'openai':
			endpointUrl = options.url ?? 'https://api.openai.com/v1/models';
			break;
		case 'mistral':
			endpointUrl = options.url ?? 'https://api.mistral.ai/v1/models';
			break;
		default:
			endpointUrl = options.url ?? `https://api.${normalizedId}.com/v1/models`;
			break;
	}

	if (!isValidManifestUrl(endpointUrl))
		throw new TempoAiError(`Invalid models endpoint URL '${endpointUrl}' - must use HTTPS or localhost HTTP`, 400);

	const timeoutMs = options.timeout ?? DEFAULT_MODELS_TIMEOUT_MS;

	try {
		const headers: Record<string, string> = {
			Accept: 'application/json, text/plain, */*',
		}

		if (normalizedId === 'gemini') {
			headers['x-goog-api-key'] = apiKey.trim();
		} else {
			headers.Authorization = `Bearer ${apiKey.trim()}`;
		}

		const rawOrData = await fetchRequest<any>(endpointUrl, {
			headers,
			redirect: 'error',
		}, {
			timeout: timeoutMs,
			maxBytes: MAX_MODELS_BYTES,
		});

		const data = typeof rawOrData === 'string' ? parseJSONC(rawOrData) : rawOrData;

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
		if (err?.name === 'TimeoutError' || err?.name === 'AbortError')
			throw new TempoAiError(`Timeout querying models for provider '${providerId}' after ${timeoutMs}ms`, 504);
		if (err instanceof HttpError) {
			const details = typeof err.body === 'string' ? err.body : (err.body ? JSON.stringify(err.body) : '');
			throw new TempoAiError(
				`Failed to query models from ${providerId} (${err.status}): ${details || err.statusText}`,
				err.status
			);
		}
		throw new TempoAiError(`Network error querying models for '${providerId}': ${err?.message || err}`, 500);
	}
}
