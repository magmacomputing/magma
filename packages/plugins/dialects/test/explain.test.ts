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
	});

	it('translates timezone tokens into Tempo tz modifiers', () => {
		const res1 = Tempo.dialects.explain('yyyy-MM-dd HH:mm zzzz', DIALECT.Ldml);
		expect(res1.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi} {tz:long}');

		const res2 = Tempo.dialects.explain('%Y-%m-%d %H:%M %Z', DIALECT.Strftime);
		expect(res2.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi} {tz:short}');

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
		expect(res.pattern).toBe('{yw}-{wy}-{dow:locale} J');
		const jToken = res.tokens.find(t => t.source === 'J');
		expect(jToken?.tempo).toBe('');
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

		// RM does not map to {mm}
		const resRm = Tempo.dialects.explain('DD-RM-YYYY', DIALECT.Oracle);
		expect(resRm.pattern).toBe('{dd}-RM-{yyyy}');

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
	});
});
