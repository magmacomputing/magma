import { Tempo } from '@magmacomputing/tempo';
import {
	RomanPlugin,
	calculateClassicalRomanDate,
	formatClassicalRomanDate,
	parseClassicalRomanDate,
} from '../src/index.js';

describe('Classical Roman Parser (Phase 3)', () => {
	beforeAll(() => {
		Tempo.use(RomanPlugin);
	});

	describe('parseClassicalRomanDate', () => {
		test('resolves the plan example: a.d. IV Id. Mart. 710 AUC', () => {
			const r = parseClassicalRomanDate('a.d. IV Id. Mart. 710 AUC');
			expect(r).toMatchObject({ year: -43, month: 3, day: 12, auc: 710 });
		});

		test('anchor days in any case and spelling', () => {
			for (const s of ['Idibus Martiis', 'Idus Martiae', 'Idus Martias', 'Id. Mart.', 'idibus martiis'])
				expect(parseClassicalRomanDate(s, { year: 2026 })).toMatchObject({ month: 3, day: 15 });

			expect(parseClassicalRomanDate('Kalendis Januariis', { year: 2026 })).toMatchObject({ month: 1, day: 1 });
			expect(parseClassicalRomanDate('Kalendis Ianuariis', { year: 2026 })).toMatchObject({ month: 1, day: 1 });
			expect(parseClassicalRomanDate('Nonis Maiis', { year: 2026 })).toMatchObject({ month: 5, day: 7 });
			expect(parseClassicalRomanDate('Non. Apr.', { year: 2026 })).toMatchObject({ month: 4, day: 5 });
		});

		test('pridie', () => {
			expect(parseClassicalRomanDate('Pridie Idus Martias', { year: 2026 })).toMatchObject({ month: 3, day: 14 });
			expect(parseClassicalRomanDate('Prid. Kal. Nov.', { year: 2026 })).toMatchObject({ month: 10, day: 31 });
			expect(parseClassicalRomanDate('a.d. II Non. Mai.', { year: 2026 })).toMatchObject({ month: 5, day: 6 });
		});

		test('ante diem with numerals', () => {
			expect(parseClassicalRomanDate('ante diem XVII Kalendas Novembres', { year: 2026 }))
				.toMatchObject({ month: 10, day: 16 });
			expect(parseClassicalRomanDate('a.d. XVII Kal. Nov. AUC MMDCCLXXIX'))
				.toMatchObject({ year: 2026, month: 10, day: 16 });
		});

		test('ante diem with Latin words', () => {
			expect(parseClassicalRomanDate('ante diem tertium decimum Kalendas Apriles', { year: 2026 }))
				.toMatchObject({ month: 3, day: 20 });
			expect(parseClassicalRomanDate('ante diem sextum Idus Martias', { year: 2026 }))
				.toMatchObject({ month: 3, day: 10 });
		});

		test('Kalends of January belong to the previous December', () => {
			expect(parseClassicalRomanDate('a.d. III Kal. Ian. 2779 AUC'))
				.toMatchObject({ year: 2026, month: 12, day: 30 });
		});

		test('year forms: AUC, BCE/CE, bare year, options.year', () => {
			expect(parseClassicalRomanDate('Idibus Martiis 2779 AUC').year).toBe(2026);
			expect(parseClassicalRomanDate('Idibus Martiis AUC 2779').year).toBe(2026);
			expect(parseClassicalRomanDate('Idibus Martiis 44 BCE').year).toBe(-43);
			expect(parseClassicalRomanDate('Idibus Martiis 44 CE').year).toBe(44);
			expect(parseClassicalRomanDate('Idibus Martiis 2026').year).toBe(2026);
			expect(parseClassicalRomanDate('Idibus Martiis', { year: 1999 }).year).toBe(1999);
		});

		test('bissextile day', () => {
			expect(parseClassicalRomanDate('a.d. bis VI Kal. Mart.', { year: 2024 })).toMatchObject({ month: 2, day: 24 });
			expect(parseClassicalRomanDate('ante diem bis sextum Kalendas Martias', { year: 2024 }))
				.toMatchObject({ month: 2, day: 24 });
			expect(parseClassicalRomanDate('a.d. VI Kal. Mart.', { year: 2024 })).toMatchObject({ month: 2, day: 25 });
			expect(parseClassicalRomanDate('a.d. VI Kal. Mart.', { year: 2026 })).toMatchObject({ month: 2, day: 24 });
		});

		test('rejects impossible and unrecognised input', () => {
			expect(() => parseClassicalRomanDate('a.d. XX Kal. Nov.', { year: 2026 })).toThrow(RangeError);
			expect(() => parseClassicalRomanDate('a.d. VIII Non. Mart.', { year: 2026 })).toThrow(RangeError);
			expect(() => parseClassicalRomanDate('a.d. bis VI Kal. Mart.', { year: 2026 })).toThrow(RangeError);
			expect(() => parseClassicalRomanDate('bis VI Kal. Nov.', { year: 2026 })).toThrow(RangeError);
			expect(() => parseClassicalRomanDate('hello world')).toThrow(RangeError);
			expect(() => parseClassicalRomanDate('Idibus Martiis')).toThrow(/no year/);
			expect(() => parseClassicalRomanDate('')).toThrow(TypeError);
		});

		test('round-trips every day of a leap and non-leap year in every case', () => {
			for (const year of [2023, 2024]) {
				for (let month = 1; month <= 12; month++) {
					const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
					for (let day = 1; day <= days; day++) {
						const roman = calculateClassicalRomanDate(year, month, day);
						for (const c of ['nominative', 'accusative', 'ablative', 'customary'] as const) {
							for (const style of ['classical', 'short'] as const) {
								const text = formatClassicalRomanDate(roman, { case: c, style });
								expect(parseClassicalRomanDate(text, { year })).toMatchObject({ year, month, day });
							}
						}
						const withAuc = formatClassicalRomanDate(roman, { auc: true, aucFormat: 'numeric' });
						expect(parseClassicalRomanDate(withAuc)).toMatchObject({ year, month, day });
					}
				}
			}
		});
	});

	describe('Tempo.roman.parse / parseDate', () => {
		test('returns a Tempo instance', () => {
			const t = Tempo.roman.parse('a.d. XVII Kal. Nov. 2779 AUC');
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(16);
		});

		test('parseDate returns components', () => {
			expect(Tempo.roman.parseDate('Idibus Martiis 710 AUC')).toMatchObject({ year: -43, month: 3, day: 15 });
		});
	});
});
