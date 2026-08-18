import { Tempo } from '#tempo';

describe('parse prefilter feature flag', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('defaults to enabled', () => {
		expect(Tempo.parse.planner.preFilter).toBe(true);
	});

	test('can be enabled globally via Tempo.init', () => {
		Tempo.init({ preFilter: true });

		expect(Tempo.parse.planner.preFilter).toBe(true);

		const t = new Tempo('2 days ago', { timeZone: 'UTC' });
		expect(t.parse.result?.[0]?.match).toBe('relativeOffset');
	});

	test('can be disabled per-instance without changing global setting', () => {
		Tempo.init({ preFilter: true });
		const t = new Tempo('monday', { timeZone: 'UTC', preFilter: false });

		expect(Tempo.parse.planner.preFilter).toBe(true);
		expect(t.parse.planner.preFilter).toBe(false);
	});

	test('can be enabled per-instance even when global is disabled', () => {
		Tempo.init({ preFilter: false });
		const t = new Tempo('monday', { timeZone: 'UTC', preFilter: true });

		expect(Tempo.parse.planner.preFilter).toBe(false);
		expect(t.parse.planner.preFilter).toBe(true);
	});

	test('emits planner debug telemetry when debug + preFilter are enabled', () => {
		Tempo.init({ debug: 5, preFilter: true });
		const t = new Tempo('2 days ago', { timeZone: 'UTC' });
		expect(t.parse.result?.[0]?.match).toBe('relativeOffset');
		expect(console.debug).toHaveBeenCalled();
	});
});
