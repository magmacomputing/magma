import { isDefined, isUndefined, isString, isNumber, isObject, isArray, isFunction, isNullish, isPrimitive } from '@magmacomputing/tempo/library';
import { _state } from './init.js';

export const CUSTOM_INSPECT_SYMBOL = Symbol.for('nodejs.util.inspect.custom');

const RE_EMAIL = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const RE_PHONE = /(?:\+?\d{1,3}[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s](\d{4})\b/g;
const RE_BEARER = /Bearer\s+[A-Za-z0-9_\-\.]+/gi;
const RE_API_KEY = /\b(?:sk-[a-zA-Z0-9_\-]{6,}|gsk_[a-zA-Z0-9_\-]{6,}|key-[a-zA-Z0-9_\-]{6,})\b/gi;

/**
 * Universal runtime environment detector.
 * Safely checks if the execution context is in production mode.
 */
export function isProductionEnvironment(): boolean {
	try {
		if (isUndefined(process?.env)) return false;
		const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
		if (nodeEnv === 'production' || nodeEnv === 'prod' || nodeEnv === 'live') return true;
		if (process.env.PROD === 'true' || process.env.PRODUCTION === 'true') return true;
		return false;
	} catch {
		return false;
	}
}

/**
 * Sanitizes and masks potential PII from strings for terminal/log output.
 *
 * In production mode:
 * - Emails are masked (e.g. `j***@example.com`)
 * - Phone numbers are masked (e.g. `***-***-5309`)
 * - Bearer tokens and API keys are redacted
 *
 * In development mode:
 * - Full fidelity text is preserved for local debugging.
 */
export function maskPii(input: any, isProd: boolean = isProductionEnvironment()): string {
	if (!isString(input)) return String(input);
	if (!isProd) return input;

	return input
		.replace(RE_BEARER, match => {
			const token = match.replace(/Bearer\s+/i, '');
			if (token.length <= 8) return 'Bearer [REDACTED]';
			return `Bearer ${token.slice(0, 4)}...${token.slice(-4)}`;
		})
		.replace(RE_API_KEY, match => {
			if (match.length <= 8) return '[REDACTED_KEY]';
			return `${match.slice(0, 5)}...${match.slice(-4)}`;
		})
		.replace(RE_EMAIL, match => {
			const parts = match.split('@');
			const name = parts[0] || '';
			const domain = parts[1] || '';
			return `${name.slice(0, 1)}***@${domain}`;
		})
		.replace(RE_PHONE, '***-***-$1');
}

/**
 * Sanitizes arbitrary objects, arrays, or primitives for safe log printing.
 * Protects against circular object references via a visited tracker.
 */
export function sanitizeForLog(
	data: any,
	isProd: boolean = isProductionEnvironment(),
	visited: WeakSet<object> = new WeakSet(),
): any {
	if (isNullish(data) || !isProd) return data;

	if (isString(data)) {
		const masked = maskPii(data, true);
		if (masked.length > 256) {
			return `${masked.slice(0, 200)}... [truncated, length: ${data.length}]`;
		}
		return masked;
	}

	if (isPrimitive(data)) return data;

	if (isArray(data)) {
		if (visited.has(data)) return '[CIRCULAR]';
		visited.add(data);
		return data.map(item => sanitizeForLog(item, isProd, visited));
	}

	if (isObject(data)) {
		if (visited.has(data)) return '[CIRCULAR]';
		visited.add(data);

		const result: Record<string, any> = {};
		for (const [key, val] of Object.entries(data)) {
			const lowerKey = key.toLowerCase();
			if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('auth')) {
				result[key] = '[REDACTED]';
			} else if (key === 'rawPrompt' || key === 'normalizedPrompt' || key === 'prompt' || key === 'reasoning') {
				result[key] = isString(val) ? maskPii(val, isProd) : sanitizeForLog(val, isProd, visited);
			} else {
				result[key] = sanitizeForLog(val, isProd, visited);
			}
		}
		return result;
	}

	return String(data);
}

/**
 * Emits a sanitized debug log line if debugging is active.
 *
 * @param tag - Logging namespace / tag (e.g. 'tempo-plugin-ai:parse')
 * @param message - Descriptive log message (automatically PII-masked)
 * @param payload - Optional diagnostic metadata or payload
 * @param options - Explicit debug override
 */
export function logDebug(
	tag: string,
	message: string,
	payload?: any,
	options?: { debug?: boolean | undefined },
): void {
	const shouldLog = options?.debug ?? _state.config.debug ?? false;
	if (!shouldLog) return;

	const isProd = isProductionEnvironment();
	const sanitizedMsg = maskPii(message, isProd);
	const prefix = tag.startsWith('[') ? tag : `[${tag}]`;

	if (payload !== undefined) {
		const sanitizedPayload = sanitizeForLog(payload, isProd);
		console.log(`${prefix} ${sanitizedMsg}`, sanitizedPayload);
	} else {
		console.log(`${prefix} ${sanitizedMsg}`);
	}
}

/**
 * Emits a sanitized debug warning if debugging is active.
 */
export function warnDebug(
	tag: string,
	message: string,
	error?: any,
	options?: { debug?: boolean | undefined },
): void {
	const shouldLog = options?.debug ?? _state.config.debug ?? false;
	if (!shouldLog) return;

	const isProd = isProductionEnvironment();
	const sanitizedMsg = maskPii(message, isProd);
	const prefix = tag.startsWith('[') ? tag : `[${tag}]`;

	if (error !== undefined) {
		const sanitizedError = error instanceof Error ? error : (isString(error) ? maskPii(error, isProd) : sanitizeForLog(error, isProd));
		console.warn(`${prefix} ${sanitizedMsg}:`, sanitizedError);
	} else {
		console.warn(`${prefix} ${sanitizedMsg}`);
	}
}

/**
 * Attaches custom inspection (`util.inspect.custom` and `toJSON`) hooks to an object
 * to ensure that `console.log()` outputs a PII-sanitized summary in terminal/log aggregators
 * without altering in-memory property access.
 */
export function attachCustomInspect<T extends object>(
	target: T,
	getInspectView: (obj: T, isProd: boolean) => Record<string, any>,
): T {
	try {
		Object.defineProperty(target, CUSTOM_INSPECT_SYMBOL, {
			value: function () {
				const isProd = isProductionEnvironment();
				return getInspectView(target, isProd);
			},
			configurable: true,
			enumerable: false,
			writable: true,
		});

		if (!isFunction((target as any).toJSON)) {
			Object.defineProperty(target, 'toJSON', {
				value: function () {
					const isProd = isProductionEnvironment();
					return getInspectView(target, isProd);
				},
				configurable: true,
				enumerable: false,
				writable: true,
			});
		}
	} catch { }

	return target;
}

/**
 * Sanitizes standard AI metadata (reasoning, prompt, limits) for custom inspection views.
 */
export function sanitizeInspectAiMeta(
	ai: {
		provider?: string | undefined;
		cached?: boolean | undefined;
		confidence?: number | undefined;
		reasoning?: string | undefined;
		limits?: any;
		rawPrompt?: string | undefined;
		normalizedPrompt?: string | undefined;
		ambiguous?: boolean | undefined;
		granularity?: string | undefined;
		rawIso?: string | undefined;
		[key: string]: any;
	},
	isProd: boolean = isProductionEnvironment(),
): Record<string, any> {
	return {
		provider: ai.provider,
		cached: ai.cached,
		confidence: ai.confidence,
		...(isDefined(ai.ambiguous) ? { ambiguous: ai.ambiguous } : {}),
		...(isDefined(ai.granularity) ? { granularity: ai.granularity } : {}),
		...(isDefined(ai.rawIso) ? { rawIso: ai.rawIso } : {}),
		...(isDefined(ai.rawPrompt) ? { rawPrompt: maskPii(ai.rawPrompt, isProd) } : {}),
		...(isDefined(ai.normalizedPrompt) ? { normalizedPrompt: maskPii(ai.normalizedPrompt, isProd) } : {}),
		...(isDefined(ai.reasoning) ? { reasoning: maskPii(ai.reasoning, isProd) } : {}),
		...(ai.limits ? { limits: ai.limits } : {}),
	};
}
