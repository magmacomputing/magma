import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.recurrence.js';

describe('extend.recurrence', () => {
	test('Tempo.prototype.nextOccurrence returns next date matching RRULE string', () => {
		const start = new Tempo('2026-08-07T00:00:00.000Z');
		const next = start.nextOccurrence('FREQ=DAILY;INTERVAL=1');
		expect(next.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-08');
	});

	test('Tempo.prototype.nextOccurrence accepts object with rrule property', () => {
		const start = new Tempo('2026-08-07T00:00:00.000Z');
		const next = start.nextOccurrence({ rrule: 'FREQ=DAILY;INTERVAL=2' });
		expect(next.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-09');
	});
});
