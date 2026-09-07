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

async function readResponseBody(res: Response, maxBytes?: number): Promise<string> {
	if (maxBytes) {
		const contentLength = res.headers?.get?.('content-length');
		if (contentLength) {
			const parsed = parseInt(contentLength, 10);
			if (!Number.isNaN(parsed) && parsed > maxBytes) {
				try { await res.body?.cancel?.(); } catch { }
				throw new HttpError(413, `Payload length exceeds limit (${maxBytes} bytes)`, null);
			}
		}
	}

	if (maxBytes && res.body && typeof res.body.getReader === 'function') {
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
					if (totalBytes > maxBytes) {
						await reader.cancel('maxBytes exceeded');
						throw new HttpError(413, `Payload length exceeds limit (${maxBytes} bytes)`, null);
					}
					chunks.push(decoder.decode(value, { stream: true }));
				}
			}
			chunks.push(decoder.decode());
			return chunks.join('');
		} catch (err) {
			try { await reader.cancel(); } catch { }
			throw err;
		} finally {
			try { reader.releaseLock(); } catch { }
		}
	} else {
		const text = await res.text();
		if (maxBytes && new TextEncoder().encode(text).byteLength > maxBytes)
			throw new HttpError(413, `Payload length exceeds limit (${maxBytes} bytes)`, null);

		return text;
	}
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
			const errorText = await readResponseBody(res, config.maxBytes);
			try { errorBody = JSON.parse(errorText); } catch { errorBody = errorText; }
		} catch (err) {
			if (err instanceof HttpError && err.status === 413) throw err;
		}
		throw new HttpError(res.status, res.statusText, errorBody);
	}

	const text = await readResponseBody(res, config.maxBytes);

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
