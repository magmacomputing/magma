import { Tempo } from '#tempo';

describe('parse prefilter feature flag', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('defaults to disabled', () => {
		expect(Tempo.parse.parsePrefilter).toBe(false);
	});

	test('can be enabled globally via Tempo.init', () => {
		Tempo.init({ parsePrefilter: true });

		expect(Tempo.parse.parsePrefilter).toBe(true);

		const t = new Tempo('2 days ago', { timeZone: 'UTC' });
		expect(t.parse.result?.[0]?.match).toBe('relativeOffset');
	});

	test('can be enabled per-instance without changing global setting', () => {
		Tempo.init({ parsePrefilter: false });
		const t = new Tempo('monday', { timeZone: 'UTC', parsePrefilter: true });

		expect(Tempo.parse.parsePrefilter).toBe(false);
		expect(t.parse.parsePrefilter).toBe(true);
	});

	test('can be disabled per-instance even when global is enabled', () => {
		Tempo.init({ parsePrefilter: true });
		const t = new Tempo('monday', { timeZone: 'UTC', parsePrefilter: false });

		expect(Tempo.parse.parsePrefilter).toBe(true);
		expect(t.parse.parsePrefilter).toBe(false);
	});

	test('emits planner debug telemetry when debug + parsePrefilter are enabled', () => {
		Tempo.init({ debug: true, parsePrefilter: true });
		const t = new Tempo('2 days ago', { timeZone: 'UTC' });
		expect(t.parse.result?.[0]?.match).toBe('relativeOffset');
		expect(console.debug).toHaveBeenCalled();
	});
});
