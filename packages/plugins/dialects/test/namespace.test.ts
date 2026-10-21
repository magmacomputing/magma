import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin } from '../src/index.js';

describe('Dialects Namespace & Shims', () => {
	Tempo.use(DialectsPlugin);

	const t = new Tempo('2026-10-24T15:30:45');

	it('provides t.dialects instance methods', () => {
		expect(t.dialects.ldml('yyyy-MM-dd')).toBe('2026-10-24');
		expect(t.dialects.strftime('%Y-%m-%d')).toBe('2026-10-24');
		expect(t.dialects.format('dd/MM/yyyy', 'ldml')).toBe('24/10/2026');
	});

	it('provides Luxon drop-in alias t.toFormat()', () => {
		expect(t.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-24 15:30:45');
		expect(t.toFormat('dd LLL yyyy')).toBe('24 Oct 2026');
	});

	it('ensures static Tempo.dialects namespace is immutable and frozen', () => {
		expect(Object.isFrozen(Tempo.dialects)).toBe(true);
		expect(() => {
			(Tempo.dialects as any).custom = () => { };
		}).toThrow();
	});

	it('auto-detects dialect in Tempo.dialects.parse() when omitted', () => {
		const parsedStrftime = Tempo.dialects.parse('2026-10-24', '%Y-%m-%d');
		expect(parsedStrftime.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');

		const parsedGo = Tempo.dialects.parse('2026-10-24', '2006-01-02');
		expect(parsedGo.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');

		const parsedOracle = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS');
		expect(parsedOracle.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-10-24 15:30:45');
	});

	it('supports options objects across static Tempo.dialects methods', () => {
		const explained = Tempo.dialects.explain('%Y-%m-%d', { dialect: 'strftime' });
		expect(explained.tokens.length).toBe(3);
		expect(explained.pattern).toBe('{yyyy}-{mm}-{dd}');

		const exported = Tempo.dialects.export('{yyyy}-{mm}-{dd}', { dialect: 'strftime' });
		expect(exported.pattern).toBe('%Y-%m-%d');

		const converted = Tempo.dialects.convert('%Y-%m-%d', { from: 'strftime', to: 'ldml' });
		expect(converted.pattern).toBe('yyyy-MM-dd');
	});
});
