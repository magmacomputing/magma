import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT, explain } from '../src/index.js';

describe('Dialect Explain & Migration Helper', () => {
	Tempo.use(DialectsPlugin);

	it('translates Unicode LDML masks into native Tempo braced format', () => {
		const res = Tempo.dialects.explain('yyyy-MM-dd HH:mm:ss');
		expect(res.dialect).toBe(DIALECT.Ldml);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(res.toString()).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(res.tokens.length).toBe(6);
		expect(res.tokens[0]).toEqual({ source: 'yyyy', tempo: '{yyyy}', desc: '4-digit year' });
		expect(res.tokens[1]).toEqual({ source: 'MM', tempo: '{mm}', desc: 'Zero-padded month (01-12)' });
	});

	it('translates POSIX strftime masks into native Tempo braced format', () => {
		const res = Tempo.dialects.explain('%Y-%m-%d %H:%M:%S', DIALECT.Strftime);
		expect(res.dialect).toBe(DIALECT.Strftime);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(res.tokens.some(t => t.source === '%Y')).toBe(true);

		const res2 = Tempo.dialects.explain('%B %d, %Y (%A)');
		expect(res2.pattern).toBe('{mon} {dd}, {yyyy} ({wkd})');
	});

	it('translates Moment.js masks with bracketed literals', () => {
		const res = Tempo.dialects.explain('[Recorded on] YYYY-MM-DD [at] HH:mm', DIALECT.Moment);
		expect(res.dialect).toBe(DIALECT.Moment);
		expect(res.pattern).toBe('Recorded on {yyyy}-{mm}-{dd} at {hh}:{mi}');
	});

	it('translates unpadded and ordinal tokens with Tempo modifiers', () => {
		const res = Tempo.dialects.explain('M/D/YYYY h:m:s A', DIALECT.Moment);
		expect(res.pattern).toBe('{mm:raw}/{dd:raw}/{yyyy} {h12:raw}:{mi:raw}:{ss:raw} {mer:upper}');

		const ordinalRes = Tempo.dialects.explain('Do [of] MMMM YYYY', DIALECT.Moment);
		expect(ordinalRes.pattern).toBe('{dd:ord} of {mon} {yyyy}');
	});

	it('translates quarter tokens into #quarter Terms', () => {
		const res1 = Tempo.dialects.explain('[Q]Q YYYY', DIALECT.Moment);
		expect(res1.pattern).toBe('Q{#quarter} {yyyy}');

		const res2 = Tempo.dialects.explain('Qo [quarter] YYYY', DIALECT.Moment);
		expect(res2.pattern).toBe('{#quarter:ord} quarter {yyyy}');

		const res3 = Tempo.dialects.explain('QQQQ yyyy', DIALECT.Ldml);
		expect(res3.pattern).toBe('{#quarter} {yyyy}');

		const res4 = Tempo.dialects.explain('Y-w-e', DIALECT.Ldml);
		expect(res4.pattern).toBe('{yow:locale}-{woy:locale:raw}-{dow:locale}');
		expect(res4.tokens[0]).toEqual({ source: 'Y', tempo: '{yow:locale}', desc: 'Week-numbering year (locale)' });
	});

	it('translates timezone tokens into Tempo tz modifiers', () => {
		const res1 = Tempo.dialects.explain('yyyy-MM-dd HH:mm zzzz', DIALECT.Ldml);
		expect(res1.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi} {tz:long}');

		const res2 = Tempo.dialects.explain('%Y-%m-%d %H:%M %Z', DIALECT.Strftime);
		expect(res2.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi} {tz}');

		const res3 = Tempo.dialects.explain('YYYY-MM-DD HH:mm Z', DIALECT.Moment);
		expect(res3.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi} {tz:offset}');
	});

	it('translates fractional second tokens into {ff:N} precision modifiers', () => {
		const res1 = Tempo.dialects.explain('HH:mm:ss.S', DIALECT.Ldml);
		expect(res1.pattern).toBe('{hh}:{mi}:{ss}.{ff:1}');

		const res2 = Tempo.dialects.explain('HH:mm:ss.SS', DIALECT.Moment);
		expect(res2.pattern).toBe('{hh}:{mi}:{ss}.{ff:2}');
	});

	it('returns a deeply frozen immutable ExplainResult', () => {
		const res = Tempo.dialects.explain('YYYY-MM-DD', DIALECT.Moment);
		expect(Object.isFrozen(res)).toBe(true);
		expect(Object.isFrozen(res.tokens)).toBe(true);
		expect(Object.isFrozen(res.tokens[0])).toBe(true);
	});

	it('works via standalone explain function and instance t.dialects.explain', () => {
		const res1 = explain('dd/MM/yyyy');
		expect(res1.pattern).toBe('{dd}/{mm}/{yyyy}');

		const dt = new Tempo('2026-10-24T15:30:45');
		const res2 = dt.dialects.explain('%F %T');
		expect(res2.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
	});

	it('translates Oracle masks preserving case rules, FM toggling, and unsupported tokens', () => {
		const res = Tempo.dialects.explain('IYYY-IW-D J', DIALECT.Oracle);
		expect(res.pattern).toBe('{yow}-{woy}-{dow:locale} {jj}');
		const jToken = res.tokens.find(t => t.source === 'J');
		expect(jToken?.tempo).toBe('{jj}');
		expect(jToken?.desc).toContain('Julian day');

		// Case-insensitive token matching for recognized single letters (e.g. 'd')
		const resLowerD = Tempo.dialects.explain('YYYY-MM-d', DIALECT.Oracle);
		expect(resLowerD.pattern).toBe('{yyyy}-{mm}-{dow:locale}');

		// Fill Mode (FM) toggles unpadded tokens
		const resFm = Tempo.dialects.explain('FMMM/DD/YYYY FMHH24:MI', DIALECT.Oracle);
		expect(resFm.pattern).toBe('{mm:raw}/{dd:raw}/{yyyy} {hh}:{mi}');

		// Dotted meridiem tokens preserve dots with {mer:upper:dots}
		const resDots = Tempo.dialects.explain('HH12:MI:SS A.M.', DIALECT.Oracle);
		expect(resDots.pattern).toBe('{h12}:{mi}:{ss} {mer:upper:dots}');

		// RM maps to {mm:roman}
		const resRm = Tempo.dialects.explain('DD-RM-YYYY', DIALECT.Oracle);
		expect(resRm.pattern).toBe('{dd}-{mm:roman}-{yyyy}');
		expect(resRm.tokens.find(t => t.source === 'RM')?.desc).toContain('Roman numeral month');

		// Standard Oracle format model explanation
		const exp = Tempo.dialects.explain('YYYY-MM-DD HH24:MI:SS', 'oracle');
		expect(exp.dialect).toBe(DIALECT.Oracle);
		expect(exp.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(exp.toString()).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(exp.tokens.length).toBe(6);

		// With sql alias
		const expSql = Tempo.dialects.explain('YYYY-MM-DD HH24:MI:SS', 'sql');
		expect(expSql.dialect).toBe(DIALECT.Oracle);
		expect(expSql.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');

		// Double quoted literals and fractional seconds
		const expLit = Tempo.dialects.explain('YYYY"-"MM"-"DD HH24:MI:SS.FF3', 'oracle');
		expect(expLit.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}');

		// Case-sensitive Oracle name tokens vs case-invariant tokens
		const expMonthVariants = Tempo.dialects.explain('MONTH Month month RM rm', DIALECT.Oracle);
		expect(expMonthVariants.pattern).toBe('{mon:upper} {mon} {mon:lower} {mm:roman} {mm:roman:lower}');

		const expLowerMask = Tempo.dialects.explain('yyyy-mm-dd hh24:mi:ss', DIALECT.Oracle);
		expect(expLowerMask.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
	});

	it('translates PHP z to zero-indexed day of year in explain mapping', () => {
		const res = Tempo.dialects.explain('z', DIALECT.Php);
		expect(res.tokens[0].tempo).toBe('{doy:raw:0}');
		expect(res.tokens[0].desc).toContain('day of the year starting from 0');
	});

	it('translates Phase 3 extended timezone offset tokens for Go and Oracle', () => {
		const res = Tempo.dialects.explain('2006-__2 _2 Z0700 Z070000 -070000 -07 Z07', DIALECT.Go);
		const tokens = res.tokens;
		const d2 = tokens.find(t => t.source === '__2');
		expect(d2?.tempo).toBe('{doy:space}');
		expect(d2?.desc).toContain('Space-padded day of year');

		const daySpace = tokens.find(t => t.source === '_2');
		expect(daySpace?.tempo).toBe('{dd:space}');

		const z0700 = tokens.find(t => t.source === 'Z0700');
		expect(z0700?.tempo).toBe('{tz:offsetcompact:utc}');
		expect(z0700?.desc).toContain('UTC Z or basic numeric offset');

		const z070000 = tokens.find(t => t.source === 'Z070000');
		expect(z070000?.tempo).toBe('{tz:offsetcompact:ss:utc}');
		expect(z070000?.desc).toContain('offset with seconds');

		const m070000 = tokens.find(t => t.source === '-070000');
		expect(m070000?.tempo).toBe('{tz:offsetcompact:ss}');
		expect(m070000?.desc).toContain('offset with seconds');

		const m07 = tokens.find(t => t.source === '-07');
		expect(m07?.tempo).toBe('{tz:offset:hh}');

		const z07 = tokens.find(t => t.source === 'Z07');
		expect(z07?.tempo).toBe('{tz:offset:short:utc}');

		const oracleRes = Tempo.dialects.explain('YYYY-MM-DD TZH TZM', DIALECT.Oracle);
		expect(oracleRes.pattern).toBe('{yyyy}-{mm}-{dd} {tz:offset:hh} {tz:offset:mi}');
	});

	it('translates Phase 2 year slicing and space-padding tokens', () => {
		const oracleRes = Tempo.dialects.explain('YYY Y IYY IY I', DIALECT.Oracle);
		expect(oracleRes.pattern).toBe('{yyyy:-3} {yyyy:-1} {yow:-3} {yow:-2} {yow:-1}');

		const strftimeRes = Tempo.dialects.explain('%e %k %l %g', DIALECT.Strftime);
		expect(strftimeRes.pattern).toBe('{dd:space} {hh:space} {h12:space} {yow:-2}');
	});

	it('translates LDML DDD, Do, and G/GGGG era tokens', () => {
		const res = Tempo.dialects.explain('yyyy-DDD Do G GGGG', DIALECT.Ldml);
		expect(res.pattern).toBe('{yyyy}-{doy} {dd:ord} {era} {era:long}');
		expect(res.tokens.find(t => t.source === 'DDD')?.tempo).toBe('{doy}');
		expect(res.tokens.find(t => t.source === 'Do')?.tempo).toBe('{dd:ord}');
		expect(res.tokens.find(t => t.source === 'G')?.tempo).toBe('{era}');
		expect(res.tokens.find(t => t.source === 'GGGG')?.tempo).toBe('{era:long}');
	});

	it('translates PHP compound ordinal jS / dS and resolves t', () => {
		const res = Tempo.dialects.explain('jS F Y \\d\\a\\y\\s t', DIALECT.Php);
		expect(res.pattern).toBe('{dd:ord} {mon} {yyyy} days {dim}');
		expect(res.tokens.find(t => t.source === 'jS')?.tempo).toBe('{dd:ord}');
		const tToken = res.tokens.find(t => t.source === 't');
		expect(tToken?.tempo).toBe('{dim}');
		expect(tToken?.desc).toContain('Number of days in given month');

		const resD = Tempo.dialects.explain('dS \\o\\f M', DIALECT.Php);
		expect(resD.pattern).toBe('{dd:ord} of {mmm}');
		expect(resD.tokens.find(t => t.source === 'dS')?.tempo).toBe('{dd:ord}');
	});

	it('translates Phase 4 specialized tokens across Oracle, PHP, Strftime, and LDML', () => {
		// Oracle J, SSSSS, WW, W
		const resOracle = Tempo.dialects.explain('J SSSSS WW W', DIALECT.Oracle);
		expect(resOracle.pattern).toBe('{jj} {ss:day:5} {woy:cal} {wom}');

		// Oracle unpadded FM
		const resOracleFm = Tempo.dialects.explain('FMJ SSSSS WW W', DIALECT.Oracle);
		expect(resOracleFm.pattern).toBe('{jj} {ss:day:raw} {woy:cal:raw} {wom}');

		// PHP z and t
		const resPhp = Tempo.dialects.explain('z t', DIALECT.Php);
		expect(resPhp.pattern).toBe('{doy:raw:0} {dim}');

		// Strftime %C and %w
		const resStrftime = Tempo.dialects.explain('%C %w', DIALECT.Strftime);
		expect(resStrftime.pattern).toBe('{cen} {dow:0}');

		// LDML W (week of month)
		const resLdml = Tempo.dialects.explain('yyyy-MM W', DIALECT.Ldml);
		expect(resLdml.pattern).toBe('{yyyy}-{mm} {wom}');
	});

	it('accepts options object as second argument { dialect: ... }', () => {
		const res = Tempo.dialects.explain('YYYY-MM-DD', { dialect: DIALECT.Moment });
		expect(res.dialect).toBe(DIALECT.Moment);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd}');

		const resInst = new Tempo('2026-10-24').dialects.explain('YYYY-MM-DD', { dialect: 'moment' });
		expect(resInst.pattern).toBe('{yyyy}-{mm}-{dd}');
	});

	it('translates LDML fractional seconds across various widths (SSSS, SSSSS, SSSSSSSS)', () => {
		const res4 = Tempo.dialects.explain('HH:mm:ss.SSSS', DIALECT.Ldml);
		expect(res4.pattern).toBe('{hh}:{mi}:{ss}.{ff:4}');
		expect(res4.tokens.find(t => t.source === 'SSSS')).toEqual({
			source: 'SSSS',
			tempo: '{ff:4}',
			desc: 'Fractional seconds (4 digits)',
		});

		const res5 = Tempo.dialects.explain('ss.SSSSS', DIALECT.Ldml);
		expect(res5.pattern).toBe('{ss}.{ff:5}');

		const res8 = Tempo.dialects.explain('ss.SSSSSSSS', DIALECT.Ldml);
		expect(res8.pattern).toBe('{ss}.{ff:8}');
		expect(res8.tokens.find(t => t.source === 'SSSSSSSS')).toEqual({
			source: 'SSSSSSSS',
			tempo: '{ff:8}',
			desc: 'Fractional seconds (8 digits)',
		});
	});

	it('translates LDML meridiem (a, aa, aaa) and weekday/doy tokens (DD, EE, ee, cc)', () => {
		const resMer = Tempo.dialects.explain('hh:mm a aaa', DIALECT.Ldml);
		expect(resMer.pattern).toBe('{h12}:{mi} {mer:upper} {mer}');

		const resTokens = Tempo.dialects.explain('yyyy-DD EE ee cc', DIALECT.Ldml);
		expect(resTokens.pattern).toBe('{yyyy}-{doy} {www} {dow:locale} {dow:locale}');

		const resWeek = Tempo.dialects.explain('YYYY ww w', DIALECT.Ldml);
		expect(resWeek.pattern).toBe('{yow:locale} {woy:locale} {woy:locale:raw}');
		expect(Tempo.dialects.explain('YY', DIALECT.Ldml).pattern).toBe('{yow:locale:short}');

		// Moment locale week-year gggg and gg
		const resMomentWeek = Tempo.dialects.explain('gggg gg', DIALECT.Moment);
		expect(resMomentWeek.pattern).toBe('{yow:locale} {yow:locale:short}');

		// Strftime raw %-Y and %-d
		const resStrftimeRaw = Tempo.dialects.explain('%-Y-%-m-%-d', DIALECT.Strftime);
		expect(resStrftimeRaw.pattern).toBe('{yyyy}-{mm:raw}-{dd:raw}');
		expect(resStrftimeRaw.tokens.find(t => t.source === '%-Y')?.desc).toBe('4-digit year');
		expect(resStrftimeRaw.tokens.find(t => t.source === '%-d')?.desc).toBe('Unpadded day of month (1-31)');
	});

	it('treats Y consistently as week-numbering year in both LDML explain and format', () => {
		const resExplain = Tempo.dialects.explain('Y', DIALECT.Ldml);
		expect(resExplain.pattern).toBe('{yow:locale}');
		expect(resExplain.tokens).toEqual([{ source: 'Y', tempo: '{yow:locale}', desc: 'Week-numbering year (locale)' }]);

		const dt = new Tempo('2026-10-24T12:00:00Z');
		expect(dt.dialects.format('Y', DIALECT.Ldml)).toBe('2026');
	});

	it('explains LDML DDDo as ordinal day of year', () => {
		const res = Tempo.dialects.explain('yyyy-DDDo', DIALECT.Ldml);
		expect(res.pattern).toBe('{yyyy}-{doy:ord}');
		expect(res.tokens.find(t => t.source === 'DDDo')?.desc).toBe('Day of year with ordinal suffix');
	});

	it('clamps strftime %Nf precision to 1-9 and keeps out-of-range as literals', () => {
		const resValid = Tempo.dialects.explain('%f %3f %9f', DIALECT.Strftime);
		expect(resValid.pattern).toBe('{ff:6} {ff:3} {ff:9}');

		const resInvalid = Tempo.dialects.explain('%0f %12f', DIALECT.Strftime);
		expect(resInvalid.pattern).toBe('%0f %12f');
	});

	it('preserves Sheet elapsed time tokens as literals in the explained pattern and handles uppercase AM/PM', () => {
		const res = Tempo.dialects.explain('[h]:mm:[ss]', DIALECT.Sheet);
		expect(res.pattern).toBe('[h]:{mi}:[ss]');
		expect(res.tokens.find(t => t.source === '[h]')?.desc).toBe('Elapsed hours');
		expect(res.tokens.find(t => t.source === '[ss]')?.desc).toBe('Elapsed seconds');

		const resAmPm = Tempo.dialects.explain('h:mm AM/PM', DIALECT.Sheet);
		expect(resAmPm.pattern).toBe('{h12:raw}:{mi} {mer:upper}');
		expect(resAmPm.tokens.find(t => t.source.toLowerCase() === 'am/pm')?.tempo).toBe('{mer:upper}');
	});

	it('explains uppercase Sheet tokens such as YYYY and DD correctly', () => {
		const res = Tempo.dialects.explain('YYYY-MM-DD', DIALECT.Sheet);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd}');
		expect(res.tokens.find(t => t.source === 'YYYY')?.desc).toBe('4-digit year');
		expect(res.tokens.find(t => t.source === 'DD')?.desc).toBe('Zero-padded day of month (01-31)');
	});

	it('explains spreadsheet masks into native Tempo braced tokens', () => {
		const res = Tempo.dialects.explain('yyyy-mm-dd hh:mm:ss', DIALECT.Sheet);
		expect(res.dialect).toBe(DIALECT.Sheet);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');

		const res12 = Tempo.dialects.explain('hh:mm:ss AM/PM', DIALECT.Sheet);
		expect(res12.pattern).toBe('{h12}:{mi}:{ss} {mer:upper}');
	});

	it('explains Moment E token as ISO day of week', () => {
		const res = Tempo.dialects.explain('YYYY-MM-DD E', DIALECT.Moment);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {dow}');
		expect(res.tokens.find(t => t.source === 'E')).toEqual({
			source: 'E',
			tempo: '{dow}',
			desc: 'ISO day of week (1-7)',
		});
	});

	it('supports .NET custom specifiers prefixed with % to avoid standard format ambiguity', () => {
		const res = Tempo.dialects.explain('%d', DIALECT.DotNet);
		expect(res.pattern).toBe('{dd:raw}');
		expect(res.tokens[0]).toEqual({ source: '%d', tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' });

		const resH = Tempo.dialects.explain('%h', DIALECT.DotNet);
		expect(resH.pattern).toBe('{h12:raw}');
		expect(resH.tokens[0]).toEqual({ source: '%h', tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' });
	});

	it('explains .NET masks into native Tempo braced tokens', () => {
		const res = Tempo.dialects.explain('yyyy-MM-dd HH:mm:ss', DIALECT.DotNet);
		expect(res.dialect).toBe(DIALECT.DotNet);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');

		const resWeekday = Tempo.dialects.explain('dddd, MMMM d, yyyy hh:mm tt', DIALECT.DotNet);
		expect(resWeekday.pattern).toBe('{wkd}, {mon} {dd:raw}, {yyyy} {h12}:{mi} {mer:upper}');

		const resK = Tempo.dialects.explain('yyyy-MM-ddTHH:mm:ssK', DIALECT.DotNet);
		expect(resK.pattern).toBe('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}{tz:offset:utc}');
		expect(resK.tokens.find(t => t.source === 'K')?.tempo).toBe('{tz:offset:utc}');
	});
});


