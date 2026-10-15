import { Tempo } from '#tempo';

describe('Roman Numeral Date Parsing', () => {
	beforeEach(() => {
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
	});

	describe('European day-RomanMonth-year (Token.dRy)', () => {
		it('parses dot-separated European dates with Roman month', () => {
			const t = new Tempo('14.X.2026');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(14);
		});

		it('parses slash-separated European dates with Roman month', () => {
			const t = new Tempo('24/VII/1984');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(1984);
			expect(t.mm).toBe(7);
			expect(t.dd).toBe(24);
		});

		it('parses dash-separated dates with lowercase Roman month', () => {
			const t = new Tempo('15-iv-2025');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2025);
			expect(t.mm).toBe(4);
			expect(t.dd).toBe(15);
		});

		it('parses 1st of month with Roman I and XII', () => {
			const t1 = new Tempo('1.I.2000');
			expect(t1.isValid).toBe(true);
			expect(t1.yy).toBe(2000);
			expect(t1.mm).toBe(1);
			expect(t1.dd).toBe(1);

			const t12 = new Tempo('31.XII.2026');
			expect(t12.isValid).toBe(true);
			expect(t12.yy).toBe(2026);
			expect(t12.mm).toBe(12);
			expect(t12.dd).toBe(31);
		});
	});

	describe('Archival / Inscription Roman Year (Token.Ryy)', () => {
		it('parses bare Roman year string and snaps to January 1st', () => {
			const t = new Tempo('MMXXVI');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(1);
			expect(t.dd).toBe(1);
		});

		it('parses Roman year with Anno Domini prefix', () => {
			const t = new Tempo('Anno Domini MCMXCIV');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(1994);
			expect(t.mm).toBe(1);
			expect(t.dd).toBe(1);
		});

		it('parses Roman year with Copyright symbol', () => {
			const t = new Tempo('Copyright © MMXXVI');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(1);
			expect(t.dd).toBe(1);
		});
	});

	describe('Format Mask Symmetry with :roman modifier', () => {
		it('round-trips full-roman formatted date with mask', () => {
			const t = new Tempo('2026-10-16');
			const mask = '{yy:roman}-{mm:roman}-{dd:roman}';
			const formatted = t.format(mask);
			expect(formatted).toBe('XXVI-X-XVI');

			const r = new Tempo(formatted, { format: mask });
			expect(r.isValid).toBe(true);
			expect(r.yy).toBe(2026);
			expect(r.mm).toBe(10);
			expect(r.dd).toBe(16);
		});

		it('round-trips 4-digit year {yyyy:roman}-{mm:roman}-{dd:roman}', () => {
			const t = new Tempo('2026-10-16');
			const mask = '{yyyy:roman}-{mm:roman}-{dd:roman}';
			const formatted = t.format(mask);
			expect(formatted).toBe('MMXXVI-X-XVI');

			const r = new Tempo(formatted, { format: mask });
			expect(r.isValid).toBe(true);
			expect(r.yy).toBe(2026);
			expect(r.mm).toBe(10);
			expect(r.dd).toBe(16);
		});

		it('round-trips {yyyy:roman}/{mm:roman}/{dd:roman}', () => {
			const t = new Tempo('1984-07-24');
			const mask = '{yyyy:roman}/{mm:roman}/{dd:roman}';
			const formatted = t.format(mask);
			expect(formatted).toBe('MCMLXXXIV/VII/XXIV');

			const r = new Tempo(formatted, { format: mask });
			expect(r.isValid).toBe(true);
			expect(r.yy).toBe(1984);
			expect(r.mm).toBe(7);
			expect(r.dd).toBe(24);
		});
	});
});
