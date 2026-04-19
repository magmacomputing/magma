import { Tempo } from '#tempo/core';
import sym from '#tempo/tempo.symbol.js';

let originalReset: Set<any>;

beforeAll(() => {
	// Preserve original reset hooks and provide a clean slate for this core test
	originalReset = (globalThis as any)[sym.$reset];
	(globalThis as any)[sym.$reset] = new Set();
});

afterAll(() => {
	// Restore original state to avoid polluting other tests
	(globalThis as any)[sym.$reset] = originalReset;
});

describe('Tempo.duration() (Core)', () => {
	beforeEach(() => { Tempo.init(); });
	afterEach(() => vi.restoreAllMocks())

	it('should be undefined if plugin not loaded', () => {
		expect(Tempo.duration).toBeUndefined();
		expect(() => (Tempo as any).duration('P1Y')).toThrow();
	});

	it('should work after manual extension', async () => {
		// @ts-ignore
		const { DurationModule } = await import('#tempo/duration');
		Tempo.extend(DurationModule);
		
		const d = Tempo.duration('P1Y');
		expect(d.years).toBe(1);
		expect(d.iso).toBe('P1Y');
	});
});
