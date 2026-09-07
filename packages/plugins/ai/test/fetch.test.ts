import { fetchRequest, HttpError } from '../src/core/fetch.js';

describe('fetchRequest error body handling and maxBytes limit', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should parse error body on non-OK response within maxBytes', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'invalid_prompt' }), {
				status: 400,
				statusText: 'Bad Request',
				headers: { 'content-type': 'application/json' },
			})
		);

		await expect(fetchRequest('https://example.com/api', {}, { maxBytes: 1000 })).rejects.toMatchObject({
			status: 400,
			statusText: 'Bad Request',
			body: { error: 'invalid_prompt' },
		});
	});

	it('should reject non-OK response if Content-Length exceeds maxBytes', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('large error payload', {
				status: 500,
				statusText: 'Internal Server Error',
				headers: { 'content-length': '5000' },
			})
		);

		await expect(fetchRequest('https://example.com/api', {}, { maxBytes: 500 })).rejects.toMatchObject({
			status: 413,
			message: expect.stringContaining('Payload length exceeds limit'),
		});
	});

	it('should reject non-OK streaming body if payload exceeds maxBytes', async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('chunk1: 1234567890'));
				controller.enqueue(new TextEncoder().encode('chunk2: 1234567890'));
				controller.close();
			},
		});

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(stream, {
				status: 502,
				statusText: 'Bad Gateway',
			})
		);

		await expect(fetchRequest('https://example.com/api', {}, { maxBytes: 15 })).rejects.toMatchObject({
			status: 413,
			message: expect.stringContaining('Payload length exceeds limit'),
		});
	});
});
