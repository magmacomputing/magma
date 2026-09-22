import { fetchRequest } from '../src/core/fetch.js';
import { fetchFromProvider } from '../src/core/transport.js';
import { initAI, resetAI } from '../src/core/init.js';

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

describe('fetchFromProvider telemetry opt-out behavior', () => {
	beforeEach(() => {
		resetAI();
	});

	afterEach(() => {
		resetAI();
		vi.restoreAllMocks();
		delete process.env.TEMPO_TELEMETRY;
		delete process.env.TEMPO_TELEMETRY_DISABLED;
	});

	it('should attach x-tempo-telemetry: false header when options.telemetry is false for tempo provider', async () => {
		let capturedTelemetryHeader: string | undefined;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
			if (String(url).includes('manifest') || String(url).includes('providers.v1.json')) {
				return new Response(JSON.stringify({ version: '1.0.0', providers: {} }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				});
			}
			capturedTelemetryHeader = init?.headers?.['x-tempo-telemetry'];
			return new Response(JSON.stringify({
				choices: [{ message: { content: JSON.stringify({ reasoning: 'ok', iso: '2026-09-23T12:00:00', confidence: 0.95, ambiguous: false, granularity: 'minute' }) } }]
			}), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		});

		await fetchFromProvider(
			{ id: 'tempo', key: 'test-key', url: 'https://tempo.magmacomputing.com.au/api/ai/tempo' },
			'tomorrow',
			'context',
			{ telemetry: false }
		);

		expect(capturedTelemetryHeader).toBe('false');
	});

	it('should attach x-tempo-telemetry: false header when global config.telemetry is false', async () => {
		let capturedTelemetryHeader: string | undefined;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
			if (String(url).includes('manifest') || String(url).includes('providers.v1.json')) {
				return new Response(JSON.stringify({ version: '1.0.0', providers: {} }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				});
			}
			capturedTelemetryHeader = init?.headers?.['x-tempo-telemetry'];
			return new Response(JSON.stringify({
				choices: [{ message: { content: JSON.stringify({ reasoning: 'ok', iso: '2026-09-23T12:00:00', confidence: 0.95, ambiguous: false, granularity: 'minute' }) } }]
			}), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		});

		await initAI({
			remoteConfigUrl: false,
			telemetry: false,
			providers: [{ id: 'tempo', key: 'test-key', url: 'https://tempo.magmacomputing.com.au/api/ai/tempo' }]
		});

		await fetchFromProvider(
			{ id: 'tempo', key: 'test-key', url: 'https://tempo.magmacomputing.com.au/api/ai/tempo' },
			'tomorrow',
			'context'
		);

		expect(capturedTelemetryHeader).toBe('false');
	});

	it('should attach x-tempo-telemetry: false header when TEMPO_TELEMETRY=0 environment variable is set', async () => {
		process.env.TEMPO_TELEMETRY = '0';

		let capturedTelemetryHeader: string | undefined;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
			if (String(url).includes('manifest') || String(url).includes('providers.v1.json')) {
				return new Response(JSON.stringify({ version: '1.0.0', providers: {} }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				});
			}
			capturedTelemetryHeader = init?.headers?.['x-tempo-telemetry'];
			return new Response(JSON.stringify({
				choices: [{ message: { content: JSON.stringify({ reasoning: 'ok', iso: '2026-09-23T12:00:00', confidence: 0.95, ambiguous: false, granularity: 'minute' }) } }]
			}), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		});

		await fetchFromProvider(
			{ id: 'tempo', key: 'test-key', url: 'https://tempo.magmacomputing.com.au/api/ai/tempo' },
			'tomorrow',
			'context'
		);

		expect(capturedTelemetryHeader).toBe('false');
	});
});

