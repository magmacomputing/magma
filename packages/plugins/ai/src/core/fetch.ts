export class HttpError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public body: any = null
	) {
		super(`${status}: ${statusText}`);
		this.name = 'HttpError';
	}
}

export interface FetchRequestConfig {
	timeout?: number;
	maxBytes?: number;
	prefix?: string;
	rawText?: boolean;
}

/**
 * Perform a bounded HTTP fetch request with timeout and error handling.
 */
export async function fetchRequest<T = any>(
	url: string | URL,
	init: RequestInit = {},
	config: FetchRequestConfig = {}
): Promise<T> {
	const timeout = config.timeout ?? 5000;
	const signal = init.signal
		? AbortSignal.any([init.signal, AbortSignal.timeout(timeout)])
		: AbortSignal.timeout(timeout);

	const res = await fetch(url, { ...init, signal });
	if (!res.ok) {
		let errorBody: any = null;
		try {
			const errorText = await res.text();
			try { errorBody = JSON.parse(errorText); } catch { errorBody = errorText; }
		} catch { }
		throw new HttpError(res.status, res.statusText, errorBody);
	}

	if (config.maxBytes) {
		const contentLength = res.headers?.get?.('content-length');
		if (contentLength) {
			const parsed = parseInt(contentLength, 10);
			if (!Number.isNaN(parsed) && parsed > config.maxBytes) {
				try { await res.body?.cancel?.(); } catch { }
				throw new HttpError(413, `Payload length exceeds limit (${config.maxBytes} bytes)`, null);
			}
		}
	}

	let text: string;
	if (config.maxBytes && res.body && typeof res.body.getReader === 'function') {
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let totalBytes = 0;
		const chunks: string[] = [];
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) {
					totalBytes += value.byteLength;
					if (totalBytes > config.maxBytes) {
						await reader.cancel('maxBytes exceeded');
						throw new HttpError(413, `Payload length exceeds limit (${config.maxBytes} bytes)`, null);
					}
					chunks.push(decoder.decode(value, { stream: true }));
				}
			}
			chunks.push(decoder.decode());
			text = chunks.join('');
		} catch (err) {
			try { await reader.cancel(); } catch { }
			throw err;
		} finally {
			try { reader.releaseLock(); } catch { }
		}
	} else {
		text = await res.text();
		if (config.maxBytes && new TextEncoder().encode(text).byteLength > config.maxBytes) {
			throw new HttpError(413, `Payload length exceeds limit (${config.maxBytes} bytes)`, null);
		}
	}

	if (config.rawText)
		return text as unknown as T;

	const contentType = res.headers?.get?.('content-type') || '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(text) as T;
		} catch {
			return text as unknown as T;
		}
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		return text as unknown as T;
	}
}
