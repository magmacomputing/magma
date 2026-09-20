import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Unicode LDML Parsing', () => {
	Tempo.use(DialectsPlugin);

	it('parses standard ISO-like strings with explicit mask', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', 'yyyy-MM-dd HH:mm:ss');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});

	it('disambiguates between DMY and MDY dates', () => {
		const t1 = Tempo.fromFormat('04/05/2026', 'dd/MM/yyyy');
		const t2 = Tempo.fromFormat('04/05/2026', 'MM/dd/yyyy');

		expect(t1.dd).toBe(4);
		expect(t1.mm).toBe(5);

		expect(t2.dd).toBe(5);
		expect(t2.mm).toBe(4);
	});

	it('parses dates with textual month names', () => {
		const t = Tempo.fromFormat('24 October 2026', 'd MMMM yyyy');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('matches first candidate format across array of masks', () => {
		const masks = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy'];
		const t1 = Tempo.dialects.fromFormats('2026-10-24', masks);
		const t2 = Tempo.dialects.fromFormats('24/10/2026', masks);

		expect(t1.isValid).toBe(true);
		expect(t1.dd).toBe(24);
		expect(t1.mm).toBe(10);

		expect(t2.isValid).toBe(true);
		expect(t2.dd).toBe(24);
		expect(t2.mm).toBe(10);
	});
});
