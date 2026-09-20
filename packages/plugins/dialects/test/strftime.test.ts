import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('POSIX strftime Formatting & Parsing', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45');

	it('formats standard strftime specifiers', () => {
		expect(dt.format('%Y-%m-%d %H:%M:%S', { dialect: DIALECT.Strftime })).toBe('2026-10-24 15:30:45');
		expect(dt.format('%B %d, %Y (%A)', { dialect: DIALECT.Strftime })).toBe('October 24, 2026 (Saturday)');
	});

	it('auto-detects strftime dialect when mask contains % specifiers', () => {
		expect(dt.dialects.format('%F %T')).toBe('2026-10-24 15:30:45');
		expect(dt.dialects.strftime('%Y/%m/%d')).toBe('2026/10/24');
	});

	it('parses %f microsecond precision properly splitting ms and us', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45.123456', '%Y-%m-%d %H:%M:%S.%f', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.ms).toBe(123);
		expect(t.toDateTime().microsecond).toBe(456);
	});

	it('returns invalid when strftime textual month is unrecognized', () => {
		const t = Tempo.dialects.parse('24-InvalidMonth-2026', '%d-%B-%Y', DIALECT.Strftime, { error: 'catch' });
		expect(t.isValid).toBe(false);
	});

	it('parses strings with weekday names (%A, %a)', () => {
		const t1 = Tempo.dialects.parse('October 24, 2026 (Saturday)', '%B %d, %Y (%A)', DIALECT.Strftime);
		expect(t1.isValid).toBe(true);
		expect(t1.yy).toBe(2026);
		expect(t1.mm).toBe(10);
		expect(t1.dd).toBe(24);

		const t2 = Tempo.dialects.parse('Sat, 24 Oct 2026', '%a, %d %b %Y', DIALECT.Strftime);
		expect(t2.isValid).toBe(true);
		expect(t2.yy).toBe(2026);
		expect(t2.mm).toBe(10);
		expect(t2.dd).toBe(24);
	});

	it('parses strings formatted with strftime specifiers', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', '%Y-%m-%d %H:%M:%S', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});

	it('parses day of year %j correctly', () => {
		const t = Tempo.dialects.parse('2026-100', '%Y-%j', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(4);
		expect(t.dd).toBe(10);
	});

	it('parses compound masks (%F %T) with repeated groups safely', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', '%F %T', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});
});
