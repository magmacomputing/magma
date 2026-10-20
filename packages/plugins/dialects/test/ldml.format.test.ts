import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Unicode LDML Formatting', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123');

	it('formats standard date-time tokens', () => {
		expect(dt.format('yyyy-MM-dd HH:mm:ss.SSS', { dialect: DIALECT.Ldml })).toBe('2026-10-24 15:30:45.123');
		expect(dt.format('yy/M/d H:m:s', { dialect: DIALECT.Ldml })).toBe('26/10/24 15:30:45');
	});

	it('formats 12-hour clocks with AM/PM markers', () => {
		expect(dt.format('hh:mm:ss a', { dialect: DIALECT.Ldml })).toBe('03:30:45 PM');
		expect(dt.format('h:mm aa', { dialect: DIALECT.Ldml })).toBe('3:30 PM');
		expect(dt.format('h:mm aaa', { dialect: DIALECT.Ldml })).toBe('3:30 pm');
	});

	it('formats month and weekday names', () => {
		expect(dt.format('MMMM (MMM)', { dialect: DIALECT.Ldml })).toBe('October (Oct)');
		expect(dt.format('EEEE (EEE)', { dialect: DIALECT.Ldml })).toBe('Saturday (Sat)');
	});

	it('handles single-quoted literal escaping', () => {
		expect(dt.format("'Date:' yyyy-MM-dd 'at' HH:mm", { dialect: DIALECT.Ldml })).toBe('Date: 2026-10-24 at 15:30');
		expect(dt.format("''yyyy''", { dialect: DIALECT.Ldml })).toBe("'2026'");
	});

	it('formats ISO week-year (YYYY, YY, Y) and week-of-year (ww, w)', () => {
		// 2024-12-30 belongs to ISO week 1 of week-year 2025
		const tEdge = new Tempo('2024-12-30T10:00:00', { timeZone: 'UTC' });
		expect(tEdge.format('yyyy', { dialect: DIALECT.Ldml })).toBe('2024');
		expect(tEdge.format('y', { dialect: DIALECT.Ldml })).toBe('2024');
		expect(tEdge.format('YYYY', { dialect: DIALECT.Ldml })).toBe('2025');
		expect(tEdge.format('YY', { dialect: DIALECT.Ldml })).toBe('25');
		expect(tEdge.format('Y', { dialect: DIALECT.Ldml })).toBe('2025');
		expect(tEdge.format('ww', { dialect: DIALECT.Ldml })).toBe('01');
		expect(tEdge.format('w', { dialect: DIALECT.Ldml })).toBe('1');

		// With non-ISO calendar, week-year and week-number normalize to ISO calendar
		const hebrewEdge = new Tempo('2024-12-30T10:00:00', { calendar: 'hebrew', timeZone: 'UTC' });
		expect(hebrewEdge.format("YYYY-'W'ww", { dialect: DIALECT.Ldml })).toBe('2025-W01');
	});

	it('formats day-of-year (DDD), ordinal day (Do), and era (G, GGGG)', () => {
		expect(dt.format('yyyy-DDD', { dialect: DIALECT.Ldml })).toBe('2026-297');
		expect(dt.format('Do MMMM', { dialect: DIALECT.Ldml })).toBe('24th October');
		expect(dt.format('yyyy G', { dialect: DIALECT.Ldml })).toBe('2026 AD');
		expect(dt.format('yyyy GGGG', { dialect: DIALECT.Ldml })).toBe('2026 Anno Domini');

		const dtBc = new Tempo('0000-05-15');
		expect(dtBc.format('yyyy G', { dialect: DIALECT.Ldml })).toBe('0001 BC');
		expect(dtBc.format('yyyy GGGG', { dialect: DIALECT.Ldml })).toBe('0001 Before Christ');
	});

	it('formats quarter tokens (Q, QQ, QQQ, QQQQ)', () => {
		expect(dt.format('yyyy Q', { dialect: DIALECT.Ldml })).toBe('2026 4');
		expect(dt.format('yyyy QQ', { dialect: DIALECT.Ldml })).toBe('2026 04');
		expect(dt.format('yyyy QQQ', { dialect: DIALECT.Ldml })).toBe('2026 Q4');
		expect(dt.format('yyyy QQQQ', { dialect: DIALECT.Ldml })).toBe('2026 4th quarter');
	});

	it('formats short weekday (EE), padded weekday (cc, ee), and padded day-of-year (DD)', () => {
		expect(dt.format('EE', { dialect: DIALECT.Ldml })).toBe('Sat');
		expect(dt.format('cc', { dialect: DIALECT.Ldml })).toBe('06');
		expect(dt.format('ee', { dialect: DIALECT.Ldml })).toBe('06');
		expect(dt.format('DD', { dialect: DIALECT.Ldml })).toBe('297');

		const jan5 = new Tempo('2026-01-05');
		expect(jan5.format('DD', { dialect: DIALECT.Ldml })).toBe('05');
		expect(jan5.format('DDD', { dialect: DIALECT.Ldml })).toBe('005');
		expect(jan5.format('cc', { dialect: DIALECT.Ldml })).toBe('01');
	});

	it('executes compiled layout cache across 10,000 iterations efficiently', () => {
		const mask = 'yyyy-MM-dd HH:mm:ss.SSS';
		for (let i = 0; i < 10000; i++) {
			dt.format(mask, { dialect: DIALECT.Ldml });
		}
		expect(dt.format(mask, { dialect: DIALECT.Ldml })).toBe('2026-10-24 15:30:45.123');
	});
});
