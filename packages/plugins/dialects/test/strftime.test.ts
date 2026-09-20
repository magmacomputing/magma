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
});
