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
	afterEach(() => vi.restoreAllMocks())

	it('should throw Error if plugin not loaded', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
		expect(() => Tempo.duration('P1Y')).toThrow('duration plugin not loaded');
		expect(spy).toHaveBeenCalled();
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
