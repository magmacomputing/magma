import { Tempo } from '#tempo/core';
import { getRuntime } from '#tempo/support';

describe('Tempo.duration() (Core)', () => {
	// Preserve the existing reset hooks and give this test suite a clean slate.
	let savedHooks: Array<() => void> = [];

	beforeAll(() => {
		const hooks = getRuntime().resetHooks;
		hooks.forEach(h => savedHooks.push(h));
		hooks.clear();
	});

	afterAll(() => {
		const hooks = getRuntime().resetHooks;
		hooks.clear();
		savedHooks.forEach(h => hooks.add(h));
	});

	beforeEach(() => { Tempo.init(); });

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
