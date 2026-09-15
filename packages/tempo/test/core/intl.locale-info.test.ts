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
