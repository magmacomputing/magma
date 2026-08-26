import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin, isCronString } from '../src/index.js';

Tempo.extend(TickerPlugin);

describe('Ticker Cron Support', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('identifies 5-field cron strings using isCronString helper', () => {
		expect(isCronString('0 9 * * 1-5')).toBe(true);
		expect(isCronString('*/15 * * * *')).toBe(true);
		expect(isCronString('0 0 1 1 *')).toBe(true);
		expect(isCronString('FREQ=DAILY;BYHOUR=9')).toBe(false);
		expect(isCronString('5s')).toBe(false);
		expect(isCronString('2026-04-25 10:30')).toBe(false);
	});

	test('creates Ticker from positional cron string overload', () => {
		const t = Tempo.ticker('0 9 * * 1-5');
		expect(t.info.cron).toBe('0 9 * * 1-5');
		t.stop();
	});

	test('creates Ticker from options object with cron property', () => {
		const t = Tempo.ticker({ cron: '*/15 * * * *', label: 'Quarterly Check' });
		expect(t.info.cron).toBe('*/15 * * * *');
		expect(t.info.label).toBe('Quarterly Check');
		t.stop();
	});

	test('exposes .cron in Tempo.tickers active snapshots', () => {
		const t = Tempo.ticker('0 12 * * *');
		const activeSnapshots = Tempo.tickers;
		expect(activeSnapshots.length).toBeGreaterThan(0);
		const match = activeSnapshots.find(s => s.cron === '0 12 * * *');
		expect(match).toBeDefined();
		expect(match?.cron).toBe('0 12 * * *');
		t.stop();
	});

	test('stepping via pulse() follows Cron schedule deterministically', () => {
		// Seed at 2026-08-22 08:45:00
		const seed = new Tempo('2026-08-22 08:45');
		// Cron for 9am every day: '0 9 * * *'
		const t = Tempo.ticker({ cron: '0 9 * * *', seed });

		const step1 = t.pulse();
		expect(step1.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-22 08:45');

		const step2 = t.pulse();
		expect(step2.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-22 09:00');

		const step3 = t.pulse();
		expect(step3.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-23 09:00');

		t.stop();
	});

	test('respects limit boundary when pulsing cron tickers', () => {
		const seed = new Tempo('2026-08-22 00:00');
		const t = Tempo.ticker({ cron: '0 0 * * *', seed, limit: 2 });

		const p1 = t.pulse();
		expect(p1.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-22');
		expect(t.info.stopped).toBe(false);

		const p2 = t.pulse();
		expect(p2.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-23');
		expect(t.info.stopped).toBe(true);
	});

	test('handles cron schedule across daylight saving transition with IANA timezone', () => {
		// US Eastern DST spring forward on March 8, 2026 at 02:00 -> 03:00 (EST -05:00 to EDT -04:00)
		Tempo.init({ timeZone: 'America/New_York' });
		const seed = new Tempo('2026-03-07 08:45');
		const t = Tempo.ticker({ cron: '0 9 * * *', seed });

		const step1 = t.pulse(); // seed: 2026-03-07 08:45 EST
		expect(step1.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-03-07 08:45');

		const step2 = t.pulse(); // 2026-03-07 09:00 EST
		expect(step2.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-03-07 09:00');

		const step3 = t.pulse(); // 2026-03-08 09:00 EDT (post-DST transition)
		expect(step3.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-03-08 09:00');

		const step4 = t.pulse(); // 2026-03-09 09:00 EDT
		expect(step4.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-03-09 09:00');

		expect(t.info.cron).toBe('0 9 * * *');
		t.stop();
	});

	test('allows options-only ticker construction without throwing', () => {
		const t = Tempo.ticker({ limit: 5 });
		expect(t.info.limit).toBe(5);
		expect(t.info.stopped).toBe(false);
		t.stop();
	});

	test('validates empty string cron option as invalid schedule', () => {
		expect(() => Tempo.ticker({ cron: '', catch: false })).toThrow(/Invalid Ticker cron schedule/);
	});

	test('rejects invalid positional input when catch is false', () => {
		expect(() => Tempo.ticker('invalid-positional-arg', { catch: false })).toThrow();
	});
});
