import { Tempo } from '#tempo/core';
import { getRuntime } from '#tempo/tempo.runtime.js';

// Preserve the existing reset hooks and give this test suite a clean slate.
// Using the runtime API instead of the legacy globalThis[sym.$reset] slot.
const savedHooks: Array<() => void> = [];

beforeAll(() => {
	const hooks = getRuntime().resetHooks;
	hooks.forEach(h => savedHooks.push(h));
	hooks.clear();
});

afterAll(() => {
	// Restore original state to avoid polluting other tests
	const hooks = getRuntime().resetHooks;
	hooks.clear();
	savedHooks.forEach(h => hooks.add(h));
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
