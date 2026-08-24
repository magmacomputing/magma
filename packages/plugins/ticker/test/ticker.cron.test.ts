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
		// US Eastern DST spring forward on 2026-03-08
		const seed = new Tempo('2026-03-07 08:45', { timeZone: 'America/New_York' });
		const t = Tempo.ticker({ cron: '0 9 * * *', seed });

		const step1 = t.pulse();
		expect(step1.epoch.ms).toBe(seed.epoch.ms);

		const step2 = t.pulse();
		expect(step2.epoch.ms).toBeGreaterThan(step1.epoch.ms);

		const step3 = t.pulse();
		expect(step3.epoch.ms).toBeGreaterThan(step2.epoch.ms);

		expect(t.info.cron).toBe('0 9 * * *');
		t.stop();
	});
});
