import { Tempo } from '#tempo';
import type * as t from '#tempo/tempo.type.js';

describe('Functional Alias Chaining & Host Context', () => {
	beforeAll(() => {
		Tempo.init({
			event: {
				// 1. Basic Chaining: add then set
				'chain.add.set': function (this: t.AliasContext) {
					return this.add({ days: 1 }).set('2026-05-20');
				},
				// 2. Term in add() - Use #qtr as it is a known standard term
				'term.add': function (this: t.AliasContext) {
					return this.add('#qtr');
				},
				// 3. Term in set()
				'term.set': function (this: t.AliasContext) {
					return this.set('#per.morning');
				},
				// 4. Config override in set() - Verifying parity inside the alias
				'config.set': function (this: t.AliasContext) {
					const res = this.set('08:00', { timeZone: 'UTC' });
					// Return a unique date if the internal config was correctly updated
					if (res.config.timeZone === 'UTC') return '2026-12-25';
					return 'fail';
				},
				// 5. Recursive Alias resolution
				'alias.a': function (this: t.AliasContext) {
					return this.set('alias.b');
				},
				'alias.b': function () {
					return '2026-01-01T12:00:00';
				},
				// 6. Multi-chain with fixed anchor
				'multi.chain': function (this: t.AliasContext) {
					return this.set('2026-01-01').add({ hours: 1 }).add({ minutes: 30 });
				}
			}
		});
	});

	test('should support chaining add().set()', () => {
		const t = new Tempo('chain.add.set');
		expect(t.format('date')).toBe('2026-05-20');
	});

	test('should support terms in add()', () => {
		const anchor = new Tempo('2026-01-01T10:00:00');
		const t = new Tempo('term.add', { anchor });
		// Q1 starts Jan 1. Adding a quarter moves to Q2 (Apr 1)
		expect(t.mm).toBe(4); // Month number (April)
		expect(t.dd).toBe(1);
	});

	test('should support terms in set()', () => {
		const t = new Tempo('term.set');
		expect(t.hh).toBe(8);
	});

	test('should support config overrides inside functional aliases', () => {
		const t = new Tempo('config.set');
		expect(t.format('date')).toBe('2026-12-25');
	});

	test('should support recursive alias resolution via this.set()', () => {
		const t = new Tempo('alias.a');
		expect(t.format('date')).toBe('2026-01-01');
		expect(t.hh).toBe(12);
	});

	test('should support multiple chained operations with fixed anchor', () => {
		const anchor = new Tempo('2026-05-10T00:00:00');
		const t = new Tempo('multi.chain', { anchor });
		expect(t.format('date')).toBe('2026-01-01');
		expect(t.hh).toBe(1);
		expect(t.mi).toBe(30); // Minute number
	});
});
