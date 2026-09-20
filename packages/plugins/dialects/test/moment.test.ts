import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Moment.js Formatting & Parsing Compatibility', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123');

	it('formats Moment.js masks with token translation and bracket escaping', () => {
		expect(dt.format('YYYY-MM-DD HH:mm:ss', { dialect: DIALECT.Moment })).toBe('2026-10-24 15:30:45');
		expect(dt.format('[Today is] dddd, MMMM D, YYYY', { dialect: DIALECT.Moment })).toBe('Today is Saturday, October 24, 2026');
	});

	it('parses Moment.js masks with token translation', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH:mm:ss', DIALECT.Moment);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
	});
});
