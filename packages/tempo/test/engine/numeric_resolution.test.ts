import { Tempo } from '#tempo';

describe('Numeric Resolution & Fractional Precision', () => {
	test('should resolve fractional seconds to milliseconds', () => {
		const t = new Tempo(1.5, { timeZone: 'UTC', timeStamp: 'ss' });
		// 1.5s = 01:00:01.500
		expect(t.ss).toBe(1);
		expect(t.toDateTime().millisecond).toBe(500);
	});

	test('should resolve fractional milliseconds to microseconds', () => {
		const t = new Tempo(100.25, { timeZone: 'UTC', timeStamp: 'ms' });
		// 100ms + 0.25ms = 100ms + 250us
		expect(t.toDateTime().millisecond).toBe(100);
		expect(t.toDateTime().microsecond).toBe(250);
	});

	test('should resolve fractional microseconds to nanoseconds', () => {
		const t = new Tempo(10.5, { timeZone: 'UTC', timeStamp: 'us' });
		// 10us + 0.5us = 10us + 500ns
		expect(t.toDateTime().microsecond).toBe(10);
		expect(t.toDateTime().nanosecond).toBe(500);
	});

	test('should maintain precision for deep decimals', () => {
		const t = new Tempo(0.123456789, { timeZone: 'UTC', timeStamp: 'ss' });
		expect(t.toDateTime().millisecond).toBe(123);
		expect(t.toDateTime().microsecond).toBe(456);
		expect(t.toDateTime().nanosecond).toBe(789);
	});

	test('should handle negative fractional numbers correctly', () => {
		const t = new Tempo(-1.5, { timeZone: 'UTC', timeStamp: 'ss' });
		// -1.5s is 1.5s before the epoch
		expect(t.toDateTime().epochMilliseconds).toBe(-1500);
	});

	test('should resolve numeric strings (floats) correctly', () => {
		const t = new Tempo('1.5', { timeZone: 'UTC', timeStamp: 'ss' });
		expect(t.toDateTime().epochMilliseconds).toBe(1500);
	});

	describe('NaN handling', () => {
		let originalCatch: boolean | undefined;

		beforeEach(() => {
			originalCatch = Tempo.config.catch;
		});

		afterEach(() => {
			Tempo.init({ catch: originalCatch });
		});

		test('should reject NaN with custom error', () => {
			// Enable catch: true so logError doesn't throw and we can verify fallback behavior
			Tempo.init({ catch: true });
			const t = new Tempo(NaN);
			expect(t.isValid).toBe(true); // Falls back to 'now'
			expect(t.parse.result?.[0]?.match).toBeUndefined(); // No match recorded for NaN
		});
	});
});
