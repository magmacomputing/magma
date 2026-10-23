
import { isLeapYear } from '@magmacomputing/tempo/library';
import {
	aucToYear,
	calculateClassicalRomanDate,
	calculateGregorianFromRoman,
	getIdesDay,
	getNonesDay,
	yearToAuc,
} from '../src/math.js';

describe('Roman Math & Classical Calendar Engine', () => {
	describe('Anchor Days (Nones & Ides)', () => {
		it('should place Nones on the 7th and Ides on the 15th for MOM-J months (March, October, May, July)', () => {
			for (const m of [3, 5, 7, 10]) {
				expect(getNonesDay(m)).toBe(7);
				expect(getIdesDay(m)).toBe(15);
			}
		});

		it('should place Nones on the 5th and Ides on the 13th for all other months', () => {
			for (const m of [1, 2, 4, 6, 8, 9, 11, 12]) {
				expect(getNonesDay(m)).toBe(5);
				expect(getIdesDay(m)).toBe(13);
			}
		});
	});

	describe('Leap Year Calculations', () => {
		it('should correctly evaluate Gregorian leap years', () => {
			expect(isLeapYear(2024)).toBe(true);
			expect(isLeapYear(2026)).toBe(false);
			expect(isLeapYear(2000)).toBe(true);
			expect(isLeapYear(1900)).toBe(false);
		});

		it('should evaluate Julian leap years (strictly every 4 years)', () => {
			expect(isLeapYear(1900, true)).toBe(true);
			expect(isLeapYear(44, true)).toBe(true);
			expect(isLeapYear(0, true)).toBe(true);
			expect(isLeapYear(-44, true)).toBe(true);
			expect(isLeapYear(2023, true)).toBe(false);
		});
	});

	describe('Ab Urbe Condita (AUC) Conversions', () => {
		it('converts Common Era years to AUC correctly', () => {
			expect(yearToAuc(2026)).toBe(2779);
			expect(yearToAuc(1)).toBe(754);
			expect(yearToAuc(14)).toBe(767); // Augustus died 14 CE
		});

		it('converts BCE years with era to AUC correctly', () => {
			expect(yearToAuc(44, 'BCE')).toBe(710); // Assassination of Caesar 44 BCE
			expect(yearToAuc(63, 'BCE')).toBe(691); // Consulship of Cicero 63 BCE
			expect(yearToAuc(753, 'BCE')).toBe(1); // Founding of Rome
			expect(yearToAuc(1, 'BCE')).toBe(753);
		});

		it('converts continuous astronomical years to AUC', () => {
			expect(yearToAuc(0)).toBe(753); // 1 BCE
			expect(yearToAuc(-43)).toBe(710); // 44 BCE
			expect(yearToAuc(-752)).toBe(1); // 753 BCE
		});

		it('converts AUC to astronomical and historical years', () => {
			expect(aucToYear(2779)).toBe(2026);
			expect(aucToYear(710)).toBe(-43); // 44 BCE in astronomical

			expect(aucToYear(2779, 'historical')).toEqual({ year: 2026, era: 'CE' });
			expect(aucToYear(710, 'historical')).toEqual({ year: 44, era: 'BCE' });
			expect(aucToYear(1, 'historical')).toEqual({ year: 753, era: 'BCE' });
			expect(aucToYear(754, 'historical')).toEqual({ year: 1, era: 'CE' });
		});
	});

	describe('Classical Date Calculations', () => {
		it('calculates Kalends (1st of the month) in Ablative', () => {
			const jan1 = calculateClassicalRomanDate(2026, 1, 1);
			expect(jan1.anchor).toBe('Kalends');
			expect(jan1.relation).toBe('on');
			expect(jan1.count).toBe(1);
			expect(jan1.latin).toBe('Kalendis Januariis');
			expect(jan1.shortLatin).toBe('Kal. Jan.');

			const mar1 = calculateClassicalRomanDate(2026, 3, 1);
			expect(mar1.latin).toBe('Kalendis Martiis');
			expect(mar1.shortLatin).toBe('Kal. Mart.');
		});

		it('calculates Nones on MOM-J (March 7) and non-MOM-J (January 5)', () => {
			const mar7 = calculateClassicalRomanDate(2026, 3, 7);
			expect(mar7.anchor).toBe('Nones');
			expect(mar7.relation).toBe('on');
			expect(mar7.latin).toBe('Nonis Martiis');
			expect(mar7.shortLatin).toBe('Non. Mart.');

			const jan5 = calculateClassicalRomanDate(2026, 1, 5);
			expect(jan5.anchor).toBe('Nones');
			expect(jan5.relation).toBe('on');
			expect(jan5.latin).toBe('Nonis Januariis');
			expect(jan5.shortLatin).toBe('Non. Jan.');
		});

		it('calculates Ides on MOM-J (March 15, October 15) and non-MOM-J (January 13)', () => {
			const idesMarch = calculateClassicalRomanDate(2026, 3, 15);
			expect(idesMarch.anchor).toBe('Ides');
			expect(idesMarch.relation).toBe('on');
			expect(idesMarch.latin).toBe('Idibus Martiis');
			expect(idesMarch.shortLatin).toBe('Id. Mart.');

			const idesOct = calculateClassicalRomanDate(2026, 10, 15);
			expect(idesOct.latin).toBe('Idibus Octobribus');
			expect(idesOct.shortLatin).toBe('Id. Oct.');

			const idesJan = calculateClassicalRomanDate(2026, 1, 13);
			expect(idesJan.latin).toBe('Idibus Januariis');
			expect(idesJan.shortLatin).toBe('Id. Jan.');
		});

		it('calculates Pridie (day before an anchor)', () => {
			// Day before March Nones (March 6)
			const mar6 = calculateClassicalRomanDate(2026, 3, 6);
			expect(mar6.relation).toBe('pridie');
			expect(mar6.count).toBe(2);
			expect(mar6.latin).toBe('Pridie Nonas Martias');
			expect(mar6.shortLatin).toBe('Prid. Non. Mart.');

			// Day before October Ides (October 14)
			const oct14 = calculateClassicalRomanDate(2026, 10, 14);
			expect(oct14.relation).toBe('pridie');
			expect(oct14.latin).toBe('Pridie Idus Octobres');
			expect(oct14.shortLatin).toBe('Prid. Id. Oct.');

			// Day before November Kalends (October 31)
			const oct31 = calculateClassicalRomanDate(2026, 10, 31);
			expect(oct31.anchor).toBe('Kalends');
			expect(oct31.anchorMonth).toBe(11);
			expect(oct31.relation).toBe('pridie');
			expect(oct31.latin).toBe('Pridie Kalendas Novembres');
			expect(oct31.shortLatin).toBe('Prid. Kal. Nov.');
		});

		it('calculates Ante Diem inclusive backward counting', () => {
			// October 16 -> a.d. XVII Kal. Nov. (31 - 16 + 2 = 17)
			const oct16 = calculateClassicalRomanDate(2026, 10, 16);
			expect(oct16.anchor).toBe('Kalends');
			expect(oct16.anchorMonth).toBe(11);
			expect(oct16.relation).toBe('ante_diem');
			expect(oct16.count).toBe(17);
			expect(oct16.romanNumeral).toBe('XVII');
			expect(oct16.latin).toBe('ante diem XVII Kalendas Novembres');
			expect(oct16.shortLatin).toBe('a.d. XVII Kal. Nov.');

			// March 12 -> a.d. IV Id. Mart. (15 - 12 + 1 = 4)
			const mar12 = calculateClassicalRomanDate(2026, 3, 12);
			expect(mar12.anchor).toBe('Ides');
			expect(mar12.relation).toBe('ante_diem');
			expect(mar12.count).toBe(4);
			expect(mar12.latin).toBe('ante diem IV Idus Martias');
			expect(mar12.shortLatin).toBe('a.d. IV Id. Mart.');
		});

		it('handles December dates past Ides rolling into January Kalends of the next year', () => {
			const dec25 = calculateClassicalRomanDate(2026, 12, 25);
			expect(dec25.anchor).toBe('Kalends');
			expect(dec25.anchorMonth).toBe(1);
			expect(dec25.anchorYear).toBe(2027);
			// 31 - 25 + 2 = 8
			expect(dec25.count).toBe(8);
			expect(dec25.latin).toBe('ante diem VIII Kalendas Januarias');
			expect(dec25.shortLatin).toBe('a.d. VIII Kal. Jan.');
		});
	});

	describe('Bissextile Leap Year Intercalation', () => {
		it('correctly intercalates February 24 in a leap year (a.d. bis VI Kal. Mart.)', () => {
			const feb24Leap = calculateClassicalRomanDate(2024, 2, 24);
			expect(feb24Leap.isBissextile).toBe(true);
			expect(feb24Leap.count).toBe(6);
			expect(feb24Leap.latin).toBe('ante diem bis sextum Kalendas Martias');
			expect(feb24Leap.shortLatin).toBe('a.d. bis VI Kal. Mart.');

			// Feb 25 in leap year is a.d. VI Kal. Mart.
			const feb25Leap = calculateClassicalRomanDate(2024, 2, 25);
			expect(feb25Leap.isBissextile).toBe(false);
			expect(feb25Leap.count).toBe(6);
			expect(feb25Leap.latin).toBe('ante diem VI Kalendas Martias');
			expect(feb25Leap.shortLatin).toBe('a.d. VI Kal. Mart.');

			// Feb 29 in leap year is Pridie Kalendas Martias
			const feb29Leap = calculateClassicalRomanDate(2024, 2, 29);
			expect(feb29Leap.relation).toBe('pridie');
			expect(feb29Leap.latin).toBe('Pridie Kalendas Martias');
		});

		it('treats February 24 in a non-leap year as regular a.d. VI Kal. Mart.', () => {
			const feb24NonLeap = calculateClassicalRomanDate(2026, 2, 24);
			expect(feb24NonLeap.isBissextile).toBe(false);
			expect(feb24NonLeap.count).toBe(6);
			expect(feb24NonLeap.latin).toBe('ante diem VI Kalendas Martias');
			expect(feb24NonLeap.shortLatin).toBe('a.d. VI Kal. Mart.');

			const feb28NonLeap = calculateClassicalRomanDate(2026, 2, 28);
			expect(feb28NonLeap.relation).toBe('pridie');
			expect(feb28NonLeap.latin).toBe('Pridie Kalendas Martias');
		});
	});

	describe('Full Year Round-Trip Invertibility', () => {
		it('losslessly round-trips every day of 2026 (non-leap year)', () => {
			const daysInMonths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
			for (let m = 1; m <= 12; m++) {
				for (let d = 1; d <= daysInMonths[m]!; d++) {
					const roman = calculateClassicalRomanDate(2026, m, d);
					const inverted = calculateGregorianFromRoman(
						roman.anchor,
						roman.anchorMonth,
						roman.anchorYear,
						roman.relation,
						roman.count,
						roman.isBissextile,
					);
					expect(inverted).toEqual({ year: 2026, month: m, day: d });
				}
			}
		});

		it('losslessly round-trips every day of 2024 (leap year with bissextile)', () => {
			const daysInMonths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
			for (let m = 1; m <= 12; m++) {
				for (let d = 1; d <= daysInMonths[m]!; d++) {
					const roman = calculateClassicalRomanDate(2024, m, d);
					const inverted = calculateGregorianFromRoman(
						roman.anchor,
						roman.anchorMonth,
						roman.anchorYear,
						roman.relation,
						roman.count,
						roman.isBissextile,
					);
					expect(inverted).toEqual({ year: 2024, month: m, day: d });
				}
			}
		});
	});
});
