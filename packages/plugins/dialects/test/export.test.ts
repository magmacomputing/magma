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

		const res4 = Tempo.dialects.export('{dd}-{mm:roman}-{yyyy}', 'oracle');
		expect(res4.pattern).toBe('DD-RM-YYYY');

		const res5 = Tempo.dialects.export('{dd}-{mm:roman:lower}-{yyyy}', 'oracle');
		expect(res5.pattern).toBe('DD-rm-YYYY');
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
		const resOracleWeek = Tempo.dialects.export('{yow}-{woy} {yw}-{wy}', 'oracle');
		expect(resOracleWeek.pattern).toBe('IYYY-IW IYYY-IW');

		// PHP unsupported day-of-year tokens
		const resPhp = Tempo.dialects.export('{doy} {doy:raw} {doy:ord}', 'php');
		expect(resPhp.unsupported).toContain('{doy}');
		expect(resPhp.unsupported).toContain('{doy:raw}');
		expect(resPhp.unsupported).toContain('{doy:ord}');

		// Go unsupported unpadded 24-hour clock
		const resGoHh = Tempo.dialects.export('{hh:raw}', 'go');
		expect(resGoHh.unsupported).toContain('{hh:raw}');

		// PHP unsupported unpadded minute, second, and ordinal day tokens
		const resPhpUnpadded = Tempo.dialects.export('{mi:raw} {ss:raw} {dd:ord}', 'php');
		expect(resPhpUnpadded.unsupported).toContain('{mi:raw}');
		expect(resPhpUnpadded.unsupported).toContain('{ss:raw}');
		expect(resPhpUnpadded.unsupported).toContain('{dd:ord}');

		// Go unsupported unpadded and ordinal day-of-year tokens
		const resGoDoy = Tempo.dialects.export('{doy} {doy:raw} {doy:ord}', 'go');
		expect(resGoDoy.pattern).toBe('002 {doy:raw} {doy:ord}');
		expect(resGoDoy.unsupported).not.toContain('{doy}');
		expect(resGoDoy.unsupported).toContain('{doy:raw}');
		expect(resGoDoy.unsupported).toContain('{doy:ord}');
	});

	it('works seamlessly from instance namespace t.dialects.export', () => {
		const t = new Tempo('2026-10-24T15:30:45');
		const res = t.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}', 'oracle');
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI');
	});

	it('accepts options object { dialect: ... } and exports era and woy to LDML', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {woy} {era} {era:long}', { dialect: DIALECT.Ldml });
		expect(res.pattern).toBe('yyyy-MM-dd ww G GGGG');
		expect(res.unsupported).toHaveLength(0);
	});

	it('exports Phase 3 extended timezone offset tokens to Go and Oracle', () => {
		const resOracle = Tempo.dialects.export('{tz:offset:hh} {tz:offset:mi}', 'oracle');
		expect(resOracle.pattern).toBe('TZH TZM');
		expect(resOracle.unsupported).toHaveLength(0);

		// Also verify alias tz:offset:min
		expect(Tempo.dialects.export('{tz:offset:min}', 'oracle').pattern).toBe('TZM');

		const resGo = Tempo.dialects.export('{tz:offset:z} {tz:offsetcompact:z} {tz:offset:ss:z} {tz:offsetcompact:ss:z} {tz:offset:ss} {tz:offsetcompact:ss} {tz:offset:hh}', 'go');
		expect(resGo.pattern).toBe('Z07:00 Z0700 Z07:00:00 Z070000 -07:00:00 -070000 -07');
		expect(resGo.unsupported).toHaveLength(0);

		// Also verify aliases :sec
		expect(Tempo.dialects.export('{tz:offset:sec:z} {tz:offsetcompact:sec}', 'go').pattern).toBe('Z07:00:00 -070000');
	});

	it('exports Phase 4 specialized and scoped tokens to target dialects', () => {
		// Oracle J, SSSSS, WW, W
		const resOracle = Tempo.dialects.export('{jj} {ss:day} {ss:day:5} {ss:day:raw} {woy:cal} {wom}', 'oracle');
		expect(resOracle.pattern).toBe('J SSSSS SSSSS FMSSSSS WW W');
		expect(resOracle.unsupported).toHaveLength(0);

		// Aliases julian, ww:cal, ww:month
		const resOracleAliases = Tempo.dialects.export('{julian} {ww:cal} {ww:month}', 'oracle');
		expect(resOracleAliases.pattern).toBe('J WW W');

		// PHP t and z
		const resPhp = Tempo.dialects.export('{dim} {doy:0} {dd:year:raw:0}', 'php');
		expect(resPhp.pattern).toBe('t z z');
		expect(resPhp.unsupported).toHaveLength(0);

		// Strftime %C and %w
		const resStrftime = Tempo.dialects.export('{cen} {dow:0}', 'strftime');
		expect(resStrftime.pattern).toBe('%C %w');
		expect(resStrftime.unsupported).toHaveLength(0);

		// LDML W
		const resLdml = Tempo.dialects.export('{wom}', 'ldml');
		expect(resLdml.pattern).toBe('W');
		expect(resLdml.unsupported).toHaveLength(0);

	});

	it('exports 0-indexed Sunday = 0 weekday tokens to PHP and Moment', () => {
		expect(Tempo.dialects.export('{dow:0}', 'php').pattern).toBe('w');
		expect(Tempo.dialects.export('{dow:zero}', 'moment').pattern).toBe('d');
	});

	it('exports ISO 2-digit week-year to Moment GG', () => {
		expect(Tempo.dialects.export('{yow:-2}', 'moment').pattern).toBe('GG');
		expect(Tempo.dialects.export('{yow:short}', 'moment').pattern).toBe('GG');
	});

	it('detects Go reference date tokens in literal words as conflicts', () => {
		const res = Tempo.dialects.export('{yyyy} ref1', 'go');
		expect(res.unsupported).toContain(' ref1');
	});
});
