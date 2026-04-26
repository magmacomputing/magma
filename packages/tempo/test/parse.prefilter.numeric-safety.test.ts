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

	test('numeric string still uses layout matching before any fallback', () => {
		const t = new Tempo('590531', { timeZone: 'UTC' });
		const first = t.parse.result?.[0] as any;

		expect(first?.match).toBe('yearMonthDayShort');
		expect(t.yy).toBe(1959);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(31);
	});

	test('numeric string keeps compact-layout precedence with prefilter enabled', () => {
		const t = new Tempo('110559', { timeZone: 'UTC' });
		const first = t.parse.result?.[0] as any;

		expect(t.isValid).toBe(true);
		expect(first?.match).toBe('hourMinuteSecond');
		expect(t.hh).toBe(11);
		expect(t.mi).toBe(5);
		expect(t.ss).toBe(59);
	});
});
