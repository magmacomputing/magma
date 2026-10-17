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

		// Oracle WW translates to Tempo {woy:cal:raw}, which has no direct POSIX strftime token
		const resOracle = Tempo.dialects.convert('FM"Week "WW', DIALECT.Oracle, DIALECT.Strftime);
		expect(resOracle.unsupported).toContain('{woy:cal:raw}');
		expect(resOracle.unsupported).not.toContain('FM');

		// Standalone PHP S has no tempo mapping (tempo: '') -> tracked as unsupported
		const resPhp = Tempo.dialects.convert('j S', DIALECT.Php, DIALECT.Oracle);
		expect(resPhp.unsupported).toContain('S');
	});

	it('cross-converts between PHP date() and Go reference layouts', () => {
		const res1 = Tempo.dialects.convert('Y-m-d H:i:s', DIALECT.Php, DIALECT.Go);
		expect(res1.from).toBe(DIALECT.Php);
		expect(res1.to).toBe(DIALECT.Go);
		expect(res1.pattern).toBe('2006-01-02 15:04:05');

		const res2 = Tempo.dialects.convert('2006-01-02 15:04:05', DIALECT.Go, DIALECT.Php);
		expect(res2.from).toBe(DIALECT.Go);
		expect(res2.to).toBe(DIALECT.Php);
		expect(res2.pattern).toBe('Y-m-d H:i:s');

		// Auto-detect Go layout
		const resAuto = Tempo.dialects.convert('2006-01-02 15:04:05', DIALECT.Strftime);
		expect(resAuto.from).toBe(DIALECT.Go);
		expect(resAuto.to).toBe(DIALECT.Strftime);
		expect(resAuto.pattern).toBe('%Y-%m-%d %H:%M:%S');
	});

	it('is available on instance namespace t.dialects.convert', () => {
		const t = new Tempo('2026-10-24T12:00:00Z');
		const res = t.dialects.convert('%Y-%m-%d', DIALECT.Strftime, DIALECT.Oracle);
		expect(res.pattern).toBe('YYYY-MM-DD');
	});

	it('cross-converts compound PHP jS and LDML DDD with zero unsupported tokens', () => {
		const resPhp = Tempo.dialects.convert('jS F Y', DIALECT.Php, DIALECT.Moment);
		expect(resPhp.pattern).toBe('Do MMMM YYYY');
		expect(resPhp.unsupported).toHaveLength(0);

		const resLdml = Tempo.dialects.convert('yyyy-DDD', DIALECT.Ldml, DIALECT.Strftime);
		expect(resLdml.pattern).toBe('%Y-%j');
		expect(resLdml.unsupported).toHaveLength(0);
	});

	it('accepts options object { from, to } in convert', () => {
		const res = Tempo.dialects.convert('YYYY-MM-DD', { from: DIALECT.Moment, to: DIALECT.Oracle });
		expect(res.pattern).toBe('YYYY-MM-DD');
		expect(res.from).toBe(DIALECT.Moment);
		expect(res.to).toBe(DIALECT.Oracle);

		const resAuto = Tempo.dialects.convert('%Y-%m-%d', { to: DIALECT.Oracle });
		expect(resAuto.pattern).toBe('YYYY-MM-DD');
		expect(resAuto.from).toBe(DIALECT.Strftime);
	});
});
