import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Dialect Export', () => {
	beforeAll(() => {
		Tempo.use(DialectsPlugin);
	});

	it('exports standard ISO patterns to Oracle SQL TO_CHAR models', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', 'oracle');
		expect(res.dialect).toBe(DIALECT.Oracle);
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI:SS');
		expect(res.toString()).toBe('YYYY-MM-DD HH24:MI:SS');
		expect(`${res}`).toBe('YYYY-MM-DD HH24:MI:SS');
		expect(res.unsupported).toEqual([]);
		expect(res.tokens.length).toBe(6);
	});

	it('quotes literal characters properly in Oracle format models', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}', 'sql');
		expect(res.pattern).toBe('YYYY-MM-DD"T"HH24:MI:SS');
	});

	it('exports unpadded and uppercase month/weekday tokens to Oracle', () => {
		const res1 = Tempo.dialects.export('{mon:upper} {dd}, {yyyy}', 'oracle');
		expect(res1.pattern).toBe('MONTH DD, YYYY');

		const res2 = Tempo.dialects.export('{mm:raw}/{dd:raw}/{yyyy}', 'oracle');
		expect(res2.pattern).toBe('FMMM/FMDD/YYYY');

		const res3 = Tempo.dialects.export('{wkd:upper}', 'oracle');
		expect(res3.pattern).toBe('DAY');
	});

	it('exports timezone and fractional second tokens to Oracle', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ff:3} {tz} {tz:short}', 'oracle');
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI:SS.FF3 TZR TZD');
	});

	it('exports Tempo format strings to POSIX strftime format', () => {
		const res1 = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', 'strftime');
		expect(res1.dialect).toBe(DIALECT.Strftime);
		expect(res1.pattern).toBe('%Y-%m-%d %H:%M:%S');

		const res2 = Tempo.dialects.export('{mon} {dd}, {yyyy} ({wkd})', 'strftime');
		expect(res2.pattern).toBe('%B %d, %Y (%A)');

		const res3 = Tempo.dialects.export('{h12}:{mi} {mer:upper}', 'strftime');
		expect(res3.pattern).toBe('%I:%M %p');
	});

	it('exports Tempo format strings to Unicode LDML', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}', 'ldml');
		expect(res.dialect).toBe(DIALECT.Ldml);
		expect(res.pattern).toBe('yyyy-MM-dd HH:mm');

		const resLetters = Tempo.dialects.export('{yyyy}-{mm}-{dd}T{hh}:{mi}', 'ldml');
		expect(resLetters.pattern).toBe("yyyy-MM-dd'T'HH:mm");
	});

	it('exports Tempo format strings to Moment.js with bracketed literals', () => {
		const res1 = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}', 'moment');
		expect(res1.dialect).toBe(DIALECT.Moment);
		expect(res1.pattern).toBe('YYYY-MM-DD HH:mm');

		const res2 = Tempo.dialects.export('Recorded on {yyyy}-{mm}-{dd}', 'moment');
		expect(res2.pattern).toBe('[Recorded] [on] YYYY-MM-DD');

		const res3 = Tempo.dialects.export('{dd:ord} of {mon} {yyyy}', 'moment');
		expect(res3.pattern).toBe('Do [of] MMMM YYYY');
	});

	it('exports Tempo format strings to PHP date() format', () => {
		const res1 = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', 'php');
		expect(res1.dialect).toBe(DIALECT.Php);
		expect(res1.pattern).toBe('Y-m-d H:i:s');

		const res2 = Tempo.dialects.export('{wkd}, {mon} {dd}, {yyyy}', 'php');
		expect(res2.pattern).toBe('l, F d, Y');

		const res3 = Tempo.dialects.export('{h12}:{mi} {mer:upper}', 'php');
		expect(res3.pattern).toBe('h:i A');
	});

	it('exports Tempo format strings to Go reference time layouts', () => {
		const res1 = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', 'go');
		expect(res1.dialect).toBe(DIALECT.Go);
		expect(res1.pattern).toBe('2006-01-02 15:04:05');

		const res2 = Tempo.dialects.export('{wkd}, {mon} {dd}, {yyyy}', 'go');
		expect(res2.pattern).toBe('Monday, January 02, 2006');

		const res3 = Tempo.dialects.export('{h12}:{mi} {mer:upper}', 'go');
		expect(res3.pattern).toBe('03:04 PM');
	});

	it('handles dynamic fractional precision width (ff:1 to ff:9)', () => {
		const resOracle = Tempo.dialects.export('{ff:4}', 'oracle');
		expect(resOracle.pattern).toBe('FF4');

		const resStrftime = Tempo.dialects.export('{ff:4}', 'strftime');
		expect(resStrftime.pattern).toBe('%4f');

		const resLdml = Tempo.dialects.export('{ff:4}', 'ldml');
		expect(resLdml.pattern).toBe('SSSS');
	});

	it('flags unsupported tokens in target dialects', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {ts}', 'oracle');
		expect(res.unsupported).toContain('{ts}');
		const tsToken = res.tokens.find(t => t.source === '{ts}');
		expect(tsToken?.supported).toBe(false);

		// LDML unsupported tokens
		const resLdml = Tempo.dialects.export('{ts} {#quarter} {#quarter:ord}', 'ldml');
		expect(resLdml.unsupported).toContain('{ts}');
		expect(resLdml.unsupported).toContain('{#quarter}');
		expect(resLdml.unsupported).toContain('{#quarter:ord}');

		// Go unsupported ISO week-year and week tokens
		const resGo = Tempo.dialects.export('{yow} {yw} {woy} {wy}', 'go');
		expect(resGo.unsupported).toContain('{yow}');
		expect(resGo.unsupported).toContain('{yw}');
		expect(resGo.unsupported).toContain('{woy}');
		expect(resGo.unsupported).toContain('{wy}');

		// Supported week-year and week-of-year in other dialects
		const resOracle = Tempo.dialects.export('{yow}-{woy} {yw}-{wy}', 'oracle');
		expect(resOracle.pattern).toBe('IYYY-IW IYYY-IW');

		// PHP unsupported day-of-year tokens
		const resPhp = Tempo.dialects.export('{doy} {doy:raw} {doy:ord}', 'php');
		expect(resPhp.unsupported).toContain('{doy}');
		expect(resPhp.unsupported).toContain('{doy:raw}');
		expect(resPhp.unsupported).toContain('{doy:ord}');
	});

	it('works seamlessly from instance namespace t.dialects.export', () => {
		const t = new Tempo('2026-10-24T15:30:45');
		const res = t.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}', 'oracle');
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI');
	});
});
