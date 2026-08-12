import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.recurrence.js';

describe('extend.recurrence', () => {
	test('Tempo.prototype.nextOccurrence returns next date matching RRULE string', () => {
		const start = new Tempo('2026-08-07T00:00:00.000Z', { timeZone: 'UTC' });
		const next = start.nextOccurrence('FREQ=DAILY;INTERVAL=1');
		expect(next).not.toBeNull();
		expect(next!.epoch.ms).toBe(Date.UTC(2026, 7, 8));
		expect(next!.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-08');
	});

	test('Tempo.prototype.nextOccurrence accepts object with rrule property', () => {
		const start = new Tempo('2026-08-07T00:00:00.000Z', { timeZone: 'UTC' });
		const next = start.nextOccurrence({ rrule: 'FREQ=DAILY;INTERVAL=2' });
		expect(next).not.toBeNull();
		expect(next!.epoch.ms).toBe(Date.UTC(2026, 7, 9));
		expect(next!.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-09');
	});

	test('Tempo.prototype.nextOccurrence returns null when RRULE UNTIL is expired', () => {
		const start = new Tempo('2026-08-07T00:00:00.000Z', { timeZone: 'UTC' });
		const next = start.nextOccurrence('FREQ=DAILY;UNTIL=20260801');
		expect(next).toBeNull();
	});

	test('Tempo.prototype.nextOccurrence preserves sandbox subclass and respects non-ms timeStamp configurations', () => {
		const Sandbox = Tempo.create({ timeZone: 'UTC', timeStamp: 'ss' });
		const start = new Sandbox('2026-08-07T00:00:00.000Z');
		const next = start.nextOccurrence('FREQ=DAILY;INTERVAL=1');
		expect(next).toBeInstanceOf(Sandbox);
		expect(next!.epoch.ms).toBe(Date.UTC(2026, 7, 8));
		expect(next!.config.timeStamp).toBe('ss');
	});
});
