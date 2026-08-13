import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import { normalizeCacheInput, attachAiMeta, fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX, RE_ISO_DATE_PREFIX, RE_ISO_Z_SUFFIX } from '../core/patterns.js';
import type { AiParseOptions } from '../types/index.js';

async function parseSingleInput(str: string, options?: AiParseOptions): Promise<Tempo> {
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const normalizedStr = normalizeCacheInput(str);

	const { force, debug, mode: aiMode, providers, minConfidence, softErrors, cache: aiCacheOption, timeout: callTimeout, ttl, cacheAdapter, anchor, hedgeDelay, ...coreOptions } = options || {};

	let tz: string, cal: string, loc: string, sph: string, anchorStr: string;
	if (Tempo.isTempo(options?.anchor)) {
		tz = String(options!.timeZone || options!.anchor.tz);
		cal = String(options!.calendar || options!.anchor.cal);
		const rawLoc = options!.locale || options!.anchor.loc;
		loc = String(Array.isArray(rawLoc) ? rawLoc[0] : rawLoc);
		sph = String(options!.sphere || options!.anchor.config.sphere || 'north');
		anchorStr = options!.anchor.toString();
	} else {
		const resolvedOptions = Tempo.options;
		tz = String(options?.timeZone || resolvedOptions.timeZone);
		cal = String(options?.calendar || resolvedOptions.calendar);
		const rawLoc = options?.locale || resolvedOptions.locale;
		loc = String(Array.isArray(rawLoc) ? rawLoc[0] : rawLoc);
		sph = String(options?.sphere || resolvedOptions.sphere || 'north');
		anchorStr = String(options?.anchor || new Tempo().toString());
	}

	const anchorTempo = new Tempo(anchorStr, { ...coreOptions, timeZone: tz, calendar: cal, locale: loc, sphere: sph as any });
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
				if (isDebug) console.log('[tempo-plugin-ai] Cache adapter read error:', err?.message);
			}
		}

		cachedIso ??= Tempo.cache.get(cacheKey);
	}

	if (cachedIso) {
		if (isDebug) console.log(`[tempo-plugin-ai] Cache hit: "${str}" -> ${cachedIso}`);
		const cachedInstance = new Tempo(cachedIso, coreOptions);
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
			const native = new Tempo(str, { ...coreOptions, silent: true });
			const hasNativeMatches = Tempo.cache.has(str)
				|| Tempo.cache.has(normalizedStr)
				|| RE_ISO_DATE_PREFIX.test(str.trim())
				|| native.isValid;

			if (native.isValid && hasNativeMatches) {
				if (isDebug) console.log(`[tempo-plugin-ai] Resolved natively: "${str}"`);
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

	const availableProviders = providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

	assertNoReservedProviderId(availableProviders);

	const mode = aiMode || _state.config.mode || AiMode.Fallback;
	const effectiveMinConfidence = minConfidence ?? _state.config.minConfidence;
	const effectiveHedgeDelay = hedgeDelay ?? _state.config.hedgeDelay;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, isDebug, signal, callTimeout);
			const cleanContent = rawContent.replace(RE_MARKDOWN_JSON_PREFIX, '').replace(RE_MARKDOWN_JSON_SUFFIX, '');
			let parsedData: any;
			try {
				parsedData = JSON.parse(cleanContent);
			} catch {
				throw new TempoAiError(`Provider ${providerId} returned invalid JSON payload.`, 422);
			}
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
		const invalidInstance = new Tempo('INVALID', { ...coreOptions, catch: true });
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

	// Determine TTL hierarchy: options.ttl > provider.ttl > global config.ttl > 3600000 (1 hour)
	// In Consensus mode, providerId is the synthetic sentinel 'consensus' (not a real provider id),
	// so use the minimum TTL across all participating providers as the conservative policy.
	const providerTtl = providerId === AiMode.Consensus
		? availableProviders.reduce<number | undefined>((min, p) => p.ttl === undefined ? min : (min === undefined ? p.ttl : Math.min(min, p.ttl)), undefined)
		: availableProviders.find(p => p.id === providerId)?.ttl;
	const resolvedTtl = ttl ?? providerTtl ?? _state.config.ttl ?? 3_600_000;

	if (aiCacheOption !== false) {
		if (adapter) {
			try {
				const res = adapter.set(cacheKey, parsedIso, resolvedTtl);
				if (res instanceof Promise) await res;
			} catch (err: any) {
				if (isDebug) console.log('[tempo-plugin-ai] Cache adapter write error:', err?.message);
			}
		}
		Tempo.cache.set(cacheKey, parsedIso);
	}

	const finalInstance = new Tempo(parsedIso, coreOptions);

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
	if (Array.isArray(input)) {
		if (options?.softErrors) {
			const settled = await Promise.allSettled(input.map(str => parseSingleInput(str, options)));
			return settled.map(s => s.status === 'fulfilled' ? s.value : (s.reason as TempoAiError));
		}
		return Promise.all(input.map(str => parseSingleInput(str, options)));
	}

	return parseSingleInput(input, options);
}
