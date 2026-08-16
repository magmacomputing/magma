import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import { normalizeCacheInput } from '../core/cache.js';
import {
	attachAiMeta,
	fetchFromProvider,
	getAvailableProviders,
	parseJsonPayload,
	resolveFullContext,
	validateMinConfidence,
	resolveProviderTtl,
	executeBatch,
} from '../core/support.js';
import { logDebug, warnDebug } from '../core/logger.js';
import { RE_ISO_DATE_PREFIX, RE_ISO_Z_SUFFIX } from '../core/patterns.js';
import type { AiParseOptions } from '../types/index.js';

async function parseSingleInput(str: string, options?: AiParseOptions): Promise<Tempo> {
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const normalizedStr = normalizeCacheInput(str);

	const {
		force,
		debug,
		mode: aiMode,
		providers,
		minConfidence,
		softErrors,
		cache: aiCacheOption,
		timeout: callTimeout,
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
	const { tz, cal, loc, sph, contextConfig } = resolveFullContext(options, fallbackTempo);
	const tempoConfig = { ...coreOptions, ...contextConfig, sphere: sph as any } as any;

	const anchorTempo = Tempo.isTempo(anchor)
		? (anchor.tz === tz ? anchor : anchor.set({ timeZone: tz }))
		: new Tempo(anchor !== undefined ? (anchor as any) : undefined, tempoConfig);

	const cacheSalt = anchorTempo.format('{yyyy}-{mm}-{dd}');
	const cacheKey = `${normalizedStr}::${cacheSalt}::${tz}::${cal}::${loc}::${sph}`;
	const adapter = cacheAdapter ?? _state.config.cacheAdapter;

	let cachedIso: string | undefined;
	if (!force && aiCacheOption !== false) {
		if (adapter) {
			try {
				const val = await adapter.get(cacheKey);
				if (val) {
					cachedIso = val;
				}
			} catch (err: any) {
				warnDebug('tempo-plugin-ai:parse', 'Cache adapter read error', err?.message, { debug: isDebug });
			}
		}

		cachedIso ??= Tempo.cache.get(cacheKey);
	}

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

	const availableProviders = getAvailableProviders(options);
	const mode = aiMode || _state.config.mode || AiMode.Fallback;
	const effectiveMinConfidence = validateMinConfidence(minConfidence, 'parseAI');
	const effectiveHedgeDelay = hedgeDelay ?? _state.config.hedgeDelay;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, isDebug, signal, callTimeout);
			const parsedData = parseJsonPayload(rawContent, providerId);
			const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : (parsedData?.iso === 'INVALID' ? 0.0 : 1.0);

			return {
				data: parsedData,
				providerId,
				rateLimits,
				confidence,
				consensusKey: parsedData?.iso,
				ambiguous: Boolean(parsedData?.ambiguous || parsedData?.iso === 'INVALID'),
			};
		},
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:parse', hedgeDelay: effectiveHedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: parsedData, providerId, rateLimits, ambiguous: modeAmbiguous } = winningCandidate;
	const rawIso = typeof parsedData?.iso === 'string' ? parsedData.iso : 'INVALID';
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : (rawIso === 'INVALID' ? 0.0 : 1.0);
	const ambiguous = Boolean(modeAmbiguous || parsedData?.ambiguous || rawIso === 'INVALID');
	const granularity = typeof parsedData?.granularity === 'string' ? parsedData.granularity : 'unknown';
	const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

	const isBelowMinConfidence = effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence;

	if (rawIso === 'INVALID' || isBelowMinConfidence) {
		const invalidInstance = new Tempo('INVALID', { ...tempoConfig, catch: true });
		return attachAiMeta(invalidInstance, {
			provider: providerId,
			cached: false,
			confidence,
			ambiguous: true,
			granularity,
			rawIso: rawIso === 'INVALID' ? 'INVALID' : rawIso,
			reasoning: isDebug ? reasoning : undefined,
			rawPrompt: isDebug ? str : undefined,
			normalizedPrompt: isDebug ? normalizedStr : undefined,
			limits: rateLimits ?? undefined,
		});
	}

	const parsedIso = `${rawIso.replace(RE_ISO_Z_SUFFIX, '')}[${tz}]`;

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 3_600_000);

	if (aiCacheOption !== false) {
		if (adapter) {
			try {
				const res = adapter.set(cacheKey, parsedIso, resolvedTtl);
				if (res instanceof Promise) await res;
			} catch (err: any) {
				warnDebug('tempo-plugin-ai:parse', 'Cache adapter write error', err?.message, { debug: isDebug });
			}
		}
		Tempo.cache.set(cacheKey, parsedIso);
	}

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
