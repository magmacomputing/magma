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
});
