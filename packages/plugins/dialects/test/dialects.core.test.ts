import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Dialects Core Modularity & Guardrails', () => {
	beforeAll(() => {
		Tempo.use(FormatModule);
		Tempo.use(ParseModule);
		Tempo.use(DialectsPlugin);
	});

	it('registers on Tempo Core and executes dialect formatting when FormatModule is loaded', () => {
		const t = new Tempo('2026-10-24T15:30:45');
		expect(t.format('yyyy-MM-dd HH:mm:ss', { dialect: DIALECT.Ldml })).toBe('2026-10-24 15:30:45');
		expect(t.toFormat('yyyy-MM-dd')).toBe('2026-10-24');
		expect(t.dialects.ldml('dd LLL yyyy')).toBe('24 Oct 2026');
		expect(t.dialects.strftime('%Y-%m-%d')).toBe('2026-10-24');

		// Best of both worlds: braced masks bypass dialect formatting and use native Tempo tokens
		expect(t.format('{yyyy}-{mm}-{dd}', { dialect: DIALECT.Ldml })).toBe('2026-10-24');
		expect(t.format('{mmm} {dd}, {yyyy} at {hh}:{mi}', { dialect: 'moment' })).toBe('Oct 24, 2026 at 15:30');

		// Bracket-escaped literal braces in Moment/Day.js masks reach the dialect formatter
		expect(t.format('[{yyyy}] YYYY-MM-DD', { dialect: 'moment' })).toBe('{yyyy} 2026-10-24');

		// Single-quote escaped literal braces in LDML masks reach the dialect formatter
		expect(t.format("'{yyyy}' yyyy-MM-dd", { dialect: DIALECT.Ldml })).toBe('{yyyy} 2026-10-24');
	});

	it('parses dates on Tempo Core with dialect masks when ParseModule is loaded', () => {
		const t = Tempo.fromFormat('24/10/2026', 'dd/MM/yyyy');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);

		// Bracket-escaped literal braces in Moment/Day.js reach the dialect parser
		const tMoment = new Tempo('{yyyy} 2026-10-24', { format: '[{yyyy}] YYYY-MM-DD', dialect: 'moment' });
		expect(tMoment.isValid).toBe(true);
		expect(tMoment.yy).toBe(2026);
		expect(tMoment.mm).toBe(10);
		expect(tMoment.dd).toBe(24);

		// Single-quote escaped literal braces in LDML reach the dialect parser
		const tLdml = new Tempo('{yyyy} 2026-10-24', { format: "'{yyyy}' yyyy-MM-dd", dialect: DIALECT.Ldml });
		expect(tLdml.isValid).toBe(true);
		expect(tLdml.yy).toBe(2026);
		expect(tLdml.mm).toBe(10);
		expect(tLdml.dd).toBe(24);
	});

	it('supports dynamic function for dialect option in formatting and parsing', () => {
		const getDialect = () => DIALECT.Strftime;
		const t = new Tempo('2026-10-24T15:30:45');
		expect(t.format('%Y/%m/%d', { dialect: getDialect })).toBe('2026/10/24');

		const parsed = Tempo.dialects.parse('2026/10/24', '%Y/%m/%d', getDialect);
		expect(parsed.isValid).toBe(true);
		expect(parsed.yy).toBe(2026);
		expect(parsed.mm).toBe(10);
		expect(parsed.dd).toBe(24);
	});
});
