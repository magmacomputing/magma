import { parseAI, initAI, clearAiCache, type AiCacheAdapter } from '../src/index.js';
import { Tempo } from '@magmacomputing/tempo';

describe('Advanced Cache TTL & Async Storage Adapters', () => {
	beforeEach(async () => {
		vi.restoreAllMocks();
		Tempo.cache.clear();
		await initAI({
			providers: [{ id: 'groq', key: 'mock-test-key' }],
			remoteConfigUrl: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Tempo.cache.clear();
	});

	it('should read from and write to custom async AiCacheAdapter', async () => {
		const store = new Map<string, string>();
		const ttlLogs: number[] = [];

		const mockAdapter: AiCacheAdapter = {
			get: vi.fn(async (key: string) => store.get(key)),
			set: vi.fn(async (key: string, value: string, ttlMs?: number) => {
				store.set(key, value);
				if (ttlMs) ttlLogs.push(ttlMs);
			}),
			delete: vi.fn(async (key: string) => {
				store.delete(key);
			}),
			clear: vi.fn(async () => {
				store.clear();
			}),
		}

		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'mock-test-key' }],
			cacheAdapter: mockAdapter,
			ttl: 120000,
		});

		// Mock LLM fetch response for first call
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Custom adapter test", "iso":"2026-11-26T00:00:00", "confidence":0.95}' } }],
			}), { status: 200 }),
		);

		const result1 = await parseAI('Thanksgiving 2026');
		expect(result1.isValid).toBe(true);
		expect(result1.ai?.provider).toBe('groq');
		expect(mockAdapter.set).toHaveBeenCalled();
		expect(ttlLogs).toContain(120000);

		// Second call should hit the custom adapter
		const result2 = await parseAI('Thanksgiving 2026');
		expect(result2.isValid).toBe(true);
		expect(result2.ai?.provider).toBe('cache');
		expect(result2.ai?.cached).toBe(true);
		expect(mockAdapter.get).toHaveBeenCalled();
	});

	it('should observe TTL resolution hierarchy (options.ttl > provider.ttl > global config.ttl)', async () => {
		const setTtlLogs: number[] = [];

		const mockAdapter: AiCacheAdapter = {
			get: vi.fn(() => undefined),
			set: vi.fn((_key: string, _val: string, ttlMs?: number) => {
				if (ttlMs) setTtlLogs.push(ttlMs);
			}),
		};

		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'mock-key', ttl: 60000 }],
			cacheAdapter: mockAdapter,
			ttl: 300000,
		});

		vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
			new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"TTL test", "iso":"2026-12-25T00:00:00", "confidence":0.95}' } }],
			}), { status: 200 }),
		));

		// Call 1: Inherits provider.ttl (60000)
		await parseAI('Christmas 2026');
		expect(setTtlLogs[0]).toBe(60000);

		// Call 2: Call-site options.ttl (15000) overrides provider and global TTL
		await parseAI('Christmas 2026', { force: true, ttl: 15000 });
		expect(setTtlLogs[1]).toBe(15000);
	});

	it('should fail-open and fetch from LLM if custom cacheAdapter throws a network error', async () => {
		const faultyAdapter: AiCacheAdapter = {
			get: vi.fn(async () => {
				throw new Error('Redis connection refused');
			}),
			set: vi.fn(async () => {
				throw new Error('Redis write error');
			}),
		};

		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'mock-key' }],
			cacheAdapter: faultyAdapter,
		});

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Faulty adapter test", "iso":"2026-07-04T00:00:00", "confidence":0.95}' } }],
			}), { status: 200 }),
		);

		// parseAI should NOT throw Redis error; it should fail open to LLM fetch
		const result = await parseAI('Independence Day 2026');
		expect(result.isValid).toBe(true);
		expect(result.ai?.provider).toBe('groq');
	});

	it('should clear custom cacheAdapter entries when clearAiCache is invoked', async () => {
		const mockAdapter: AiCacheAdapter = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			clear: vi.fn(),
		};

		await initAI({
			remoteConfigUrl: false,
			cacheAdapter: mockAdapter,
		});

		clearAiCache('Easter 2026');
		expect(mockAdapter.delete).toHaveBeenCalled();
		expect(mockAdapter.clear).toHaveBeenCalled();

		clearAiCache();
		expect(mockAdapter.clear).toHaveBeenCalledTimes(2);
	});
});
