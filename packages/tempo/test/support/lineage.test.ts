import { Tempo } from '#tempo';

describe('Tempo Result Lineage', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('new Tempo() should have Undefined in result', () => {
		const t = new Tempo();
		expect(t.parse.result).toHaveLength(1);
		expect(t.parse.result[0].type).toBe('Undefined');
	});

	test('new Tempo(new Date()) should have Date in result', () => {
		const t = new Tempo(new Date());
		expect(t.parse.result).toHaveLength(1);
		expect(t.parse.result[0].type).toBe('Date');
	});

	test('new Tempo("20-May") should have string match', () => {
		const t = new Tempo('20-May');
		expect(t.parse.result.length).toBeGreaterThan(0);
		expect(t.parse.result.some(r => r.value === '20-May')).toBe(true);
	});
});
