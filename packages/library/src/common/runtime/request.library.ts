import { isNumber, isDefined, isString, isFunction } from '#library/assertion.library.js';
import type { ValueOf } from '#library/type.library.js';

const TWO_SECONDS = 2_000;																	// default time-out for requests, in milliseconds
const RE_TRAILING_CLOSURE = /\);?$/;

/**
 * Common HTTP status code constants.
 */
export const HTTP = {
	Ok: 200,
	PermRedirect: 301,
	TempRedirect: 302,
	BadRequest: 400,
	Unauthorised: 401,
	Forbidden: 403,
} as const
/**
 * Type representing an HTTP status code value.
 */
export type HTTP = ValueOf<typeof HTTP>

export const METHOD = {
	Head: 'HEAD',
	Get: 'GET',
	Put: 'PUT',
	Delete: 'DELETE',
	Post: 'POST',
} as const

type Config = {
	/** number of milliseconds to attempt a request */				timeout?: number;
	/** response wrapper (eg.  "alert({hello:'there'})" */		prefix?: string;
	/** maximum cumulative bytes allowed before aborting */		maxBytes?: number;
}

export class HttpError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public body: any
	) {
		super(`${status}: ${statusText}`);
		this.name = 'HttpError';
	}
}

/**
 * Internal helper: incrementally reads a response body, enforcing a cumulative maxBytes limit.
 */
const readBoundedBody = async (res: Response, maxBytes: number): Promise<string> => {
	const contentLength = res.headers?.get?.('Content-Length') || res.headers?.get?.('content-length');
	if (contentLength) {
		const bytes = parseInt(contentLength, 10);
		if (isNumber(bytes) && bytes > maxBytes) {
			try { await res.body?.cancel(); } catch { }
			throw new HttpError(413, `Content-Length (${bytes}) exceeds limit (${maxBytes} bytes)`, null);
		}
	}

	if (!res.body) {
		let rawText: string;
		if (isFunction(res.text)) {
			rawText = await res.text();
		} else if (isFunction(res.json)) {
			const obj = await res.json();
			rawText = JSON.stringify(obj) ?? '';
		} else {
			rawText = '';
		}
		const byteLength = new TextEncoder().encode(rawText).byteLength;
		if (byteLength > maxBytes)
			throw new HttpError(413, `Payload length (${byteLength}) exceeds limit (${maxBytes} bytes)`, null);
		return rawText;
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let totalBytes = 0;
	let rawText = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done)
				break;
			if (value) {
				totalBytes += value.byteLength;
				if (totalBytes > maxBytes) {
					try { await reader.cancel(); } catch { }
					throw new HttpError(413, `Streamed payload exceeded limit (${maxBytes} bytes)`, null);
				}
				rawText += decoder.decode(value, { stream: true });
			}
		}
		rawText += decoder.decode();
		return rawText;
	} finally {
		try { reader.releaseLock(); } catch { }
	}
};

/**
 * Performs an HTTP fetch request with built-in timeout, JSON parsing, prefix handling, and bounded stream reading.
 * Automatically throws an `HttpError` if the response is not `ok` or exceeds `maxBytes`.
 * 
 * @param url - The resource URL to fetch
 * @param init - Optional RequestInit configuration
 * @param config - Optional configuration including timeout, prefix stripping, and maxBytes limit
 * @returns A promise resolving to the parsed response body
 * @example
 * ```ts
 * const data = await fetchRequest<MyData>('https://api.example.com', {}, { maxBytes: 512 * 1024 });
 * ```
 */
export const fetchRequest = <T>(url: string | URL, init = {} as RequestInit, config = {} as Config) => {
	const signallingInit = {
		...init,
		signal: init.signal
			? AbortSignal.any([init.signal, AbortSignal.timeout(config.timeout ?? TWO_SECONDS)])
			: AbortSignal.timeout(config.timeout ?? TWO_SECONDS)
	};

	return fetch(url, signallingInit)													// caller will handle the 'catch' if error
		.then(async res => {
			if (res.ok) {
				const contentType = res.headers?.get?.('Content-Type') || res.headers?.get?.('content-type') || '';
				const isJson = contentType.includes('application/json');

				if (isDefined(config.maxBytes)) {
					const rawText = await readBoundedBody(res, config.maxBytes);

					if (config.prefix) {
						const json = rawText.startsWith(config.prefix)
							? rawText.substring(config.prefix.length).replace(RE_TRAILING_CLOSURE, '')
							: rawText;
						return JSON.parse(json) as T;
					}

					if (isJson)
						return JSON.parse(rawText) as T;

					try {
						return JSON.parse(rawText) as T;
					} catch {
						return rawText as unknown as T;
					}
				}

				if (config.prefix) {
					const rawPrefixText = await res.text();						// read raw text first
					const json = rawPrefixText.startsWith(config.prefix)				// if it starts with the specified prefix
						? rawPrefixText.substring(config.prefix.length).replace(RE_TRAILING_CLOSURE, '')	// then strip the prefix AND any trailing closure
						: rawPrefixText;

					return JSON.parse(json) as T;											// parse the unwrapped string
				}

				if (isFunction(res.text)) {
					const text = await res.text();
					try {
						return JSON.parse(text) as T;
					} catch {
						return text as unknown as T;
					}
				}

				if (isFunction(res.json))
					return await res.json() as T;

				return '' as unknown as T;
			}

			let errorBody: any = null;
			try {
				const errorText = await res.text();
				try { errorBody = JSON.parse(errorText); } catch { errorBody = errorText; }
			} catch { }

			throw new HttpError(res.status, res.statusText, errorBody);	// fetch not successful
		})
}

/**
 * Performs an HTTP HEAD request to retrieve response headers without the body.
 * Useful for verifying URL existence or checking metadata.
 * 
 * @param url - The resource URL to check
 * @returns A promise resolving to the response status and headers
 * @example
 * ```ts
 * const { status } = await fetchHead('https://example.com');
 * ```
 */
export const fetchHead = (url: string | URL) => {
	const signal = AbortSignal.timeout(TWO_SECONDS);
	const init = { method: METHOD.Head, signal }							// only interested in verifying that url responds

	return fetch(url, init)																		// caller will handle the 'catch' if error
		.then(({ ok, status, statusText, headers }) => {
			if (ok || status === HTTP.Forbidden)									// forbidden, but at least we know url responds
				return { status, headers }

			throw new HttpError(status, statusText, null);				// fetch not successful
		})
}
