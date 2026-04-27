import { Tempo } from '#tempo/core';

describe('Tempo.duration() (Core)', () => {
	beforeEach(() => { Tempo.init(); });

	it('should throw "plugin not loaded" by default', () => {
		const t = new Tempo('2024-01-01');
		expect(() => t.until('2024-01-02')).toThrow(/Tempo: DurationModule not loaded/);
		expect(console.error).toHaveBeenCalled();
	});

	it('should work after importing the plugin', async () => {
		// @ts-ignore
		await import('#tempo/duration');

		const t = new Tempo('2024-01-01');
		const diff = t.until('2024-01-02', 'days');
		expect(diff).toBe(1);
	});
});
