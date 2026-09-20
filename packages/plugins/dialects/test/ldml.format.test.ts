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
		expect(dt.format('hh:mm:ss a', { dialect: DIALECT.Ldml })).toBe('03:30:45 pm');
		expect(dt.format('h:mm aa', { dialect: DIALECT.Ldml })).toBe('3:30 PM');
	});

	it('formats month and weekday names', () => {
		expect(dt.format('MMMM (MMM)', { dialect: DIALECT.Ldml })).toBe('October (Oct)');
		expect(dt.format('EEEE (EEE)', { dialect: DIALECT.Ldml })).toBe('Saturday (Sat)');
	});

	it('handles single-quoted literal escaping', () => {
		expect(dt.format("'Date:' yyyy-MM-dd 'at' HH:mm", { dialect: DIALECT.Ldml })).toBe('Date: 2026-10-24 at 15:30');
		expect(dt.format("''yyyy''", { dialect: DIALECT.Ldml })).toBe("'2026'");
	});

	it('executes compiled layout cache across 10,000 iterations efficiently', () => {
		const mask = 'yyyy-MM-dd HH:mm:ss.SSS';
		for (let i = 0; i < 10000; i++) {
			dt.format(mask, { dialect: DIALECT.Ldml });
		}
		expect(dt.format(mask, { dialect: DIALECT.Ldml })).toBe('2026-10-24 15:30:45.123');
	});
});
