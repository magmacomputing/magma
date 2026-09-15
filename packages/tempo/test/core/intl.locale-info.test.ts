import { Tempo } from '#tempo';

describe('Intl.LocaleInfo & Regional Calendar Integration', () => {
	beforeEach(() => {
		Tempo.init();
	});

	describe('1. Locale Week Boundaries (t.set({ week: ... }))', () => {
		// 2026-09-16 is a Wednesday (ISO dow = 3)
		// 2026-09-13 is Sunday (ISO dow = 7)
		// 2026-09-14 is Monday (ISO dow = 1)
		// 2026-09-19 is Saturday (ISO dow = 6)
		// 2026-09-20 is Sunday (ISO dow = 7)

		it('defaults to ISO Monday start when localeInfo is false (default baseline)', () => {
			const t = new Tempo('2026-09-16T15:30:00Z', { locale: 'en-US' }); // localeInfo defaults to false
			expect(t.intl.firstDay).toBe(7); // inspectable as Sunday

			const weekStart = t.set({ week: 'start' });
			expect(weekStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-14 00:00:00');
			expect(weekStart.dow).toBe(1); // Monday

			const weekMid = t.set({ week: 'mid' });
			expect(weekMid.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-17 00:00:00');
			expect(weekMid.dow).toBe(4); // Thursday

			const weekEnd = t.set({ week: 'end' });
			expect(weekEnd.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-20 23:59:59');
			expect(weekEnd.dow).toBe(7); // Sunday
		});

		it('adapts week boundaries to Sunday-start for en-US when localeInfo: true', () => {
			const t = new Tempo('2026-09-16T15:30:00Z', { locale: 'en-US', localeInfo: true });

			const weekStart = t.set({ week: 'start' });
			expect(weekStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-13 00:00:00');
			expect(weekStart.dow).toBe(7); // Sunday

			const weekMid = t.set({ week: 'mid' });
			expect(weekMid.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-16 00:00:00');
			expect(weekMid.dow).toBe(3); // Wednesday (firstDay + 3 days)

			const weekEnd = t.set({ week: 'end' });
			expect(weekEnd.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-19 23:59:59');
			expect(weekEnd.dow).toBe(6); // Saturday
		});

		it('behaves with ISO Monday start for en-GB when localeInfo: true', () => {
			const t = new Tempo('2026-09-16T15:30:00Z', { locale: 'en-GB', localeInfo: true });
			expect(t.intl.firstDay).toBe(1); // Monday

			const weekStart = t.set({ week: 'start' });
			expect(weekStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-14 00:00:00');
			expect(weekStart.dow).toBe(1);

			const weekEnd = t.set({ week: 'end' });
			expect(weekEnd.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-20 23:59:59');
			expect(weekEnd.dow).toBe(7);
		});

		it('adapts week boundaries for Saturday-first regions (ar-SA) when localeInfo: true', () => {
			const t = new Tempo('2026-09-16T15:30:00Z', { locale: 'ar-SA', localeInfo: true });
			const fd = t.intl.firstDay; // 6 (Saturday) or 7 (Sunday) depending on ICU

			const weekStart = t.set({ week: 'start' });
			expect(weekStart.dow).toBe(fd);
		});
	});

	describe('2. Dedicated ISO Invariance (isoWeek, wy)', () => {
		it('preserves mathematical ISO invariants regardless of localeInfo', () => {
			const tBaseline = new Tempo('2026-09-13T10:00:00Z', { locale: 'en-US', localeInfo: false });
			const tCultural = new Tempo('2026-09-13T10:00:00Z', { locale: 'en-US', localeInfo: true });

			// dow is ALWAYS ISO (1=Mon ... 7=Sun)
			expect(tBaseline.dow).toBe(7);
			expect(tCultural.dow).toBe(7);

			// wy is ALWAYS ISO week number
			expect(tBaseline.wy).toBe(tCultural.wy);
			expect(tBaseline.iso).toBe(tCultural.iso);
		});

		it('t.set({ isoWeek: "start" }) and t.set({ wy: "start" }) always snap to Monday', () => {
			const t = new Tempo('2026-09-16T15:30:00Z', { locale: 'en-US', localeInfo: true });

			const isoStart = t.set({ isoWeek: 'start' });
			expect(isoStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-14 00:00:00');
			expect(isoStart.dow).toBe(1); // Always Monday

			const wyStart = t.set({ wy: 'start' });
			expect(wyStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-14 00:00:00');
			expect(wyStart.dow).toBe(1); // Always Monday

			const isoMid = t.set({ isoWeek: 'mid' });
			expect(isoMid.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-17 00:00:00');
			expect(isoMid.dow).toBe(4); // Thursday

			const isoEnd = t.set({ isoWeek: 'end' });
			expect(isoEnd.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-20 23:59:59');
			expect(isoEnd.dow).toBe(7);

			const wyEnd = t.set({ wy: 'end' });
			expect(wyEnd.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-09-20 23:59:59');
			expect(wyEnd.dow).toBe(7);
		});

		it('t.set({ isoWeek: number }) and t.set({ wy: number }) assign numeric ISO weeks across year boundaries', () => {
			const t = new Tempo('2026-05-20T12:00:00Z'); // Wednesday of week 21, 2026
			expect(t.wy).toBe(21);
			expect(t.dow).toBe(3);

			const tSetIso = t.set({ isoWeek: 10 });
			expect(tSetIso.wy).toBe(10);
			expect(tSetIso.dow).toBe(3); // Preserves weekday
			expect(tSetIso.yw).toBe(2026);

			const tSetWy = t.set({ wy: 35 });
			expect(tSetWy.wy).toBe(35);
			expect(tSetWy.dow).toBe(3);
			expect(tSetWy.yw).toBe(2026);

			const tSetLowercase = t.set({ isoweek: 5 });
			expect(tSetLowercase.wy).toBe(5);
			expect(tSetLowercase.dow).toBe(3);
			expect(tSetLowercase.yw).toBe(2026);

			// Across year boundary: 2025-12-30 is Tuesday of week 1 of 2026
			const tBoundary = new Tempo('2025-12-30T10:00:00Z');
			expect(tBoundary.yw).toBe(2026);
			expect(tBoundary.wy).toBe(1);
			const tTarget = tBoundary.set({ isoWeek: 25 });
			expect(tTarget.yw).toBe(2026);
			expect(tTarget.wy).toBe(25);
			expect(tTarget.dow).toBe(2);

			// Clamping to maxWeeks within the ISO year (2024 has 52 ISO weeks)
			const t2024 = new Tempo('2024-06-12T12:00:00Z');
			const tClamped = t2024.set({ isoWeek: 53 });
			expect(tClamped.yw).toBe(2024);
			expect(tClamped.wy).toBe(52);

			// Preserves add:isoweek and subtract:isoweek as week-unit addition
			const tAdd = t.add({ isoweek: 2 });
			expect(tAdd.wy).toBe(23);
			const tSub = t.subtract({ isoweek: 3 });
			expect(tSub.wy).toBe(18);
		});

		it('t.set({ yw: number }), t.set({ isoYear: number }) assign ISO week-numbering year preserving wy, dow and time', () => {
			// 2026-05-20T14:30:15Z is Wednesday (dow: 3) of week 21, ISO year 2026
			const t = new Tempo('2026-05-20T14:30:15Z');
			expect(t.yw).toBe(2026);
			expect(t.wy).toBe(21);
			expect(t.dow).toBe(3);

			// Shift to ISO year 2028
			const t2028 = t.set({ yw: 2028 });
			expect(t2028.yw).toBe(2028);
			expect(t2028.wy).toBe(21);
			expect(t2028.dow).toBe(3);
			expect(t2028.format('{hh}:{mi}:{ss}')).toBe('14:30:15');

			// Alias isoYear
			const tIsoYear = t.set({ isoYear: 2029 });
			expect(tIsoYear.yw).toBe(2029);
			expect(tIsoYear.wy).toBe(21);
			expect(tIsoYear.dow).toBe(3);

			// Alias isoyear
			const tIsoyearLower = t.set({ isoyear: 2030 });
			expect(tIsoyearLower.yw).toBe(2030);
			expect(tIsoyearLower.wy).toBe(21);
			expect(tIsoyearLower.dow).toBe(3);

			// Clamping: 2020 has 53 ISO weeks; 2020-12-30 is Wednesday of week 53
			const tWeek53 = new Tempo('2020-12-30T10:00:00Z');
			expect(tWeek53.yw).toBe(2020);
			expect(tWeek53.wy).toBe(53);
			expect(tWeek53.dow).toBe(3);

			// 2021 only has 52 ISO weeks -> clamps to week 52, preserves dow: 3
			const tClampedYear = tWeek53.set({ yw: 2021 });
			expect(tClampedYear.yw).toBe(2021);
			expect(tClampedYear.wy).toBe(52);
			expect(tClampedYear.dow).toBe(3);

			// add:yw and subtract:yw
			const tNextYw = t.add({ yw: 2 });
			expect(tNextYw.yw).toBe(2028);
			expect(tNextYw.wy).toBe(21);
			expect(tNextYw.dow).toBe(3);

			const tPrevYw = t.subtract({ yw: 1 });
			expect(tPrevYw.yw).toBe(2025);
			expect(tPrevYw.wy).toBe(21);
			expect(tPrevYw.dow).toBe(3);
		});

		it('t.set({ yw: "start" | "mid" | "end" }) and aliases correctly snap to ISO year boundaries', () => {
			const t = new Tempo('2026-05-20T14:30:15Z'); // ISO year 2026

			// start:yw -> Monday of Week 1 at 00:00:00
			const startYw = t.set({ yw: 'start' });
			expect(startYw.yw).toBe(2026);
			expect(startYw.wy).toBe(1);
			expect(startYw.dow).toBe(1);
			expect(startYw.format('{hh}:{mi}:{ss}')).toBe('00:00:00');

			// Shorthand start: 'yw' and start: 'isoYear'
			const startShorthand = t.set({ start: 'yw' });
			expect(startShorthand.iso).toBe(startYw.iso);

			const startIsoYear = t.set({ start: 'isoYear' });
			expect(startIsoYear.iso).toBe(startYw.iso);

			// mid:yw -> Thursday of Week 26 at 00:00:00
			const midYw = t.set({ yw: 'mid' });
			expect(midYw.yw).toBe(2026);
			expect(midYw.wy).toBe(26);
			expect(midYw.dow).toBe(4);
			expect(midYw.format('{hh}:{mi}:{ss}')).toBe('00:00:00');

			const midShorthand = t.set({ mid: 'yw' });
			expect(midShorthand.iso).toBe(midYw.iso);

			// end:yw -> Sunday of last week (Week 53 for 2026) at 23:59:59
			const endYw = t.set({ yw: 'end' });
			expect(endYw.yw).toBe(2026);
			expect(endYw.wy).toBe(53);
			expect(endYw.dow).toBe(7);
			expect(endYw.format('{hh}:{mi}:{ss}')).toBe('23:59:59');
			expect(endYw.format('{yyyy}-{mm}-{dd}')).toBe('2027-01-03');

			const endShorthand = t.set({ end: 'yw' });
			expect(endShorthand.iso).toBe(endYw.iso);

			// end:yw for a 52-week year (2025) ends on Sunday of Week 52
			const t2025 = new Tempo('2025-06-15T12:00:00Z');
			const end2025 = t2025.set({ yw: 'end' });
			expect(end2025.yw).toBe(2025);
			expect(end2025.wy).toBe(52);
			expect(end2025.dow).toBe(7);
			expect(end2025.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2025-12-28 23:59:59');

			// end:yw for a 53-week year (2020) ends on Sunday of Week 53
			const t2020 = new Tempo('2020-06-15T12:00:00Z');
			const end2020 = t2020.set({ yw: 'end' });
			expect(end2020.yw).toBe(2020);
			expect(end2020.wy).toBe(53);
			expect(end2020.dow).toBe(7);
			expect(end2020.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2021-01-03 23:59:59');
		});
	});

	describe('3. Reference Stability, Region/Script & Zero Per-Instance Allocation', () => {
		it('shares the exact frozen singleton across instances with the same locale', () => {
			const t1 = new Tempo('2026-01-01', { locale: 'en-US' });
			const t2 = new Tempo('2026-06-01', { locale: 'en-US' });
			expect(t1.intl).toBe(t2.intl);
			expect(Object.isFrozen(t1.intl)).toBe(true);
		});

		it('provides correct locale information properties on t.intl', () => {
			const tUS = new Tempo('2026-01-01', { locale: 'en-US' });
			expect(tUS.intl.firstDay).toBe(7);
			expect(tUS.intl.weekend).toEqual([6, 7]);
			expect(tUS.intl.region).toBe('US');
			expect(tUS.intl.script).toBe('Latn');
			expect(tUS.intl.direction).toBe('ltr');

			const tAU = new Tempo('2026-01-01', { locale: 'en-AU' });
			expect(tAU.intl.region).toBe('AU');
			expect(tAU.intl.script).toBe('Latn');

			const tAR = new Tempo('2026-01-01', { locale: 'ar-SA' });
			expect(tAR.intl.region).toBe('SA');
			expect(tAR.intl.script).toBe('Arab');
			expect(tAR.intl.direction).toBe('rtl');
		});

		it('exposes Tempo.intl statically matching the global locale', () => {
			expect(Tempo.intl).toBeDefined();
			expect(Tempo.intl).toBe(new Tempo('2026-01-01', { locale: Tempo.config.locale }).intl);
			expect(typeof Tempo.intl.firstDay).toBe('number');
			expect(Array.isArray(Tempo.intl.weekend)).toBe(true);
			expect(typeof Tempo.intl.region).toBe('string');
			expect(typeof Tempo.intl.script).toBe('string');
		});

		it('resolves subclass static intl for sandboxes created with Tempo.create()', () => {
			const ArabicTempo = Tempo.create({ locale: 'ar-SA' });
			expect(ArabicTempo.intl.region).toBe('SA');
			expect(ArabicTempo.intl.script).toBe('Arab');
			expect(ArabicTempo.intl.direction).toBe('rtl');
			expect(ArabicTempo.intl).toBe(new ArabicTempo('2026-01-01').intl);
		});
	});

	describe('4. Hour Cycle Adaptation ({hh:locale})', () => {
		it('adapts {hh:locale} to 12-hour in h12 regions and 24-hour in h23 regions', () => {
			// 15:30:00 (3:30 PM)
			const tUS = new Tempo('2026-09-15T15:30:00Z', { locale: 'en-US' });
			const tFR = new Tempo('2026-09-15T15:30:00Z', { locale: 'fr-FR' });

			// en-US defaults to h12 -> '03'
			expect(tUS.format('{hh:locale}')).toBe('03');
			// fr-FR defaults to h23 -> '15'
			expect(tFR.format('{hh:locale}')).toBe('15');

			// Standard {hh} strictly maintains 24h ISO invariant regardless of locale
			expect(tUS.format('{hh}')).toBe('15');
			expect(tFR.format('{hh}')).toBe('15');
		});

		it('supports unpadded hours via composable {hh:locale:raw}', () => {
			const tUS = new Tempo('2026-09-15T15:30:00Z', { locale: 'en-US' });
			expect(tUS.format('{hh:locale:raw}')).toBe('3');
		});

		it('does not append an uninvited meridiem to {hh:locale}', () => {
			const tUS = new Tempo('2026-09-15T15:30:00Z', { locale: 'en-US' });
			expect(tUS.format('{hh:locale}:{mi}')).toBe('03:30');
		});
	});

	describe('5. Compound {time} and {time:locale}', () => {
		it('formats complete localized time with meridiem in h12 regions and 24h in h23 regions', () => {
			const tUS = new Tempo('2026-09-15T15:30:45Z', { locale: 'en-US' });
			const tFR = new Tempo('2026-09-15T15:30:45Z', { locale: 'fr-FR' });

			// In en-US, {time:locale} formats as 12-hour with meridiem
			expect(tUS.format('{time:locale}')).toMatch(/^03:30:45\s+(pm|PM)$/i);

			// In fr-FR, {time:locale} formats as clean 24-hour time
			expect(tFR.format('{time:locale}')).toBe('15:30:45');

			// Base {time} strictly yields ISO 24h
			expect(tUS.format('{time}')).toBe('15:30:45');
		});
	});

	describe('6. Numbering Systems Transliteration', () => {
		it('transliterates digits when :locale is applied in non-latn locales', () => {
			const tEG = new Tempo('2026-10-24T15:30:00Z', { locale: 'ar-EG' });

			expect(tEG.intl.numberingSystem).toBe('arab');
			expect(tEG.format('{yyyy:locale}')).toBe('٢٠٢٦');
			expect(tEG.format('{mm:locale}')).toBe('١٠');
			expect(tEG.format('{dd:locale}')).toBe('٢٤');
			expect(tEG.format('{yyyy:locale}-{mm:locale}-{dd:locale}')).toBe('٢٠٢٦-١٠-٢٤');
		});

		it('preserves strict ASCII digits for base tokens without :locale (machine safety)', () => {
			const tEG = new Tempo('2026-10-24T15:30:00Z', { locale: 'ar-EG' });
			expect(tEG.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');
			expect(tEG.format('{hh}:{mi}:{ss}')).toBe('15:30:00');
		});
	});

	describe('7. BiDi Directionality & Isolation', () => {
		it('wraps localized RTL text tokens with Unicode BiDi isolates', () => {
			const tEG = new Tempo('2026-10-24T15:30:00Z', { locale: 'ar-EG' });
			expect(tEG.intl.direction).toBe('rtl');

			const formatted = tEG.format('{mon:locale}');
			expect(formatted.startsWith('\u2067')).toBe(true);
			expect(formatted.endsWith('\u2069')).toBe(true);
		});

		it('does not wrap LTR text tokens with BiDi isolates', () => {
			const tUS = new Tempo('2026-10-24T15:30:00Z', { locale: 'en-US' });
			expect(tUS.intl.direction).toBe('ltr');

			const formatted = tUS.format('{mon:locale}');
			expect(formatted.includes('\u2067')).toBe(false);
			expect(formatted).toBe('October');
		});
	});

	describe('8. Formatting Tokens ({dow:locale} & {intl.*})', () => {
		it('formats {dow:locale} relative to firstDay regardless of localeInfo flag', () => {
			// 2026-09-13 is Sunday (ISO dow = 7)
			const sunWithLI = new Tempo('2026-09-13T10:00:00Z', { locale: 'en-US', localeInfo: true });
			const sunNoLI = new Tempo('2026-09-13T10:00:00Z', { locale: 'en-US', localeInfo: false });
			const sunDefault = new Tempo('2026-09-13T10:00:00Z', { locale: 'en-US' });

			// {dow} is always ISO (Mon=1 ... Sun=7)
			expect(sunWithLI.format('{dow}')).toBe('7');
			expect(sunNoLI.format('{dow}')).toBe('7');
			expect(sunDefault.format('{dow}')).toBe('7');

			// {dow:locale} always uses t.intl.firstDay because Dev specifically requested :locale
			expect(sunWithLI.format('{dow:locale}')).toBe('1'); // Sunday is day 1 in en-US
			expect(sunNoLI.format('{dow:locale}')).toBe('1');
			expect(sunDefault.format('{dow:locale}')).toBe('1');

			// 2026-09-14 is Monday (ISO dow = 1)
			const monDefault = new Tempo('2026-09-14T10:00:00Z', { locale: 'en-US' });
			expect(monDefault.format('{dow:locale}')).toBe('2'); // Monday is day 2 in en-US
		});

		it('overrides week-start calculation for {dow:locale} with per-call locale options', () => {
			// 2026-09-14 is Monday (ISO dow = 1)
			// In en-US (Sunday firstDay = 7), Monday is day 2
			// In en-GB (Monday firstDay = 1), Monday is day 1
			const t = new Tempo('2026-09-14T10:00:00Z', { locale: 'en-US' });
			expect(t.format('{dow:locale}')).toBe('2');
			expect(t.format('{dow:locale}', { locale: 'en-GB' })).toBe('1');
		});

		it('uses the primary locale when an array is configured', () => {
			const t = new Tempo('2026-09-13T10:00:00Z', { locale: ['en-GB', 'en-US'] });
			expect(t.format('{dow:locale}')).toBe('7');
		});

		it('overrides hour-cycle selection for {hh:locale} and {time:locale}', () => {
			// 15:30:00 (3:30 PM)
			const t = new Tempo('2026-09-15T15:30:00Z', { locale: 'en-US' });
			expect(t.format('{hh:locale}')).toBe('03');
			expect(t.format('{hh:locale}', { locale: 'fr-FR' })).toBe('15');

			expect(t.format('{time:locale}')).toMatch(/^03:30:00\s+(pm|PM)$/i);
			expect(t.format('{time:locale}', { locale: 'fr-FR' })).toBe('15:30:00');
		});

		it('overrides digit transliteration and BiDi isolation per-call', () => {
			const t = new Tempo('2026-10-24T15:30:00Z', { locale: 'en-US' });
			expect(t.format('{yyyy:locale}')).toBe('2026');
			expect(t.format('{yyyy:locale}', { locale: 'ar-EG' })).toBe('٢٠٢٦');

			const arFormatted = t.format('{mon:locale}', { locale: 'ar-EG' });
			expect(arFormatted.startsWith('\u2067')).toBe(true);
			expect(arFormatted.endsWith('\u2069')).toBe(true);
		});

		it('overrides {intl.*} namespace tokens per-call', () => {
			const t = new Tempo('2026-09-16T10:00:00Z', { locale: 'en-US' });
			expect(t.format('{intl.region}')).toBe('US');
			expect(t.format('{intl.region}', { locale: 'ar-SA' })).toBe('SA');
			expect(t.format('{intl.direction}', { locale: 'ar-SA' })).toBe('rtl');
			expect(t.format('{intl.script}', { locale: 'ar-SA' })).toBe('Arab');
		});

		it('formats {intl.*} namespace tokens including region and script', () => {
			const tUS = new Tempo('2026-09-16T10:00:00Z', { locale: 'en-US' });
			expect(tUS.format('{intl.direction}')).toBe('ltr');
			expect(tUS.format('{intl.firstDay}')).toBe('7');
			expect(tUS.format('{intl.region}')).toBe('US');
			expect(tUS.format('{intl.script}')).toBe('Latn');

			const tAR = new Tempo('2026-09-16T10:00:00Z', { locale: 'ar-SA' });
			expect(tAR.format('{intl.direction}')).toBe('rtl');
			expect(tAR.format('{intl.region}')).toBe('SA');
			expect(tAR.format('{intl.script}')).toBe('Arab');
		});
	});
});
