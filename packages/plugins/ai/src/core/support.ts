import { Tempo } from '@magmacomputing/tempo';
import { asText, asNumber, isDefined, isFunction, isNumber } from '@magmacomputing/tempo/library';
import { TempoAiError } from './error.js';
import { AiMode } from './config.js';
import { _state } from './init.js';
import { attachCustomInspect, sanitizeInspectAiMeta } from './logger.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX } from './patterns.js';
import type { TempoParseAiMeta, AiBaseOptions } from '../types/index.js';
import type { ExecuteModeOptions } from './dispatch.js';

export {
	fetchFromProvider,
	getAvailableProviders,
	assertNoReservedProviderId,
	resolveProviderTtl,
	resolveProviderModel,
	type FetchFromProviderOptions,
} from './transport.js';

export { executeBatch } from './batch.js';

/**
 * Strips markdown JSON fences and parses JSON payload from provider response.
 *
 * @param rawContent - Raw content string returned from LLM
 * @param providerId - ID of the provider for error reporting
 * @returns Parsed JSON object
 * @throws TempoAiError(422) if JSON parsing fails
 */
export function parseJsonPayload<T = any>(rawContent: string, providerId: string): T {
	const cleanContent = rawContent.replace(RE_MARKDOWN_JSON_PREFIX, '').replace(RE_MARKDOWN_JSON_SUFFIX, '').trim();
	try {
		return JSON.parse(cleanContent);
	} catch (err: any) {
		throw new TempoAiError(`Provider ${providerId} returned invalid JSON payload.`, 422, undefined, { cause: err });
	}
}

export interface ResolvedAiContext {
	tz: string;
	loc: string;
	cal: string;
	sph: string;
	contextConfig: { timeZone: string; locale: string; calendar: string; sphere: string };
}

/**
 * Resolves complete regional, timezone, and calendar context hierarchy from options and/or anchor instance.
 *
 * @param options - Function options with potential context overrides
 * @param fallbackTempo - Anchor or fallback Tempo instance
 * @returns Resolved context fields and context configuration object
 */
export function resolveFullContext(
	options?: { timeZone?: string | undefined; locale?: string | string[] | undefined; calendar?: string | undefined; sphere?: 'north' | 'south' | string | undefined;[key: string]: any } | undefined,
	fallbackTempo?: Tempo | null,
): ResolvedAiContext {
	const resolvedOptions = (Tempo as any).options ?? {};
	const tz = String(options?.timeZone || fallbackTempo?.tz || resolvedOptions.timeZone || _state.config.timeZone || 'UTC');
	const rawLoc = (options?.locale !== undefined && (Array.isArray(options.locale) ? options.locale.length > 0 : Boolean(options.locale)))
		? options.locale
		: (fallbackTempo?.locale !== undefined && (Array.isArray(fallbackTempo.locale) ? fallbackTempo.locale.length > 0 : Boolean(fallbackTempo.locale)))
			? fallbackTempo.locale
			: resolvedOptions.locale || _state.config.locale || 'en-US';
	const firstLoc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
	const loc = asText(firstLoc, 'en-US');
	const cal = String(options?.calendar || fallbackTempo?.cal || resolvedOptions.calendar || _state.config.calendar || 'iso8601');
	const sph = String(options?.sphere || fallbackTempo?.sphere || resolvedOptions.sphere || _state.config.sphere || 'north');
	const contextConfig = { timeZone: tz, locale: loc, calendar: cal, sphere: sph };

	return { tz, loc, cal, sph, contextConfig };
}

export function resolveTzAndLocale(
	options?: { timeZone?: string | undefined; locale?: string | string[] | undefined } | undefined,
	fallbackTempo?: Tempo | null,
): { tz: string; loc: string } {
	const { tz, loc } = resolveFullContext(options, fallbackTempo);
	return { tz, loc };
}

/**
 * Validates that minConfidence is a finite number between 0.0 and 1.0.
 *
 * @param minConfidence - Optional confidence threshold to validate
 * @param targetFnName - Optional function name for descriptive error messaging
 * @returns Validated minConfidence number or undefined
 * @throws TempoAiError(400) if minConfidence is invalid
 */
export function validateMinConfidence(minConfidence?: number, targetFnName?: string): number | undefined {
	const effective = minConfidence ?? _state.config.minConfidence;
	if (isDefined(effective) && (!isNumber(effective) || effective < 0.0 || effective > 1.0)) {
		const formattedTarget = targetFnName
			? (targetFnName.endsWith('AI') ? targetFnName : `${targetFnName}AI`)
			: '';
		const target = formattedTarget ? ` to ${formattedTarget}` : '';
		throw new TempoAiError(`Invalid minConfidence provided${target}: "${String(effective)}"`, 400);
	}
	return effective;
}

/**
 * Resolves an anchor Tempo instance, applying timeZone, locale, calendar, and sphere.
 *
 * @param anchor - Optional anchor instance, ISO string, epoch, or undefined
 * @param context - Resolved context fields from resolveFullContext
 * @param options - Optional default anchor fallback and operation name for error messaging
 * @returns Standardized anchor Tempo instance
 * @throws TempoAiError(400) if an explicitly provided anchor is invalid
 */
export function resolveAnchorTempo(
	anchor: unknown,
	context: ResolvedAiContext,
	options?: { defaultAnchor?: unknown; operationName?: string } | undefined,
): Tempo {
	const { tz, loc, cal, sph } = context;
	if (Tempo.isTempo(anchor))
		return anchor.tz === tz ? anchor : anchor.set({ timeZone: tz });

	const targetValue = isDefined(anchor) ? anchor : options?.defaultAnchor;
	let instance: Tempo;
	try {
		instance = new Tempo(targetValue as any, {
			timeZone: tz,
			locale: loc,
			calendar: cal,
			sphere: sph as any,
		});
	} catch (err: any) {
		const op = options?.operationName ? ` to ${options.operationName}` : '';
		throw new TempoAiError(`Invalid anchor date provided${op}: "${String(anchor)}"`, 400, undefined, { cause: err });
	}

	if (!instance.isValid && isDefined(anchor)) {
		const op = options?.operationName ? ` to ${options.operationName}` : '';
		throw new TempoAiError(`Invalid anchor date provided${op}: "${String(anchor)}"`, 400);
	}

	return instance;
}

/**
 * Resolves standard execution options (mode, minConfidence, hedgeDelay, debug, and tag) across AI functions.
 */
export function resolveExecutionOptions(
	options: AiBaseOptions | undefined,
	fnName: string,
	tagPrefix: string = 'tempo-plugin-ai',
): {
	mode: AiMode;
	minConfidence: number | undefined;
	hedgeDelay: number | undefined;
	isDebug: boolean;
	tag: string;
	executeOptions: ExecuteModeOptions;
} {
	const shortName = fnName.replace(/AI$/, '');
	const mode = options?.mode || _state.config.mode || AiMode.Fallback;
	const minConfidence = validateMinConfidence(options?.minConfidence, fnName);
	const hedgeDelay = options?.hedgeDelay ?? _state.config.hedgeDelay;
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const tag = `${tagPrefix}:${shortName}`;

	return {
		mode,
		minConfidence,
		hedgeDelay,
		isDebug,
		tag,
		executeOptions: { minConfidence, debug: isDebug, tag, hedgeDelay },
	};
}

/**
 * Sanitizes and clamps a numerical confidence score to [0.0, 1.0].
 *
 * @param val - Raw confidence value from provider or cache
 * @param fallback - Default score if val is not a finite number (default: 0.9)
 * @returns Clamped float score between 0.0 and 1.0
 */
export function sanitizeConfidence(val: unknown, fallback: number = 0.9): number {
	const num = asNumber(val, fallback);
	return Math.max(0.0, Math.min(1.0, num));
}

/**
 * Asserts that the resolved confidence meets the optional minConfidence threshold.
 *
 * @param confidence - Numerical confidence score (0.0 to 1.0)
 * @param minConfidence - Optional minimum threshold
 * @param operationName - Name of the AI operation or prefix (e.g. 'formatAI', 'diffAI', 'inferred context')
 * @throws TempoAiError(422) if confidence is below threshold
 */
export function assertMinConfidenceThreshold(
	confidence: number,
	minConfidence: number | undefined,
	operationName: string,
): void {
	if (isDefined(minConfidence) && confidence < minConfidence)
		throw new TempoAiError(`${operationName} confidence (${confidence}) is below the required threshold of ${minConfidence}.`, 422);
}

/**
 * Attaches immutable metadata to a Tempo instance via a non-intrusive Proxy carrier.
 *
 * @param instance - Target Tempo instance
 * @param meta - Metadata payload to attach
 * @returns Decorated Tempo proxy with `.ai` property
 */
export function attachAiMeta(instance: Tempo, meta: TempoParseAiMeta): Tempo {
	const inspectableMeta = attachCustomInspect({ ...meta }, (obj, isProd) => sanitizeInspectAiMeta(obj, isProd));
	const frozenMeta = Object.freeze(inspectableMeta);
	const boundMethodCache = new Map<PropertyKey, Function>();

	return new Proxy(instance, {
		get(target, prop, _receiver) {
			if (prop === 'ai') return frozenMeta;
			if (prop === 'isValid') {
				if (meta.confidence === 0.0 || meta.rawIso === 'INVALID' || meta.ambiguous === true || !target.isValid)
					return false;
			}
			if (prop === 'constructor')
				return Reflect.get(target, prop, target);

			if (boundMethodCache.has(prop))
				return boundMethodCache.get(prop);

			const val = Reflect.get(target, prop, target);
			if (isFunction(val)) {
				const bound = val.bind(target);
				boundMethodCache.set(prop, bound);
				return bound;
			}
			return val;
		},
		has(target, prop) {
			if (prop === 'ai') return true;
			return Reflect.has(target, prop);
		},
	});
}
