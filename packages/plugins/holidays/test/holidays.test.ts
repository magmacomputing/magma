import { Tempo } from '@magmacomputing/tempo';
import { getStorage } from '../src/cache.js';
import {
	HolidaysPlugin,
	isPublicHoliday,
	isBusinessDay,
	getHolidayName,
	getYearHolidays,
	addBusinessDays,
	businessDaysBetween,
	workingHoursBetween,
	preloadHolidayCalendar,
} from '../src/index.js';
import { getEasterSunday, getGoodFriday, getEasterMonday } from '../src/computus.js';

vi.mock('@magmacomputing/tempo-fns', () => ({
	getPublicHolidays: vi.fn(async (year: number, country: string) => {
		if (country === 'IT') {
			return [
				{ date: `${year}-01-01`, name: "New Year's Day", localName: 'Capodanno', countryCode: 'IT', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
				{ date: `${year}-05-01`, name: 'Labour Day', localName: 'Festa del Lavoro', countryCode: 'IT', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
				{ date: `${year}-06-02`, name: 'Republic Day', localName: 'Festa della Repubblica', countryCode: 'IT', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
			];
		}
		if (country === 'BR') {
			return [
				{ date: `${year}-09-07`, name: 'Independence Day', localName: 'Dia da Independência', countryCode: 'BR', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
				{ date: `${year}-11-15`, name: 'Republic Proclamation Day', localName: 'Proclamação da República', countryCode: 'BR', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
			];
		}
		return [];
	}),
}));

// Auto-install plugin for OOP tests
Tempo.use(HolidaysPlugin);

describe('@magmacomputing/tempo-plugin-holidays', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(HolidaysPlugin);
	});

	describe('Easter Computus', () => {
		it('calculates Easter Sunday, Good Friday, and Easter Monday correctly', () => {
			// 2024: Easter is March 31
			expect(getEasterSunday(2024).dateStr).toBe('2024-03-31');
			expect(getGoodFriday(2024)).toBe('2024-03-29');
			expect(getEasterMonday(2024)).toBe('2024-04-01');

			// 2025: Easter is April 20
			expect(getEasterSunday(2025).dateStr).toBe('2025-04-20');
			expect(getGoodFriday(2025)).toBe('2025-04-18');
			expect(getEasterMonday(2025)).toBe('2025-04-21');

			// 2026: Easter is April 5
			expect(getEasterSunday(2026).dateStr).toBe('2026-04-05');
			expect(getGoodFriday(2026)).toBe('2026-04-03');
			expect(getEasterMonday(2026)).toBe('2026-04-06');
		});
	});

	describe('US Holiday Calendar', () => {
		it('recognizes US federal holidays and floating holidays', () => {
			// MLK Day 2026: 3rd Monday in Jan -> Jan 19, 2026
			const mlk = new Tempo('2026-01-19', { geo: { country: 'US' } });
			expect(mlk.holidays.isHoliday()).toBe(true);
			expect(mlk.holidays.name).toBe('Martin Luther King Jr. Day');
			expect(mlk.holidays.isBusinessDay()).toBe(false);

			// Memorial Day 2026: Last Monday in May -> May 25, 2026
			const mem = new Tempo('2026-05-25', { geo: { country: 'US' } });
			expect(mem.holidays.isHoliday()).toBe(true);
			expect(mem.holidays.name).toBe('Memorial Day');

			// Juneteenth 2026: June 19, 2026 (Friday)
			const june = new Tempo('2026-06-19', { geo: { country: 'US' } });
			expect(june.holidays.isHoliday()).toBe(true);
			expect(june.holidays.name).toBe('Juneteenth National Independence Day');

			// Independence Day 2026: July 4, 2026 (Saturday -> observed Friday July 3)
			const july4 = new Tempo('2026-07-04', { geo: { country: 'US' } });
			const july3Observed = new Tempo('2026-07-03', { geo: { country: 'US' } });
			expect(july4.holidays.isHoliday()).toBe(true);
			expect(july3Observed.holidays.isHoliday()).toBe(true);
			expect(july3Observed.holidays.name).toBe('Independence Day (Observed)');
			expect(july3Observed.holidays.isBusinessDay()).toBe(false);

			// Thanksgiving 2026: 4th Thursday in Nov -> Nov 26, 2026
			const tg = new Tempo('2026-11-26', { geo: { country: 'US' } });
			expect(tg.holidays.isHoliday()).toBe(true);
			expect(tg.holidays.name).toBe('Thanksgiving Day');
		});

		it('supports state-specific holiday overlays (e.g. Day After Thanksgiving in CA)', () => {
			const blackFriday = new Tempo('2026-11-27', { geo: { country: 'US', region: 'CA' } });
			expect(blackFriday.holidays.isHoliday()).toBe(true);
			expect(blackFriday.holidays.name).toBe('Day After Thanksgiving');
		});
	});

	describe('Australian Holiday Calendar', () => {
		it('recognizes Australian national and state holidays', () => {
			// Australia Day 2026: Jan 26, 2026 (Monday)
			const ausDay = new Tempo('2026-01-26', { geo: { country: 'AU' } });
			expect(ausDay.holidays.isHoliday()).toBe(true);
			expect(ausDay.holidays.name).toBe('Australia Day');
			expect(ausDay.holidays.country).toBe('AU');

			// ANZAC Day 2026: April 25, 2026 (Saturday)
			const anzac = new Tempo('2026-04-25', { geo: { country: 'AU' } });
			expect(anzac.holidays.isHoliday()).toBe(true);
			expect(anzac.holidays.name).toBe('ANZAC Day');

			// King's Birthday NSW (2nd Monday in June -> June 8, 2026)
			const kbNsw = new Tempo('2026-06-08', { geo: { country: 'AU', region: 'NSW' } });
			expect(kbNsw.holidays.isHoliday()).toBe(true);
			expect(kbNsw.holidays.name).toBe("King's Birthday");

			// King's Birthday QLD (1st Monday in October -> Oct 5, 2026)
			const kbQld = new Tempo('2026-10-05', { geo: { country: 'AU', region: 'QLD' } });
			expect(kbQld.holidays.isHoliday()).toBe(true);
			expect(kbQld.holidays.name).toBe("King's Birthday");

			// Melbourne Cup VIC (1st Tuesday in Nov -> Nov 3, 2026)
			const melbCup = new Tempo('2026-11-03', { geo: { country: 'AU', region: 'VIC' } });
			expect(melbCup.holidays.isHoliday()).toBe(true);
			expect(melbCup.holidays.name).toBe('Melbourne Cup Day');

			// Melbourne Cup is NOT a holiday in NSW
			const nswNov3 = new Tempo('2026-11-03', { geo: { country: 'AU', region: 'NSW' } });
			expect(nswNov3.holidays.isHoliday()).toBe(false);
		});

		it('handles Australian Christmas & Boxing Day weekend shifts', () => {
			// 2026: Dec 25 is Friday, Dec 26 is Saturday -> Dec 28 (Monday) is Boxing Day (Observed)
			const boxingObserved = new Tempo('2026-12-28', { geo: { country: 'AU' } });
			expect(boxingObserved.holidays.isHoliday()).toBe(true);
			expect(boxingObserved.holidays.name).toBe('Boxing Day (Observed)');
		});
	});

	describe('UK Holiday Calendar', () => {
		it('recognizes Great Britain bank holidays', () => {
			// Early May Bank Holiday 2026: May 4, 2026
			const earlyMay = new Tempo('2026-05-04', { geo: { country: 'GB' } });
			expect(earlyMay.holidays.isHoliday()).toBe(true);
			expect(earlyMay.holidays.name).toBe('Early May Bank Holiday');

			// Spring Bank Holiday 2026: May 25, 2026
			const spring = new Tempo('2026-05-25', { geo: { country: 'GB' } });
			expect(spring.holidays.isHoliday()).toBe(true);
			expect(spring.holidays.name).toBe('Spring Bank Holiday');

			// Summer Bank Holiday (England: Last Monday in August -> Aug 31, 2026)
			const summerEng = new Tempo('2026-08-31', { geo: { country: 'GB' } });
			expect(summerEng.holidays.isHoliday()).toBe(true);
			expect(summerEng.holidays.name).toBe('Summer Bank Holiday');

			// Summer Bank Holiday (Scotland: 1st Monday in August -> Aug 3, 2026)
			const summerScot = new Tempo('2026-08-03', { geo: { country: 'GB', region: 'SCT' } });
			expect(summerScot.holidays.isHoliday()).toBe(true);
			expect(summerScot.holidays.name).toBe('Summer Bank Holiday');
		});
	});

	describe('Canada, Germany, France, Japan, New Zealand Calendars', () => {
		it('recognizes Canada holidays', () => {
			const canadaDay = new Tempo('2026-07-01', { geo: { country: 'CA' } });
			expect(canadaDay.holidays.isHoliday()).toBe(true);
			expect(canadaDay.holidays.name).toBe('Canada Day');

			const thanksgiving = new Tempo('2026-10-12', { geo: { country: 'CA' } });
			expect(thanksgiving.holidays.isHoliday()).toBe(true);
			expect(thanksgiving.holidays.name).toBe('Thanksgiving');
		});

		it('recognizes Germany German Unity Day and Reformation Day', () => {
			const unityDay = new Tempo('2026-10-03', { geo: { country: 'DE' } });
			expect(unityDay.holidays.isHoliday()).toBe(true);
			expect(unityDay.holidays.name).toBe('German Unity Day');

			const refDay = new Tempo('2026-10-31', { geo: { country: 'DE', region: 'BB' } });
			expect(refDay.holidays.isHoliday()).toBe(true);
			expect(refDay.holidays.name).toBe('Reformation Day');
		});

		it('recognizes France Bastille Day and Armistice', () => {
			const bastille = new Tempo('2026-07-14', { geo: { country: 'FR' } });
			expect(bastille.holidays.isHoliday()).toBe(true);
			expect(bastille.holidays.name).toBe('Bastille Day');

			const armistice = new Tempo('2026-11-11', { geo: { country: 'FR' } });
			expect(armistice.holidays.isHoliday()).toBe(true);
			expect(armistice.holidays.name).toBe('Armistice Day');
		});

		it('recognizes Japan Golden Week and Mountain Day', () => {
			const constitution = new Tempo('2026-05-03', { geo: { country: 'JP' } });
			expect(constitution.holidays.isHoliday()).toBe(true);
			expect(constitution.holidays.name).toBe('Constitution Memorial Day');

			const mtnDay = new Tempo('2026-08-11', { geo: { country: 'JP' } });
			expect(mtnDay.holidays.isHoliday()).toBe(true);
			expect(mtnDay.holidays.name).toBe('Mountain Day');
		});

		it('recognizes New Zealand Matariki and Waitangi Day', () => {
			const waitangi = new Tempo('2026-02-06', { geo: { country: 'NZ' } });
			expect(waitangi.holidays.isHoliday()).toBe(true);
			expect(waitangi.holidays.name).toBe('Waitangi Day');

			// Matariki 2026 is July 10
			const matariki = new Tempo('2026-07-10', { geo: { country: 'NZ' } });
			expect(matariki.holidays.isHoliday()).toBe(true);
			expect(matariki.holidays.name).toBe('Matariki');
		});
	});

	describe('Business Day Arithmetic & Operations', () => {
		it('skips weekends and holidays with nextBusinessDay and prevBusinessDay', () => {
			// In US, July 3, 2026 (Friday) is Independence Day (Observed)
			// July 4 is Saturday, July 5 is Sunday
			// Next business day from Thursday July 2 should be Monday July 6
			const thuJuly2 = new Tempo('2026-07-02', { geo: { country: 'US' } });
			const nextB = thuJuly2.holidays.nextBusinessDay();
			expect(nextB.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-06');
			expect(nextB.holidays.isBusinessDay()).toBe(true);

			// Prev business day from Monday July 6 should be Thursday July 2
			const monJuly6 = new Tempo('2026-07-06', { geo: { country: 'US' } });
			const prevB = monJuly6.holidays.prevBusinessDay();
			expect(prevB.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-02');
		});

		it('adds business days accurately with addBusinessDays', () => {
			// Start Thursday July 2, 2026 (US).
			// Day 1: Mon July 6
			// Day 2: Tue July 7
			// Day 3: Wed July 8
			const start = new Tempo('2026-07-02', { geo: { country: 'US' } });
			const result = start.holidays.addBusinessDays(3);
			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-08');

			// Subtract 3 business days from July 8 -> July 2
			expect(result.holidays.addBusinessDays(-3).format('{yyyy}-{mm}-{dd}')).toBe('2026-07-02');
		});

		it('calculates business days between two dates with businessDaysUntil', () => {
			const start = new Tempo('2026-07-02', { geo: { country: 'US' } });
			const end = new Tempo('2026-07-08', { geo: { country: 'US' } });

			// Between July 2 (Thu) and July 8 (Wed):
			// Included days: July 6 (Mon), July 7 (Tue), July 8 (Wed) -> 3 business days
			expect(start.holidays.businessDaysUntil(end)).toBe(3);
			expect(end.holidays.businessDaysUntil(start)).toBe(-3);
		});

		it('supports custom holidays in options', () => {
			const regularDay = new Tempo('2026-05-13', { geo: { country: 'US' } });
			expect(regularDay.holidays.isBusinessDay()).toBe(true);

			// With custom holiday on May 13
			expect(regularDay.holidays.isBusinessDay({ customHolidays: ['2026-05-13'] })).toBe(false);
			expect(regularDay.holidays.isHoliday({ customHolidays: ['2026-05-13'] })).toBe(true);
		});

		it('respects cultural locale weekend days via tempo.intl.weekend', () => {
			// In Saudi Arabia (ar-SA), weekend is Friday (5) and Saturday (6); Sunday (7) is a business day
			// 2026-05-15 is Friday (dow = 5)
			// 2026-05-17 is Sunday (dow = 7)
			const friSA = new Tempo('2026-05-15', { locale: 'ar-SA', geo: { country: 'SA' } });
			const sunSA = new Tempo('2026-05-17', { locale: 'ar-SA', geo: { country: 'SA' } });

			expect(friSA.holidays.isBusinessDay()).toBe(false); // Friday is weekend in SA
			expect(sunSA.holidays.isBusinessDay()).toBe(true);  // Sunday is a working day in SA
		});

		it('calculates SLA working hours excluding weekends and holidays with workingHoursUntil', () => {
			// Friday Jan 23, 2026 at 15:00 to Tuesday Jan 27, 2026 at 11:00 in AU
			// Jan 23 (Fri): 15:00 - 17:00 = 2 hours
			// Jan 24 (Sat): Weekend = 0 hours
			// Jan 25 (Sun): Weekend = 0 hours
			// Jan 26 (Mon): Australia Day (AU public holiday) = 0 hours
			// Jan 27 (Tue): 09:00 - 11:00 = 2 hours
			// Total = 4.0 hours
			const start = new Tempo('2026-01-23 15:00:00', { geo: { country: 'AU' } });
			const deadline = new Tempo('2026-01-27 11:00:00', { geo: { country: 'AU' } });

			const hours = start.holidays.workingHoursUntil(deadline);
			expect(hours).toBe(4);

			// Reverse direction returns negative
			expect(deadline.holidays.workingHoursUntil(start)).toBe(-4);

			// Custom work hour boundaries (8am to 4pm -> 8:00 to 16:00)
			// Jan 23: 15:00 - 16:00 = 1 hour
			// Jan 27: 08:00 - 11:00 = 3 hours
			// Total = 4.0 hours
			const customHours = start.holidays.workingHoursUntil(deadline, { startHour: 8, endHour: 16 });
			expect(customHours).toBe(4);

			// Pure function workingHoursBetween
			expect(workingHoursBetween(start, deadline)).toBe(4);
		});
	});

	describe('Resolution & Fallback Hierarchy (Milestone 2)', () => {
		it('prioritizes explicit options.country over tempo.geo.country', () => {
			// Date: 2026-01-26 is Australia Day in AU, but not a holiday in US
			const ausTempo = new Tempo('2026-01-26', { geo: { country: 'AU' } });
			expect(ausTempo.holidays.isHoliday()).toBe(true);
			expect(ausTempo.holidays.name).toBe('Australia Day');

			// Override with US
			expect(ausTempo.holidays.isHoliday({ country: 'US' })).toBe(false);
		});

		it('prioritizes tempo.geo.country over tempo.locale', () => {
			// Instance with locale 'en-US' but geo 'AU'
			const t = new Tempo('2026-01-26', { locale: 'en-US', geo: { country: 'AU' } });
			expect(t.holidays.isHoliday()).toBe(true);
			expect(t.holidays.name).toBe('Australia Day');
		});

		it('resolves country from tempo.locale when geo is omitted', () => {
			// 'en-AU' -> AU
			const ausLocale = new Tempo('2026-01-26', { locale: 'en-AU' });
			expect(ausLocale.holidays.isHoliday()).toBe(true);
			expect(ausLocale.holidays.name).toBe('Australia Day');

			// 'en-GB' -> GB (Early May Bank Holiday May 4, 2026)
			const gbLocale = new Tempo('2026-05-04', { locale: 'en-GB' });
			expect(gbLocale.holidays.isHoliday()).toBe(true);
			expect(gbLocale.holidays.name).toBe('Early May Bank Holiday');

			// 'ja-JP' -> JP (Mountain Day Aug 11, 2026)
			const jpLocale = new Tempo('2026-08-11', { locale: 'ja-JP' });
			expect(jpLocale.holidays.isHoliday()).toBe(true);
			expect(jpLocale.holidays.name).toBe('Mountain Day');
		});

		it('falls back to US when neither geo nor locale region is provided', () => {
			// Jan 19, 2026 is MLK Day in US when locale has no region tag (e.g. 'en')
			const nonRegionalTempo = new Tempo('2026-01-19', { locale: 'en' });
			expect(nonRegionalTempo.holidays.isHoliday()).toBe(true);
			expect(nonRegionalTempo.holidays.name).toBe('Martin Luther King Jr. Day');

			// Also pure function fallback when no options provided
			const tIso = new Tempo('2026-01-19');
			expect(isPublicHoliday(tIso, { country: 'US' })).toBe(true);
		});

		it('normalizes ISO-3166 alpha-3 codes and common aliases', () => {
			// 'AUS' -> 'AU'
			const t1 = new Tempo('2026-01-26', { geo: { country: 'AUS' } });
			expect(t1.holidays.isHoliday()).toBe(true);
			expect(t1.holidays.country).toBe('AU');

			// 'GBR' / 'UK' -> 'GB'
			const t2 = new Tempo('2026-05-04', { geo: { country: 'UK' } });
			expect(t2.holidays.isHoliday()).toBe(true);
			expect(t2.holidays.country).toBe('GB');

			const t3 = new Tempo('2026-05-04', { geo: { country: 'GBR' } });
			expect(t3.holidays.isHoliday()).toBe(true);
			expect(t3.holidays.country).toBe('GB');

			// 'USA' -> 'US'
			const t4 = new Tempo('2026-07-04', { geo: { country: 'USA' } });
			expect(t4.holidays.isHoliday()).toBe(true);
			expect(t4.holidays.country).toBe('US');

			// Whitespace & case insensitivity
			expect(isPublicHoliday(new Tempo('2026-01-26'), { country: ' aus ' })).toBe(true);
		});

		it('resolves region and strips ISO 3166-2 prefix correctly', () => {
			// Melbourne Cup VIC (Nov 3, 2026)
			const vic1 = new Tempo('2026-11-03', { geo: { country: 'AU', region: 'AU-VIC' } });
			expect(vic1.holidays.isHoliday()).toBe(true);
			expect(vic1.holidays.name).toBe('Melbourne Cup Day');

			// State alias
			const vic2 = new Tempo('2026-11-03', { geo: { country: 'AU', state: 'VIC' } });
			expect(vic2.holidays.isHoliday()).toBe(true);
			expect(vic2.holidays.name).toBe('Melbourne Cup Day');

			// California Black Friday (Nov 27, 2026)
			const ca = new Tempo('2026-11-27', { geo: { country: 'US', region: 'US-CA' } });
			expect(ca.holidays.isHoliday()).toBe(true);
			expect(ca.holidays.name).toBe('Day After Thanksgiving');
		});
	});

	describe('Dynamic Async Preloading & Storage Caching (Milestone 3)', () => {
		it('preloads and storage-caches built-in calendars', async () => {
			const items = await preloadHolidayCalendar(2026, 'AU');
			expect(items.length).toBeGreaterThan(5);

			// Verify cached in runtime storage
			const stored = getStorage<typeof items>('_magma_holidays_2026_AU');
			expect(stored).toBeDefined();
			expect(stored!.length).toBe(items.length);
		});

		it('preloads long-tail country calendars and enables synchronous evaluation', async () => {
			// Preload Italy (IT)
			const items = await preloadHolidayCalendar(2026, 'IT');
			expect(Array.isArray(items)).toBe(true);
			expect(items.length).toBeGreaterThan(0);

			// Verify storage cache
			const stored = getStorage<typeof items>('_magma_holidays_2026_IT');
			expect(stored).toBeDefined();

			// Test synchronous zero-latency recognition for Jan 1 (Capodanno) and May 1 (Festa del Lavoro) in IT
			const capodanno = new Tempo('2026-01-01', { geo: { country: 'IT' } });
			expect(capodanno.holidays.isHoliday()).toBe(true);
			expect(capodanno.holidays.isBusinessDay()).toBe(false);

			const mayDay = new Tempo('2026-05-01', { geo: { country: 'IT' } });
			expect(mayDay.holidays.isHoliday()).toBe(true);
			expect(mayDay.holidays.isBusinessDay()).toBe(false);
		});

		it('supports instance method t.holidays.preload() using instance geo metadata', async () => {
			const tempoBrazil = new Tempo('2026-09-07', { geo: { country: 'BR' } });
			const items = await tempoBrazil.holidays.preload();
			expect(items.length).toBeGreaterThan(0);

			// Sept 7 is Brazilian Independence Day
			expect(tempoBrazil.holidays.isHoliday()).toBe(true);
			expect(tempoBrazil.holidays.isBusinessDay()).toBe(false);
		});
	});

	describe('Static Tempo.holidays Namespace', () => {
		it('provides access to all holiday functions on Tempo.holidays', async () => {
			expect(typeof Tempo.holidays.preload).toBe('function');
			expect(typeof Tempo.holidays.isPublicHoliday).toBe('function');
			expect(typeof Tempo.holidays.isBusinessDay).toBe('function');
			expect(typeof Tempo.holidays.getYearHolidays).toBe('function');
			expect(typeof Tempo.holidays.workingHoursBetween).toBe('function');

			const t = new Tempo('2026-12-25', { geo: { country: 'US' } });
			expect(Tempo.holidays.isPublicHoliday(t)).toBe(true);
			expect(Tempo.holidays.getHolidayName(t)).toBe('Christmas Day');
		});
	});

	describe('Functional Tree-Shakeable API', () => {
		it('works directly with pure functions', () => {
			const t = new Tempo('2026-12-25');
			expect(isPublicHoliday(t, { country: 'US' })).toBe(true);
			expect(getHolidayName(t, { country: 'US' })).toBe('Christmas Day');
			expect(isBusinessDay(t, { country: 'US' })).toBe(false);

			const list = getYearHolidays(2026, { country: 'US' });
			expect(list.length).toBeGreaterThan(10);

			const plusFive = addBusinessDays(new Tempo('2026-01-01', { geo: { country: 'US' } }), 5);
			expect(isBusinessDay(plusFive, { country: 'US' })).toBe(true);
		});
	});
});
