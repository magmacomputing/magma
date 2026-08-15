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
		if (typeof process === 'undefined' || !process?.env) return false;
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
export function maskPii(input: string, isProd: boolean = isProductionEnvironment()): string {
	if (typeof input !== 'string') return String(input);
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
	if (data === null || data === undefined) return data;
	if (!isProd) return data;

	if (typeof data === 'string') {
		const masked = maskPii(data, true);
		if (masked.length > 256) {
			return `${masked.slice(0, 200)}... [truncated, length: ${data.length}]`;
		}
		return masked;
	}
	if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'symbol' || typeof data === 'bigint') return data;

	if (typeof data === 'object') {
		if (visited.has(data)) return '[CIRCULAR]';
		visited.add(data);

		if (Array.isArray(data))
			return data.map(item => sanitizeForLog(item, isProd, visited));

		const result: Record<string, any> = {};
		for (const [key, val] of Object.entries(data)) {
			const lowerKey = key.toLowerCase();
			if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('auth')) {
				result[key] = '[REDACTED]';
			} else if (key === 'rawPrompt' || key === 'normalizedPrompt' || key === 'prompt' || key === 'reasoning') {
				result[key] = typeof val === 'string' ? maskPii(val, isProd) : sanitizeForLog(val, isProd, visited);
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
		const sanitizedError = error instanceof Error ? error : (typeof error === 'string' ? maskPii(error, isProd) : sanitizeForLog(error, isProd));
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

		if (typeof (target as any).toJSON !== 'function') {
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
