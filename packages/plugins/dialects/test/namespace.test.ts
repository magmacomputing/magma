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
});
