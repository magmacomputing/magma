import { Tempo } from '@magmacomputing/tempo';
import { asText, asNumber } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { executeWithMode } from '../core/dispatch.js';
import { normalizeCacheInput, readMultiTierCache, writeMultiTierCache } from '../core/cache.js';
import {
	attachAiMeta,
	fetchFromProvider,
	getAvailableProviders,
	parseJsonPayload,
	resolveFullContext,
	resolveAnchorTempo,
	resolveExecutionOptions,
	resolveProviderTtl,
	executeBatch,
} from '../core/support.js';
import { logDebug, warnDebug } from '../core/logger.js';
import { RE_ISO_DATE_PREFIX, RE_ISO_Z_SUFFIX } from '../core/patterns.js';
import type { AiParseOptions } from '../types/index.js';

/**
 * Parses a single natural language date string into a Tempo instance using AI providers.
 * Handles caching, context resolution, and multi-provider execution strategies.
 *
 * @param str - The natural language date string to parse
 * @param options - Parsing options including providers, caching, and context
 * @returns A Promise resolving to a Tempo instance with AI metadata attached
 * @internal
 */
async function parseSingleInput(str: string, options?: AiParseOptions): Promise<Tempo> {
	const availableProviders = getAvailableProviders(options);
	const normalizedStr = normalizeCacheInput(str);

	const {
		force,
		debug,
		mode: aiMode,
		providers,
		minConfidence,
		softErrors,
		cache: aiCacheOption,
		ttl,
		cacheAdapter,
		anchor,
		hedgeDelay,
		timeZone: _tz,
		locale: _loc,
		calendar: _cal,
		region: _reg,
		sphere: _sph,
		...coreOptions
	} = options || {};

	const fallbackTempo = Tempo.isTempo(anchor) ? anchor : null;
	const context = resolveFullContext(options, fallbackTempo);
	const { tz, cal, loc, sph, contextConfig } = context;
	const tempoConfig = { ...coreOptions, ...contextConfig, sphere: sph as any } as any;

	const anchorTempo = resolveAnchorTempo(anchor, context);

	const cacheSalt = anchorTempo.format('{yyyy}-{mm}-{dd}');
	const cacheKey = `${normalizedStr}::${cacheSalt}::${tz}::${cal}::${loc}::${sph}`;

	const { mode, minConfidence: effectiveMinConfidence, isDebug, executeOptions } = resolveExecutionOptions(options, 'parse');

	const cachedIso = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:parse',
	});

	if (cachedIso) {
		logDebug('tempo-plugin-ai:parse', `Cache hit: "${str}" -> ${cachedIso}`, undefined, { debug: isDebug });
		const cachedInstance = new Tempo(cachedIso, tempoConfig);
		return attachAiMeta(cachedInstance, {
			provider: 'cache',
			cached: true,
			confidence: 1.0,
			ambiguous: false,
			granularity: 'day',
			rawIso: cachedIso,
			rawPrompt: isDebug ? str : undefined,
			normalizedPrompt: isDebug ? normalizedStr : undefined,
		});
	}

	if (!force) {
		try {
			const native = new Tempo(str, { ...tempoConfig, silent: true });
			const hasNativeMatches = Tempo.cache.has(str)
				|| Tempo.cache.has(normalizedStr)
				|| RE_ISO_DATE_PREFIX.test(str.trim())
				|| native.isValid;

			if (native.isValid && hasNativeMatches) {
				logDebug('tempo-plugin-ai:parse', `Resolved natively: "${str}"`, undefined, { debug: isDebug });
				return attachAiMeta(native, {
					provider: 'native',
					cached: false,
					confidence: 1.0,
					ambiguous: false,
					granularity: 'day',
					rawPrompt: isDebug ? str : undefined,
					normalizedPrompt: isDebug ? normalizedStr : undefined,
				});
			}
		} catch {
			// Fallback
		}
	}

	const contextString = `Current Time: ${anchorTempo.format('{wkd}, {yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}, Timezone: ${tz}, Calendar: ${cal}, Locale: ${loc}, Hemisphere: ${sph}.`;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, { ...options, signal });
			const parsedData = parseJsonPayload(rawContent, providerId);
			const confidence = asNumber(parsedData?.confidence, parsedData?.iso === 'INVALID' ? 0.0 : 1.0);

			return {
				data: parsedData,
				providerId,
				rateLimits,
				confidence,
				consensusKey: parsedData?.iso,
				ambiguous: Boolean(parsedData?.ambiguous || parsedData?.iso === 'INVALID'),
			};
		},
		executeOptions,
	);

	const { data: parsedData, providerId, rateLimits, ambiguous: modeAmbiguous } = winningCandidate;
	const rawIso = asText(parsedData?.iso, 'INVALID');
	const confidence = asNumber(winningCandidate.confidence, rawIso === 'INVALID' ? 0.0 : 1.0);
	const ambiguous = Boolean(modeAmbiguous || parsedData?.ambiguous || rawIso === 'INVALID');
	const granularity = asText(parsedData?.granularity, 'unknown');
	const reasoning = asText(parsedData?.reasoning);

	const isBelowMinConfidence = effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence;

	if (rawIso === 'INVALID' || isBelowMinConfidence) {
		const invalidInstance = new Tempo('INVALID', { ...tempoConfig, catch: true });
		return attachAiMeta(invalidInstance, {
			provider: providerId,
			cached: false,
			confidence,
			ambiguous: true,
			granularity,
			rawIso,
			reasoning: isDebug ? reasoning : undefined,
			rawPrompt: isDebug ? str : undefined,
			normalizedPrompt: isDebug ? normalizedStr : undefined,
			limits: rateLimits ?? undefined,
		});
	}

	const parsedIso = `${rawIso.replace(RE_ISO_Z_SUFFIX, '')}[${tz}]`;

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 3_600_000);

	await writeMultiTierCache(cacheKey, parsedIso, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:parse',
	});

	const finalInstance = new Tempo(parsedIso, tempoConfig);

	return attachAiMeta(finalInstance, {
		provider: providerId,
		cached: false,
		confidence,
		ambiguous,
		granularity,
		rawIso,
		reasoning: isDebug ? reasoning : undefined,
		rawPrompt: isDebug ? str : undefined,
		normalizedPrompt: isDebug ? normalizedStr : undefined,
		limits: rateLimits ?? undefined,
	});
}

/**
 * ## parseAI
 * Parses natural language temporal expressions, relative dates, and unstructured prompt strings
 * into high-precision `Tempo` instances using configured LLM providers.
 *
 * Supports single strings or batch arrays, hierarchical TTL/caching, execution modes (Fallback, Race, Consensus),
 * and attached AI metadata (confidence score, provider info, reasoning, and ambiguity flags).
 *
 * @param input - A natural language date/time prompt string or an array of prompt strings for batch resolution
 * @param options - Optional parsing configuration including provider overrides, timeout, caching, and execution modes
 * @returns Promise resolving to a Tempo instance (or an array of Tempo instances / TempoAiErrors for batch requests)
 * @example
 * ```ts
 * const tempo = await parseAI('the Friday after Thanksgiving next year');
 * console.log(tempo.format('{yyyy}-{mm}-{dd}'));
 * console.log(tempo.ai?.provider); // 'groq'
 * console.log(tempo.ai?.confidence); // 0.98
 * ```
 */
export async function parseAI(input: string, options?: AiParseOptions): Promise<Tempo>;
export async function parseAI(input: string[], options?: AiParseOptions): Promise<(Tempo | TempoAiError)[]>;
export async function parseAI(
	input: string | string[],
	options?: AiParseOptions
): Promise<Tempo | (Tempo | TempoAiError)[]> {
	if (Array.isArray(input))
		return executeBatch(input, str => parseSingleInput(str, options), options);

	return parseSingleInput(input, options);
}
