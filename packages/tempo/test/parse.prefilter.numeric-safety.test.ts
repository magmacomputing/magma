import { Tempo } from '#tempo';

describe('parse prefilter numeric safety constraints', () => {
	beforeEach(() => {
		Tempo.init({ parsePrefilter: true });
	});

	test('keeps integer-like BigInt nanosecond string as early escape', () => {
		expect(() => new Tempo('1715900000000000000n', { timeZone: 'UTC' }))
			.toThrow(/Cannot parse Date/i);
	});

	test('number input with less than 8 digits still rejects safely', () => {
		expect(() => new Tempo(1234567, { timeZone: 'UTC' })).toThrow(/less than 8-digits/i);
	});


	test('numeric string with delimiter bypasses numeric-prefilter and uses layout matching', () => {
		const t = new Tempo('59-05-31', { timeZone: 'UTC' });
		const first = t.parse.result?.[0] as any;

		// Using a delimiter ('-') ensures selectLayoutPatterns() is exercised instead of 
		// the pure numeric short-circuit (BigInt) in discrete.parse.ts.
		expect(first?.match).toBe('yearMonthDay');
		expect(t.yy).toBe(1959);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(31);
	});


	test('numeric string with delimiter (time) keeps layout precedence with prefilter enabled', () => {
		const t = new Tempo('11:05:59', { timeZone: 'UTC' });
		const first = t.parse.result?.[0] as any;

		// Referencing selectLayoutPatterns() behavior: colons bias the planner towards 'time' layout.
		expect(t.isValid).toBe(true);
		expect(first?.match).toBe('time');
		expect(t.hh).toBe(11);
		expect(t.mi).toBe(5);
		expect(t.ss).toBe(59);
	});
});
