import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Moment.js Formatting & Parsing Compatibility', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123');

	it('formats Moment.js masks with token translation and bracket escaping', () => {
		expect(dt.format('YYYY-MM-DD HH:mm:ss', { dialect: DIALECT.Moment })).toBe('2026-10-24 15:30:45');
		expect(dt.format('[Today is] dddd, MMMM D, YYYY', { dialect: DIALECT.Moment })).toBe('Today is Saturday, October 24, 2026');
		expect(dt.format('MMMM Do YYYY', { dialect: DIALECT.Moment })).toBe('October 24th 2026');
		expect(dt.format('hh:mm A', { dialect: DIALECT.Moment })).toBe('03:30 PM');
		expect(dt.format('hh:mm a', { dialect: DIALECT.Moment })).toBe('03:30 pm');

		// Day of year
		const jan5 = new Tempo('2026-01-05');
		expect(jan5.format('DDDD', { dialect: DIALECT.Moment })).toBe('005');
		expect(jan5.format('DDD', { dialect: DIALECT.Moment })).toBe('5');
		expect(jan5.format('DDDo', { dialect: DIALECT.Moment })).toBe('5th');
		expect(dt.format('DDDD', { dialect: DIALECT.Moment })).toBe('297');
		expect(dt.format('DDDo', { dialect: DIALECT.Moment })).toBe('297th');

		// ISO week
		const feb1 = new Tempo('2026-02-01');
		expect(feb1.format('WW', { dialect: DIALECT.Moment })).toBe('05');
		expect(feb1.format('W', { dialect: DIALECT.Moment })).toBe('5');
		expect(dt.format('WW', { dialect: DIALECT.Moment })).toBe('43');

		// ISO week year
		expect(dt.format('GGGG', { dialect: DIALECT.Moment })).toBe('2026');
		expect(dt.format('GG', { dialect: DIALECT.Moment })).toBe('26');

		// Weekday ISO number
		expect(dt.format('E', { dialect: DIALECT.Moment })).toBe('6');

		// Timezone offsets
		const dtUtc = new Tempo('2026-10-24T15:30:45Z', { timeZone: 'UTC' });
		expect(dtUtc.format('Z', { dialect: DIALECT.Moment })).toBe('+00:00');
		expect(dtUtc.format('ZZ', { dialect: DIALECT.Moment })).toBe('+0000');

		// Quarter
		expect(dt.format('Q', { dialect: DIALECT.Moment })).toBe('4');
		expect(dt.format('[Q]Q', { dialect: DIALECT.Moment })).toBe('Q4');
	});

	it('parses Moment.js masks with token translation', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH:mm:ss', DIALECT.Moment);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);

		const t2 = Tempo.dialects.parse('October 24th 2026', 'MMMM Do YYYY', DIALECT.Moment);
		expect(t2.isValid).toBe(true);
		expect(t2.yy).toBe(2026);
		expect(t2.mm).toBe(10);
		expect(t2.dd).toBe(24);

		const tDoy = Tempo.dialects.parse('2026-005', 'YYYY-DDDD', DIALECT.Moment);
		expect(tDoy.isValid).toBe(true);
		expect(tDoy.yy).toBe(2026);
		expect(tDoy.mm).toBe(1);
		expect(tDoy.dd).toBe(5);

		const tDoyOrd = Tempo.dialects.parse('2026-5th', 'YYYY-DDDo', DIALECT.Moment);
		expect(tDoyOrd.isValid).toBe(true);
		expect(tDoyOrd.yy).toBe(2026);
		expect(tDoyOrd.mm).toBe(1);
		expect(tDoyOrd.dd).toBe(5);

		const tWeek = Tempo.dialects.parse('2026-W43', 'GGGG-[W]WW', DIALECT.Moment);
		expect(tWeek.isValid).toBe(true);
		expect(tWeek.yy).toBe(2026);
		expect(tWeek.mm).toBe(10);

		const tQtr = Tempo.dialects.parse('2026-Q4', 'YYYY-[Q]Q', DIALECT.Moment);
		expect(tQtr.isValid).toBe(true);
		expect(tQtr.yy).toBe(2026);
		expect(tQtr.mm).toBe(10);
	});

	it('rejects Moment tokens without LDML equivalents', () => {
		const unsupported = ['dd', 'do', 'd', 'Mo', 'ww', 'w', 'gggg', 'gg', 'Wo', 'Qo', 'e', 'X', 'x'];
		for (const token of unsupported) {
			expect(() => dt.format(token, { dialect: DIALECT.Moment })).toThrow(/no LDML equivalent/);
			const parsed = Tempo.dialects.parse('2026', token, DIALECT.Moment, { error: 'catch' });
			expect(parsed.isValid).toBe(false);
		}
	});
});
