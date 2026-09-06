import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '../src/index.js';

Tempo.use(TickerPlugin);

describe('Ticker RRULE Support', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('creates Ticker from raw RRULE string overload', () => {
		const t = Tempo.ticker('FREQ=DAILY;INTERVAL=1');
		expect(t.info.rrule).toBe('FREQ=DAILY;INTERVAL=1');
		t.stop();
	});

	test('creates Ticker from options object with rrule property', () => {
		const t = Tempo.ticker({ rrule: 'FREQ=WEEKLY;BYDAY=MO', label: 'Weekly Sync' });
		expect(t.info.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
		expect(t.info.label).toBe('Weekly Sync');
		t.stop();
	});

	test('exposes .rrule in Tempo.tickers active snapshots', () => {
		const t = Tempo.ticker('FREQ=MONTHLY;INTERVAL=1');
		const activeSnapshots = Tempo.tickers;
		expect(activeSnapshots.length).toBeGreaterThan(0);
		const match = activeSnapshots.find(s => s.rrule === 'FREQ=MONTHLY;INTERVAL=1');
		expect(match).toBeDefined();
		expect(match?.rrule).toBe('FREQ=MONTHLY;INTERVAL=1');
		t.stop();
	});

	test('stepping via pulse() follows RRULE logic deterministically', () => {
		const seed = new Tempo('2026-08-07');
		const t = Tempo.ticker({ rrule: 'FREQ=DAILY;INTERVAL=2', seed });

		const step1 = t.pulse();
		expect(step1.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-07');

		const step2 = t.pulse();
		expect(step2.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-09');

		const step3 = t.pulse();
		expect(step3.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-11');

		t.stop();
	});
});
