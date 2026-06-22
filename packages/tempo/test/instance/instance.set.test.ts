import { Tempo } from '#tempo';

const label = 'instance.set:';

describe(`${label} set method`, () => {

	test('throws on unknown #term', () => {
		const t = new Tempo();
		expect(() => t.set({ '#unknown': 1 })).toThrow('Unknown Term identifier');
	});

	test('sets atomic units correctly', () => {
		const t = new Tempo('2024-05-20');
		const t2 = t.set({ year: 2025, month: 12, day: 25 });
		expect(t2.yy).toBe(2025);
		expect(t2.mm).toBe(12);
		expect(t2.dd).toBe(25);
	});

	test('sets via parsing string (e.g. period)', () => {
		const t = new Tempo('2024-05-20 08:00');
		const t2 = t.set({ event: 'afternoon' });							  // afternoon -> 15:00 usually
		expect(t2.hh).toBe(15);
	});

	test('sets via parsing time string', () => {
		const t = new Tempo('2024-05-20');
		const t2 = t.set({ time: '10:30pm' });
		expect(t2.hh).toBe(22);
		expect(t2.mi).toBe(30);
	});

	test('accumulates parse results from .set() calls', () => {
		const t = new Tempo('20-May');
		expect(t.parse.result.length).toBe(1);

		const t2 = t.set({ period: 'afternoon' });
		expect(t2.parse.result.length).toBeGreaterThanOrEqual(2);
		expect(t2.parse.result.some(r => r.type === 'Period')).toBe(true);
	});

	test('startOf/midOf/endOf shorthand via set', () => {
		const t = new Tempo('2024-05-20 12:34:56');
		const start = t.set({ start: 'day' });
		expect(start.hh).toBe(0);
		expect(start.mi).toBe(0);

		const end = t.set({ end: 'month' });
		expect(end.dd).toBe(31);
		expect(end.hh).toBe(23);
	});

	describe('Relative Events', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-05-20 12:00:00'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('today/tomorrow/yesterday events via set', () => {
			const t = new Tempo('2024-05-15 12:34:56');

			const todayObserved = t.set('today');
			expect(todayObserved.yy).toBe(2024);
			expect(todayObserved.mm).toBe(5);
			expect(todayObserved.dd).toBe(20); // 'today' is always the system-date
			expect(todayObserved.hh).toBe(12); // preserved time from t

			const tomorrow = t.set('tomorrow');
			expect(tomorrow.yy).toBe(2024);
			expect(tomorrow.mm).toBe(5);
			expect(tomorrow.dd).toBe(16); // 'tomorrow' is relative to the instance
			expect(tomorrow.hh).toBe(12); // preserved time from t

			const yesterday = t.set('yesterday');
			expect(yesterday.yy).toBe(2024);
			expect(yesterday.mm).toBe(5);
			expect(yesterday.dd).toBe(14); // 'yesterday' is relative to the instance
			expect(yesterday.hh).toBe(12); // preserved time from t
		});

		describe('Slick Object Mutations', () => {
			test('rejects native units with slick string payloads', () => {
				const t = new Tempo('2024-05-20');
				expect(() => t.set({ month: '>5' } as any)).toThrow('For relative Slick math, use the \'mm\' snippet key instead of \'month\'');
				expect(() => t.set({ year: '<1' } as any)).toThrow('For relative Slick math, use the \'yy\' snippet key instead of \'year\'');
			});

			test('rejects non-string slick key payloads', () => {
				const t = new Tempo('2024-05-20');
				expect(() => t.set({ mm: 5 } as any)).toThrow('Slick key \'mm\' expects a string payload');
			});

			test('rejects invalid slick math syntax without modifier', () => {
				const t = new Tempo('2024-05-20');
				expect(() => t.set({ yy: '2025' })).toThrow('Slick math requires a shift operator (e.g. \'>\', \'<\')');
			});

			test('resolves simple forward/backward numeric shifts', () => {
				const t = new Tempo('2024-05-20 12:00:00');
				const t2 = t.set({ yy: '>1' });
				expect(t2.yy).toBe(2025);
				expect(t2.mm).toBe(5);

				const t3 = t.set({ mm: '<3' });
				expect(t3.yy).toBe(2024);
				expect(t3.mm).toBe(2);

				const t4 = t.set({ dd: '>5' });
				expect(t4.dd).toBe(25);
			});

			test('resolves negative numeric shifts (double negation synonyms)', () => {
				const t = new Tempo('2024-05-20');
				const t2 = t.set({ mm: '>-2' }); // >-2 = <2
				expect(t2.mm).toBe(3);

				const t3 = t.set({ mm: '<-3' }); // <-3 = >3
				expect(t3.mm).toBe(8);

				const t4 = t.set({ ww: '>-1' }); // backwards 1 week
				expect(t4.dd).toBe(13);

				const t5 = t.set({ dd: '+5' }); // + is an alias for >
				expect(t5.dd).toBe(25);
			});

			test('resolves wkd string payload shifts', () => {
				// 2024-05-20 is a Monday
				const t = new Tempo('2024-05-20');
				const nextFri = t.set({ wkd: '>Fri' });
				expect(nextFri.dd).toBe(24);
				expect(nextFri.toDateTime().dayOfWeek).toBe(5);

				const lastWed = t.set({ wkd: '<Wed' });
				expect(lastWed.dd).toBe(15);
				expect(lastWed.toDateTime().dayOfWeek).toBe(3);

				const sameMon = t.set({ wkd: '>=Mon' });
				expect(sameMon.dd).toBe(20);

				const nextMon = t.set({ wkd: '>Mon' });
				expect(nextMon.dd).toBe(27);

				const lastMon = t.set({ wkd: '<Mon' });
				expect(lastMon.dd).toBe(13);

				const currentMon = t.set({ wkd: '=Mon' });
				expect(currentMon.dd).toBe(20);

				const plusFri = t.set({ wkd: '+Fri' }); // + is alias for >
				expect(plusFri.dd).toBe(24);

				const minusWed = t.set({ wkd: '-Wed' }); // - is alias for <
				expect(minusWed.dd).toBe(15);
			});

			test('deterministic chaining executes in expected insertion order', () => {
				const t = new Tempo('2024-05-20 12:00:00'); // Monday

				// Order 1: Set month to Dec, then next Friday
				// 2024-12-20 is a Friday. So next Friday is 2024-12-27.
				const t2 = t.set({ month: 12, wkd: '>Fri' });
				expect(t2.mm).toBe(12);
				expect(t2.dd).toBe(27);

				// Order 2: Next Friday, then set month to Dec
				// Next Friday from May 20 is May 24.
				// Month set to 12 -> Dec 24.
				const t3 = t.set({ wkd: '>Fri', month: 12 });
				expect(t3.mm).toBe(12);
				expect(t3.dd).toBe(24);
			});
		});
	});
});
