import { Tempo } from '#tempo';

describe('Tempo Millisecond Timestamp', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('new Tempo(ms) should resolve correctly', () => {
		const ms = 1714521600000; // May 1, 2024 UTC
		const t = new Tempo(ms, { timeZone: 'UTC' });

		expect(t.yy).toBe(2024);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(1);
	});

	test('new Tempo(s) with ss config should resolve correctly', () => {
		const s = 1714521600; // May 1, 2024 UTC in seconds
		const t = new Tempo(s, { timeStamp: 'ss', timeZone: 'UTC' });

		expect(t.yy).toBe(2024);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(1);
	});

	test('new Tempo(us) with us config should resolve correctly', () => {
		const us = 1714521600000000; // May 1, 2024 UTC in microseconds
		const t = new Tempo(us, { timeStamp: 'us', timeZone: 'UTC' });

		expect(t.yy).toBe(2024);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(1);
	});

	test('new Tempo(ns) with ns config should resolve correctly', () => {
		const ns = 1714521600000000000n; // May 1, 2024 UTC in nanoseconds
		const t = new Tempo(ns, { timeStamp: 'ns', timeZone: 'UTC' });

		expect(t.yy).toBe(2024);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(1);
	});
});
