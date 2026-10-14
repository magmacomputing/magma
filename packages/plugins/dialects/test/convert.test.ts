import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Dialects Cross-Dialect Converter (.convert)', () => {
	beforeAll(() => {
		Tempo.use(DialectsPlugin);
	});

	it('translates POSIX strftime to Oracle TO_CHAR with 3 arguments', () => {
		const res = Tempo.dialects.convert('%Y-%m-%d %H:%M:%S', DIALECT.Strftime, DIALECT.Oracle);
		expect(res.from).toBe(DIALECT.Strftime);
		expect(res.to).toBe(DIALECT.Oracle);
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI:SS');
		expect(res.toString()).toBe('YYYY-MM-DD HH24:MI:SS');
		expect(res.unsupported).toHaveLength(0);
	});

	it('translates Oracle TO_CHAR to POSIX strftime', () => {
		const res = Tempo.dialects.convert('YYYY-MM-DD HH24:MI:SS', DIALECT.Oracle, DIALECT.Strftime);
		expect(res.from).toBe(DIALECT.Oracle);
		expect(res.to).toBe(DIALECT.Strftime);
		expect(res.pattern).toBe('%Y-%m-%d %H:%M:%S');
		expect(res.unsupported).toHaveLength(0);
	});

	it('translates Moment to Oracle TO_CHAR', () => {
		const res = Tempo.dialects.convert('YYYY-MM-DD HH:mm:ss', DIALECT.Moment, 'sql');
		expect(res.from).toBe(DIALECT.Moment);
		expect(res.to).toBe(DIALECT.Oracle);
		expect(res.pattern).toBe('YYYY-MM-DD HH24:MI:SS');
	});

	it('translates LDML to POSIX strftime', () => {
		const res = Tempo.dialects.convert('yyyy-MM-dd HH:mm:ss', DIALECT.Ldml, DIALECT.Strftime);
		expect(res.from).toBe(DIALECT.Ldml);
		expect(res.to).toBe(DIALECT.Strftime);
		expect(res.pattern).toBe('%Y-%m-%d %H:%M:%S');
	});

	it('auto-detects source dialect when only 2 arguments are provided', () => {
		// POSIX has %
		const resPosix = Tempo.dialects.convert('%Y-%m-%d', DIALECT.Oracle);
		expect(resPosix.from).toBe(DIALECT.Strftime);
		expect(resPosix.to).toBe(DIALECT.Oracle);
		expect(resPosix.pattern).toBe('YYYY-MM-DD');

		// Oracle has HH24/MI
		const resOracle = Tempo.dialects.convert('HH24:MI:SS', DIALECT.Strftime);
		expect(resOracle.from).toBe(DIALECT.Oracle);
		expect(resOracle.to).toBe(DIALECT.Strftime);
		expect(resOracle.pattern).toBe('%H:%M:%S');
	});

	it('preserves and translates literal tokens correctly between dialects', () => {
		// Moment bracketed literal [Date]: YYYY-MM-DD -> Oracle "Date": YYYY-MM-DD
		const res = Tempo.dialects.convert('[Date]: YYYY-MM-DD', DIALECT.Moment, DIALECT.Oracle);
		expect(res.pattern).toBe('"Date": YYYY-MM-DD');
	});

	it('tracks unsupported tokens when cross-converting', () => {
		// %s (epoch seconds) in POSIX translates to Tempo {ts}, which has no direct Oracle TO_CHAR token
		const res = Tempo.dialects.convert('%Y-%m-%d %s', DIALECT.Strftime, DIALECT.Oracle);
		expect(res.unsupported).toContain('{ts}');
	});

	it('is available on instance namespace t.dialects.convert', () => {
		const t = new Tempo('2026-10-24T12:00:00Z');
		const res = t.dialects.convert('%Y-%m-%d', DIALECT.Strftime, DIALECT.Oracle);
		expect(res.pattern).toBe('YYYY-MM-DD');
	});
});
