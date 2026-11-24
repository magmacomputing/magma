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

	it('supports dynamic function for format option', () => {
		const getFormat = () => '{dd}.{mm}.{yyyy}';
		const t = new Tempo('24.10.2026', { format: getFormat });
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('defaults day to 1 when day token is omitted from mask', () => {
		const t = new Tempo('2026-02', { format: '{yyyy}-{mm}' });
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(2);
		expect(t.dd).toBe(1);
	});

	it('throws actionable error on unknown braced tokens in mask', () => {
		expect(() => {
			new Tempo('2026-10-24', { format: '{unknownToken}-{mm}-{dd}', error: 'throw' }).toDateTime();
		}).toThrow(/Unknown braced format token '{unknownToken}'/);
	});

	it('rejects input and does not fall through to general layout parser when format mask does not match', () => {
		// '2026-10-24' would normally parse via ISO layout, but format option restricts parsing strictly to '{dd}/{mm}/{yyyy}'
		const t = new Tempo('2026-10-24', { format: '{dd}/{mm}/{yyyy}', error: 'catch' });
		expect(t.isValid).toBe(false);
	});

	it('returns invalid when textual month fails to resolve', () => {
		const t = new Tempo('24 FooMonth 2026', { format: '{dd} {mmm} {yyyy}', error: 'catch' });
		expect(t.isValid).toBe(false);
	});

	it('rejects out-of-range dates with overflow reject', () => {
		const t = new Tempo('2026-02-31', { format: '{yyyy}-{mm}-{dd}', error: 'catch' });
		expect(t.isValid).toBe(false);
	});

	it('throws actionable error when unbraced mask is passed without dialect plugin', () => {
		expect(() => {
			new Tempo('non-iso-mask-sample', { format: 'yyyy-MM-dd', error: 'throw' });
		}).toThrow(/requires '@magmacomputing\/tempo-plugin-dialects'/);
	});
});
