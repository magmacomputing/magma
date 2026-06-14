import { Tempo } from '#tempo';

describe('h12:upper formatting', () => {
	it('correctly appends uppercase meridiem when h12:upper is used', () => {
		const t = new Tempo('2026-10-24T15:30:00');
		expect(t.format('{h12:upper}:{mi}')).toBe('03:30PM');
	});
});
