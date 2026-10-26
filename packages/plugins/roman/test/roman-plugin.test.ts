import { Tempo } from '@magmacomputing/tempo';
import { RomanPlugin } from '../src/index.js';

describe('Tempo Roman Plugin Integration', () => {
	beforeEach(() => {
		Tempo.use(RomanPlugin);
	});

	it('mounts static Tempo.roman namespace', () => {
		expect(Tempo.roman).toBeDefined();
		expect(typeof Tempo.roman.toClassical).toBe('function');
		expect(typeof Tempo.roman.yearToAuc).toBe('function');
		expect(typeof Tempo.roman.aucToYear).toBe('function');
		expect(typeof Tempo.roman.getNonesDay).toBe('function');
		expect(typeof Tempo.roman.getIdesDay).toBe('function');
		expect(typeof Tempo.roman.isLeapYear).toBe('function');
	});

	it('computes classical Roman date via Tempo.prototype.toRomanClassical()', () => {
		const t = new Tempo('2026-10-16');
		const roman = t.toRomanClassical();

		expect(roman.anchor).toBe('Kalends');
		expect(roman.anchorMonth).toBe(11);
		expect(roman.relation).toBe('ante_diem');
		expect(roman.count).toBe(17);
		expect(roman.latin).toBe('ante diem XVII Kalendas Novembres');
		expect(roman.shortLatin).toBe('a.d. XVII Kal. Nov.');
		expect(roman.auc).toBe(2779);
	});

	it('computes AUC via toAUC() and auc getter', () => {
		const t2026 = new Tempo('2026-01-01');
		expect(t2026.toAUC()).toBe(2779);
		expect(t2026.auc).toBe(2779);

		const tCaesar = new Tempo('-000043-03-15'); // 44 BCE
		expect(tCaesar.toAUC()).toBe(710);
		expect(tCaesar.auc).toBe(710);
		expect(tCaesar.toRomanClassical().latin).toBe('Idibus Martiis');
	});

	it('calculates via static Tempo.roman.toClassical() from Tempo, Date, or object', () => {
		const fromTempo = Tempo.roman.toClassical(new Tempo('2026-03-15'));
		expect(fromTempo.latin).toBe('Idibus Martiis');

		const fromDate = Tempo.roman.toClassical(new Date(2026, 2, 15)); // Month index 2 = March
		expect(fromDate.latin).toBe('Idibus Martiis');

		const fromObj = Tempo.roman.toClassical({ year: 2026, month: 3, day: 15 });
		expect(fromObj.latin).toBe('Idibus Martiis');
	});

	it('throws TypeError when invalid date object is provided to Tempo.roman.toClassical', () => {
		expect(() => Tempo.roman.toClassical(null as any)).toThrow(TypeError);
		expect(() => Tempo.roman.toClassical({} as any)).toThrow(TypeError);
	});

	it('guarantees immutability by returning frozen objects from all Tempo.roman methods', () => {
		const t = new Tempo('2026-10-16');
		const romanInstance = t.toRomanClassical();
		expect(Object.isFrozen(romanInstance)).toBe(true);

		const romanStatic = Tempo.roman.toClassical({ year: 2026, month: 3, day: 15 });
		expect(Object.isFrozen(romanStatic)).toBe(true);

		const historicalYear = Tempo.roman.aucToYear(710, 'historical');
		expect(Object.isFrozen(historicalYear)).toBe(true);

		const resolvedDate = Tempo.roman.fromClassical('Ides', 3, 2026, 'on');
		expect(Object.isFrozen(resolvedDate)).toBe(true);
	});
});

