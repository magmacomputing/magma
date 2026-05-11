import { Tempo } from '#tempo';

describe('Tempo timestamp configuration resolution', () => {
	const epochSeconds = 1778292723;

	test('respects timeStamp: "ss" in constructor options for Number inputs', () => {
		const t = new Tempo(epochSeconds, { timeStamp: 'ss' });
		expect(t.ss).toBe(3); // 1778292723 % 60 = 3
		expect(t.epoch.ss).toBe(epochSeconds);
	});

	test('respects timeStamp: "ms" in constructor options for Number inputs', () => {
		const t = new Tempo(epochSeconds, { timeStamp: 'ms' });
		// Use a 13-digit millisecond timestamp for ms-mode test
		const msVal = 1715900000000;
		const t2 = new Tempo(msVal, { timeStamp: 'ms' });
		expect(t2.epoch.ms).toBe(msVal);
	});


	test('respects timeStamp: "ss" for BigInt inputs', () => {
		const t = new Tempo(BigInt(epochSeconds), { timeStamp: 'ss' });
		expect(t.epoch.ss).toBe(epochSeconds);
	});

	test('respects timeStamp: "ns" for BigInt inputs', () => {
		const t = new Tempo(BigInt(epochSeconds), { timeStamp: 'ns', timeZone: 'UTC' });
		expect(t.epoch.ns).toBe(BigInt(epochSeconds));
		expect(t.toDateTime().year).toBe(1970);
	});

	test('defaults to ms for Number inputs when no timeStamp configured', () => {
		const msVal = 1715900000000;
		const t = new Tempo(msVal);
		expect(t.epoch.ms).toBe(msVal);
	});
});


