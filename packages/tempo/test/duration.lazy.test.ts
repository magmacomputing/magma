import { Tempo } from '#tempo/core';

describe('Tempo.duration() (Core)', () => {
	beforeEach(() => { Tempo.init(); });
	afterEach(() => vi.restoreAllMocks())

	it('should throw "plugin not loaded" by default', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
		const t = new Tempo('2024-01-01');
		expect(() => t.until('2024-01-02')).toThrow(/Tempo: DurationModule module not loaded/);
		expect(spy).toHaveBeenCalled();
	});

	it('should work after importing the plugin', async () => {
		// @ts-ignore
		await import('#tempo/duration');

		const t = new Tempo('2024-01-01');
		const diff = t.until('2024-01-02', 'days');
		expect(diff).toBe(1);
	});
});
