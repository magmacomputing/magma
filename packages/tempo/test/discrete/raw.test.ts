import { Tempo } from '#tempo';

describe('raw token formatting', () => {
	it('strips leading zeros', () => {
		const t0 = new Tempo('2026-01-01T00:00:00');
		expect(t0.format('{mi:raw}')).toBe('0');

		const t5 = new Tempo('2026-01-01T00:05:00');
		expect(t5.format('{mi:raw}')).toBe('5');

		const t15 = new Tempo('2026-01-01T00:15:00');
		expect(t15.format('{mi:raw}')).toBe('15');
	});
});
