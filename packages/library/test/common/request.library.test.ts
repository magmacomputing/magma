import { fetchRequest, fetchHead, HttpError } from '../../src/common/request.library.js';

describe('request.library', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		globalThis.fetch = mockFetch;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchRequest', () => {
		it('should parse JSON when Content-Type is application/json', async () => {
			const mockData = { message: 'hello' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' }),
				json: async () => mockData
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/api');
			expect(result).toEqual(mockData);
		});

		it('should return raw text when Content-Type is not JSON', async () => {
			const mockText = 'hello world';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'text/plain' }),
				text: async () => mockText
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/text');
			expect(result).toEqual(mockText);
		});

		it('should strip prefix if provided', async () => {
			const prefix = ')]}\'\n';
			const rawText = `${prefix}{"a":1}`;
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				text: async () => rawText
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/data', {}, { prefix });
			expect(result).toEqual({ a: 1 });
		});

		it('should throw HttpError with JSON body on 400', async () => {
			const errorBody = { error: 'Bad request' };
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: async () => JSON.stringify(errorBody)
			} as unknown as Response);

			try {
				await fetchRequest('https://example.com/api');
				expect.fail('Should have thrown HttpError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(HttpError);
				expect(err.status).toBe(400);
				expect(err.statusText).toBe('Bad Request');
				expect(err.body).toEqual(errorBody);
			}
		});

		it('should throw HttpError with text body on 500 when JSON parsing fails', async () => {
			const errorText = 'Internal Server Error Occurred';
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Server Error',
				text: async () => errorText
			} as unknown as Response);

			try {
				await fetchRequest('https://example.com/api');
				expect.fail('Should have thrown HttpError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(HttpError);
				expect(err.status).toBe(500);
				expect(err.body).toBe(errorText);
			}
		});

		it('should reject when Content-Length exceeds maxBytes', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({
					'Content-Type': 'application/json',
					'Content-Length': '2048'
				})
			} as unknown as Response);

			await expect(fetchRequest('https://example.com/large', {}, { maxBytes: 1024 }))
				.rejects.toThrow('Content-Length (2048) exceeds limit (1024 bytes)');
		});

		it('should reject streamed response when cumulative bytes exceed maxBytes', async () => {
			let cancelled = false;
			const stream = new ReadableStream({
				pull(controller) {
					controller.enqueue(new Uint8Array(512));
				},
				cancel() {
					cancelled = true;
				}
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				body: stream
			} as unknown as Response);

			try {
				await fetchRequest('https://example.com/stream-large', {}, { maxBytes: 1000 });
				expect.fail('Should have thrown HttpError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(HttpError);
				expect(err.status).toBe(413);
				expect(cancelled).toBe(true);
			}
		});

		it('should successfully read streamed response within maxBytes limit', async () => {
			const payload = JSON.stringify({ success: true, count: 42 });
			const encoder = new TextEncoder();
			const bytes = encoder.encode(payload);

			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(bytes);
					controller.close();
				}
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				body: stream
			} as unknown as Response);

			const result = await fetchRequest<{ success: boolean; count: number }>(
				'https://example.com/stream-valid',
				{},
				{ maxBytes: 1024 }
			);
			expect(result).toEqual({ success: true, count: 42 });
		});

		it('should support prefix stripping combined with maxBytes limit', async () => {
			const prefix = ')]}\'\n';
			const payload = `${prefix}{"valid":true}`;
			const encoder = new TextEncoder();
			const bytes = encoder.encode(payload);

			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(bytes);
					controller.close();
				}
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				body: stream
			} as unknown as Response);

			const result = await fetchRequest<{ valid: boolean }>(
				'https://example.com/prefix-stream',
				{},
				{ prefix, maxBytes: 1024 }
			);
			expect(result).toEqual({ valid: true });
		});
	});

	describe('fetchHead', () => {
		it('should return status and headers on ok response', async () => {
			const mockHeaders = new Headers({ 'Content-Length': '123' });
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: mockHeaders
			} as unknown as Response);

			const result = await fetchHead('https://example.com/api');
			expect(result.status).toBe(200);
			expect(result.headers).toBe(mockHeaders);
		});

		it('should throw Error on non-ok response (except Forbidden)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			} as unknown as Response);

			await expect(fetchHead('https://example.com/api')).rejects.toThrow('404: Not Found');
		});

		it('should return status and headers on Forbidden (403)', async () => {
			const mockHeaders = new Headers();
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 403,
				headers: mockHeaders
			} as unknown as Response);

			const result = await fetchHead('https://example.com/api');
			expect(result.status).toBe(403);
			expect(result.headers).toBe(mockHeaders);
		});
	});
});
