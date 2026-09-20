import { Tempo } from '#tempo';

describe('Braced Format Mask Parsing & {*} Wildcards', () => {
	it('parses structured dates using instance format option', () => {
		const t = new Tempo('24-10-2026', { format: '{dd}-{mm}-{yyyy}' });
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('parses dates using static Tempo.from() with format option', () => {
		const t = Tempo.from('2026/10/24 15:30:45', { format: '{yyyy}/{mm}/{dd} {hh}:{mi}:{ss}' });
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});

	it('parses dates with month names and ordinal days', () => {
		const t = new Tempo('Today is 15th of Sep 2026', { format: 'Today is {dd} of {mmm} {yyyy}' });
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(9);
		expect(t.dd).toBe(15);
	});

	it('supports wildcard {*} in format strings', () => {
		const t = new Tempo('Recorded log on 24 Oct 2026 at server-01', {
			format: '{*} on {dd} {mmm} {yyyy} at {*}'
		});
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('supports multiple candidate format strings in array', () => {
		const formats = ['{yyyy}-{mm}-{dd}', '{dd}/{mm}/{yyyy}'];
		const t1 = new Tempo('2026-10-24', { format: formats });
		const t2 = new Tempo('24/10/2026', { format: formats });

		expect(t1.isValid).toBe(true);
		expect(t1.dd).toBe(24);
		expect(t1.mm).toBe(10);

		expect(t2.isValid).toBe(true);
		expect(t2.dd).toBe(24);
		expect(t2.mm).toBe(10);
	});

	it('throws actionable error when unbraced mask is passed without dialect plugin', () => {
		expect(() => {
			new Tempo('non-iso-mask-sample', { format: 'yyyy-MM-dd', error: 'throw' });
		}).toThrow(/requires '@magmacomputing\/tempo-plugin-dialects'/);
	});
});
