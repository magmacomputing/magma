import { Tempo } from '@magmacomputing/tempo';
import {
	RomanPlugin,
	calculateClassicalRomanDate,
	formatClassicalRomanDate,
} from '../src/index.js';

describe('Classical Roman Formatting Engine (Phase 2)', () => {
	beforeAll(() => {
		Tempo.use(RomanPlugin);
	});

	describe('formatClassicalRomanDate and case declensions', () => {
		test('formats dates on the anchor in different grammatical cases', () => {
			// March 15 (Ides of March)
			const ides = calculateClassicalRomanDate(2026, 3, 15);

			// Customary (default) is Ablative of time
			expect(formatClassicalRomanDate(ides)).toBe('Idibus Martiis');
			expect(formatClassicalRomanDate(ides, { case: 'customary' })).toBe('Idibus Martiis');
			expect(formatClassicalRomanDate(ides, { case: 'ablative' })).toBe('Idibus Martiis');

			// Nominative (subject / title)
			expect(formatClassicalRomanDate(ides, { case: 'nominative' })).toBe('Idus Martiae');

			// Accusative
			expect(formatClassicalRomanDate(ides, { case: 'accusative' })).toBe('Idus Martias');

			// January 1 (Kalends of January)
			const kalends = calculateClassicalRomanDate(2026, 1, 1);
			expect(formatClassicalRomanDate(kalends, { case: 'ablative' })).toBe('Kalendis Januariis');
			expect(formatClassicalRomanDate(kalends, { case: 'nominative' })).toBe('Kalendae Januariae');
			expect(formatClassicalRomanDate(kalends, { case: 'accusative' })).toBe('Kalendas Januarias');

			// May 7 (Nones of May)
			const nones = calculateClassicalRomanDate(2026, 5, 7);
			expect(formatClassicalRomanDate(nones, { case: 'ablative' })).toBe('Nonis Maiis');
			expect(formatClassicalRomanDate(nones, { case: 'nominative' })).toBe('Nonae Maiae');
			expect(formatClassicalRomanDate(nones, { case: 'accusative' })).toBe('Nonas Maias');
		});

		test('formats pridie in customary, accusative, and nominative cases', () => {
			// March 14 (Pridie Ides of March)
			const pridieIdes = calculateClassicalRomanDate(2026, 3, 14);
			expect(formatClassicalRomanDate(pridieIdes)).toBe('Pridie Idus Martias');
			expect(formatClassicalRomanDate(pridieIdes, { case: 'accusative' })).toBe('Pridie Idus Martias');
			expect(formatClassicalRomanDate(pridieIdes, { case: 'nominative' })).toBe('Pridie Idus Martiae');
			expect(formatClassicalRomanDate(pridieIdes, { case: 'ablative' })).toBe('Pridie Idibus Martiis');

			// October 31 (Pridie Kalends of November)
			const pridieKalNov = calculateClassicalRomanDate(2026, 10, 31);
			expect(formatClassicalRomanDate(pridieKalNov)).toBe('Pridie Kalendas Novembres');
			expect(formatClassicalRomanDate(pridieKalNov, { case: 'nominative' })).toBe('Pridie Kalendae Novembres');
		});

		test('formats ante diem countdowns with Roman numerals and Latin words', () => {
			// October 16 -> a.d. XVII Kal. Nov.
			const ad17 = calculateClassicalRomanDate(2026, 10, 16);
			expect(formatClassicalRomanDate(ad17)).toBe('ante diem XVII Kalendas Novembres');
			expect(formatClassicalRomanDate(ad17, { style: 'short' })).toBe('a.d. XVII Kal. Nov.');

			// Spelled out ordinal words
			expect(formatClassicalRomanDate(ad17, { words: true })).toBe('ante diem septimum decimum Kalendas Novembres');

			// March 13 -> a.d. III Id. Mart.
			const ad3 = calculateClassicalRomanDate(2026, 3, 13);
			expect(formatClassicalRomanDate(ad3, { words: true })).toBe('ante diem tertium Idus Martias');
		});

		test('formats bissextile leap day properly in both styles', () => {
			// Feb 24 in leap year 2024
			const leapDay = calculateClassicalRomanDate(2024, 2, 24, { bissextile: true });
			expect(leapDay.isBissextile).toBe(true);
			expect(formatClassicalRomanDate(leapDay)).toBe('ante diem bis sextum Kalendas Martias');
			expect(formatClassicalRomanDate(leapDay, { style: 'short' })).toBe('a.d. bis VI Kal. Mart.');
		});

		test('supports AUC suffix and casing transformations', () => {
			const date = calculateClassicalRomanDate(2026, 10, 16);

			// AUC Roman vs Numeric
			expect(formatClassicalRomanDate(date, { auc: true })).toBe('ante diem XVII Kalendas Novembres AUC MMDCCLXXIX');
			expect(formatClassicalRomanDate(date, { auc: true, aucFormat: 'numeric' })).toBe('ante diem XVII Kalendas Novembres AUC 2779');

			// Casing
			expect(formatClassicalRomanDate(date, { casing: 'upper' })).toBe('ANTE DIEM XVII KALENDAS NOVEMBRES');
			expect(formatClassicalRomanDate(date, { casing: 'lower' })).toBe('ante diem xvii kalendas novembres');
			expect(formatClassicalRomanDate(date, { casing: 'capitalize' })).toBe('Ante diem XVII Kalendas Novembres');
		});
	});

	describe('ClassicalRomanDate properties', () => {
		test('provides nominative, accusative, and ablative pre-computed properties', () => {
			const t = new Tempo('2026-03-15');
			const roman = t.toRomanClassical();

			expect(roman.nominative).toBe('Idus Martiae');
			expect(roman.accusative).toBe('Idus Martias');
			expect(roman.ablative).toBe('Idibus Martiis');
			expect(roman.latin).toBe('Idibus Martiis');

			// Direct .format() method on ClassicalRomanDate
			expect(roman.format({ style: 'short' })).toBe('Id. Mart.');
			expect(roman.format({ case: 'nominative' })).toBe('Idus Martiae');
		});
	});

	describe('Unified .roman namespace encapsulation', () => {
		test('provides static methods under Tempo.roman', () => {
			const t = new Tempo('2026-10-16');
			expect(Tempo.roman.format(t)).toBe('ante diem XVII Kalendas Novembres');
			expect(Tempo.roman.format(t, { style: 'short' })).toBe('a.d. XVII Kal. Nov.');
			expect(Tempo.roman.toClassical(t).latin).toBe('ante diem XVII Kalendas Novembres');
			expect(Tempo.roman.yearToAuc(2026)).toBe(2779);
		});

		test('provides all Roman date properties and formatting under instance t.roman', () => {
			const t = new Tempo('2026-10-16');
			expect(t.roman.latin).toBe('ante diem XVII Kalendas Novembres');
			expect(t.roman.shortLatin).toBe('a.d. XVII Kal. Nov.');
			expect(t.roman.nominative).toBe('ante diem XVII Kalendae Novembres');
			expect(t.roman.accusative).toBe('ante diem XVII Kalendas Novembres');
			expect(t.roman.ablative).toBe('ante diem XVII Kalendis Novembribus');
			expect(t.roman.auc).toBe(2779);
			expect(t.roman.format({ style: 'short' })).toBe('a.d. XVII Kal. Nov.');
			expect(t.roman.format({ case: 'nominative' })).toBe('ante diem XVII Kalendae Novembres');
		});

		test('formats Roman date via instance method formatRoman()', () => {
			const t = new Tempo('2026-10-16');
			expect(t.formatRoman()).toBe('ante diem XVII Kalendas Novembres');
			expect(t.formatRoman({ style: 'short' })).toBe('a.d. XVII Kal. Nov.');
			expect(t.formatRoman({ case: 'nominative' })).toBe('ante diem XVII Kalendae Novembres');
			expect(t.formatRoman({ auc: true })).toBe('ante diem XVII Kalendas Novembres AUC MMDCCLXXIX');
		});
	});

	describe('Tempo braced format tokens {roman:...}', () => {
		test('formats {roman} and {roman:classical}', () => {
			const t = new Tempo('2026-10-16');
			expect(t.format('{roman}')).toBe('ante diem XVII Kalendas Novembres');
			expect(t.format('{roman:classical}')).toBe('ante diem XVII Kalendas Novembres');

			const tIdes = new Tempo('2026-03-15');
			expect(tIdes.format('{roman}')).toBe('Idibus Martiis');
		});

		test('formats {roman:short}', () => {
			const t = new Tempo('2026-10-16');
			expect(t.format('{roman:short}')).toBe('a.d. XVII Kal. Nov.');

			const tIdes = new Tempo('2026-03-15');
			expect(tIdes.format('{roman:short}')).toBe('Id. Mart.');
		});

		test('formats {roman:auc} and {roman:auc:num}', () => {
			const t = new Tempo('2026-01-01');
			expect(t.format('{roman:auc}')).toBe('AUC MMDCCLXXIX');
			expect(t.format('{roman:auc:num}')).toBe('2779');

			const tCaesar = new Tempo('-000043-03-15'); // 44 BCE
			expect(tCaesar.format('{roman:auc}')).toBe('AUC DCCX');
		});

		test('formats grammatical cases via tokens {roman:nominative}, {roman:accusative}, {roman:ablative}', () => {
			const t = new Tempo('2026-03-15');
			expect(t.format('{roman:nominative}')).toBe('Idus Martiae');
			expect(t.format('{roman:accusative}')).toBe('Idus Martias');
			expect(t.format('{roman:ablative}')).toBe('Idibus Martiis');
		});

		test('formats combined modifiers {roman:short:upper}, {roman:classical:auc}, etc.', () => {
			const t = new Tempo('2026-10-16');
			expect(t.format('{roman:short:upper}')).toBe('A.D. XVII KAL. NOV.');
			expect(t.format('{roman:short:lower}')).toBe('a.d. xvii kal. nov.');
			expect(t.format('{roman:classical:auc}')).toBe('ante diem XVII Kalendas Novembres AUC MMDCCLXXIX');
		});

		test('resolves dot-notation namespace tokens {roman.latin}, {roman.shortLatin}, {roman.auc}', () => {
			const t = new Tempo('2026-10-16');
			expect(t.format('{roman.latin}')).toBe('ante diem XVII Kalendas Novembres');
			expect(t.format('{roman.shortLatin}')).toBe('a.d. XVII Kal. Nov.');
			expect(t.format('{roman.auc}')).toBe('2779');
			expect(t.format('{roman.nominative}')).toBe('ante diem XVII Kalendae Novembres');
		});
	});
});
