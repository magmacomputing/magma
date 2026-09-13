import { formatCurrency, getHemisphere, getLC, getLI, hasIntl, getDTF, probeMDY, formatList, getRelativeTime, canonicalLocale, cleanLocaleTag, getPR, formatNumber } from '#library/international.library.js';

describe('International Library', () => {
	describe('formatCurrency', () => {
		it('should format a number as AUD currency by default in en-US', () => {
			const result = formatCurrency(123.45, 2, 'AUD', 'en-US');
			expect(result).toContain('123.45');
		});

		it('should format a string as currency by coercing to number', () => {
			const result = formatCurrency('123.45', 2, 'AUD', 'en-US');
			expect(result).toContain('123.45');
		});

		it('should support different currencies (e.g. USD)', () => {
			const result = formatCurrency(123.45, 2, 'USD', 'en-US');
			expect(result).toContain('123.45');
			expect(result).toContain('$');
		});

		it('should handle zero correctly', () => {
			const result = formatCurrency(0, 2, 'USD', 'en-US');
			expect(result).toContain('0.00');
		});

		it('should handle string zero correctly', () => {
			const result = formatCurrency('0', 2, 'USD', 'en-US');
			expect(result).toContain('0.00');
		});
	});

	describe('getHemisphere', () => {
		it('should identify America/Argentina/Buenos_Aires as southern hemisphere', () => {
			expect(getHemisphere('America/Argentina/Buenos_Aires')).toBe('south');
		});
	});

	describe('getLI and hasIntl', () => {
		it('should detect Intl capability with hasIntl', () => {
			expect(hasIntl()).toBe(true);
			expect(hasIntl('DateTimeFormat')).toBe(true);
			expect(hasIntl('NonExistentIntlConstructor')).toBe(false);
		});

		it('should resolve en-US with Sunday firstDay and ltr direction', () => {
			const info = getLI('en-US');
			expect(info.baseName).toBe('en-US');
			expect(info.direction).toBe('ltr');
			expect(info.numberingSystem).toBe('latn');
			expect(info.firstDay).toBe(7); // Sunday
			expect(info.weekInfo.firstDay).toBe(7);
			expect(info.weekend).toEqual([6, 7]);
			expect(info.weekInfo.weekend).toEqual([6, 7]);
		});

		it('should resolve en-GB with Monday firstDay', () => {
			const info = getLI('en-GB');
			expect(info.baseName).toBe('en-GB');
			expect(info.firstDay).toBe(1); // Monday
			expect(info.direction).toBe('ltr');
		});

		it('should resolve ar-SA with rtl direction', () => {
			const info = getLI('ar-SA');
			expect(info.direction).toBe('rtl');
		});

		it('should fall back cleanly to en-US for malformed locale tags', () => {
			const info = getLI('invalid!locale#tag');
			expect(info.baseName).toBe('en-US');
			expect(info.firstDay).toBe(7);
			expect(info.locale?.baseName).toBe('en-US');
		});

		it('should memoize results returning identical references', () => {
			const a = getLI('en-US');
			const b = getLI('en-US');
			expect(a).toBe(b);
		});

		it('should return frozen immutable objects', () => {
			const info = getLI('en-US');
			expect(Object.isFrozen(info)).toBe(true);
			expect(Object.isFrozen(info.weekInfo)).toBe(true);
			expect(Object.isFrozen(info.weekend)).toBe(true);
			expect(Object.isFrozen(info.hourCycles)).toBe(true);
			expect(Object.isFrozen(info.numberingSystems)).toBe(true);
			expect(Object.isFrozen(info.timeZones)).toBe(true);
		});

		it('should expose language on ResolvedLocaleInfo', () => {
			const info = getLI('fr-FR');
			expect(info.language).toBe('fr');
			expect(info.baseName).toBe('fr-FR');
		});
	});

	describe('locale cleansing in formatters', () => {
		it('should accept POSIX underscore tags without throwing in getDTF', () => {
			const dtf = getDTF('en_US');
			expect(dtf.resolvedOptions().locale).toBe('en-US');
		});

		it('should accept POSIX .UTF-8 suffix in getDTF', () => {
			const dtf = getDTF('en_US.UTF-8');
			expect(dtf.resolvedOptions().locale).toBe('en-US');
		});

		it('should format lists cleanly with POSIX locale tags', () => {
			const res = formatList(['apples', 'oranges'], 'en_US.UTF-8');
			expect(res).toBe('apples and oranges');
		});

		it('should format relative time cleanly with POSIX locale tags', () => {
			const res = getRelativeTime(1, 'days', 'en_US.UTF-8');
			expect(res).toBe('in 1d');
			expect(getRelativeTime(1, 'days', 'en_US.UTF-8', 'long')).toBe('in 1 day');
		});
	});

	describe('getLC', () => {
		it('should resolve Intl.Locale with default en-US when undefined', () => {
			const loc = getLC();
			expect(loc).toBeDefined();
			expect(loc?.baseName).toBe('en-US');
		});

		it('should resolve Intl.Locale for given locale tag', () => {
			const loc = getLC('fr-FR');
			expect(loc).toBeDefined();
			expect(loc?.baseName).toBe('fr-FR');
		});

		it('should memoize Intl.Locale instances returning identical references', () => {
			const a = getLC('en-US');
			const b = getLC('en-US');
			expect(a).toBe(b);
		});

		it('should cleanse POSIX underscore to BCP 47 hyphen', () => {
			const loc = getLC('en_US');
			expect(loc).toBeDefined();
			expect(loc?.baseName).toBe('en-US');
		});

		it('should cleanse POSIX encoding and modifier suffixes', () => {
			const utf8 = getLC('en_US.UTF-8');
			expect(utf8).toBeDefined();
			expect(utf8?.baseName).toBe('en-US');

			const euro = getLC('de_DE@euro');
			expect(euro).toBeDefined();
			expect(euro?.baseName).toBe('de-DE');
		});

		it('should trim surrounding whitespace', () => {
			const loc = getLC('  en-AU  ');
			expect(loc).toBeDefined();
			expect(loc?.baseName).toBe('en-AU');
		});

		it('should canonicalize case per BCP 47', () => {
			const loc = getLC('EN-us');
			expect(loc).toBeDefined();
			expect(loc?.baseName).toBe('en-US');
		});

		it('should safely return undefined for invalid locale tags without throwing', () => {
			const loc = getLC('invalid!locale#tag');
			expect(loc).toBeUndefined();
		});
	});

	describe('canonicalLocale', () => {
		it('should return undefined for empty or whitespace-only locale string', () => {
			expect(canonicalLocale('')).toBeUndefined();
			expect(canonicalLocale('   ')).toBeUndefined();
		});

		it('should canonicalize valid locale strings with POSIX conversions', () => {
			expect(canonicalLocale('en_US')).toBe('en-US');
			expect(canonicalLocale('en_US.UTF-8')).toBe('en-US');
			expect(canonicalLocale('fr-FR')).toBe('fr-FR');
		});

		it('should return undefined for invalid locale strings', () => {
			expect(canonicalLocale('invalid!locale#tag')).toBeUndefined();
		});
	});

	describe('cleanLocaleTag', () => {
		it('should safely return undefined for non-string inputs', () => {
			expect(cleanLocaleTag(undefined)).toBeUndefined();
			expect(cleanLocaleTag(null)).toBeUndefined();
			expect(cleanLocaleTag(123 as any)).toBeUndefined();
			expect(cleanLocaleTag({})).toBeUndefined();
		});

		it('should extract baseName from Intl.Locale instances', () => {
			const loc = new Intl.Locale('en-US');
			expect(cleanLocaleTag(loc)).toBe('en-US');
		});

		it('should cleanse strings correctly', () => {
			expect(cleanLocaleTag('en_US.UTF-8')).toBe('en-US');
		});
	});

	describe('getPR', () => {
		it('should resolve plural rules for string and Intl.Locale instances', () => {
			expect(getPR('en-US').select(1)).toBe('one');
			expect(getPR(new Intl.Locale('en-US')).select(2)).toBe('other');
		});
	});

	describe('LocaleInput polymorphism and unified getXX options', () => {
		it('should accept Intl.Locale across getLC and getLI', () => {
			const loc = new Intl.Locale('en-US');
			expect(getLC(loc)?.baseName).toBe('en-US');
			expect(getLI(loc).baseName).toBe('en-US');
			expect(getLI(loc).firstDay).toBe(7);
		});

		it('should accept Intl.Locale across getDTF and getPR', () => {
			const loc = new Intl.Locale('en-US');
			expect(getDTF(loc).resolvedOptions().locale).toBe('en-US');
			expect(getPR(loc).select(1)).toBe('one');
		});

		it('should share memoized cache entries between string and Intl.Locale instances', () => {
			const dtfString = getDTF('en-US');
			const dtfLocale = getDTF(new Intl.Locale('en-US'));
			expect(dtfString).toBe(dtfLocale);

			const liString = getLI('en-US');
			const liLocale = getLI(new Intl.Locale('en-US'));
			expect(liString).toBe(liLocale);

			const lcString = getLC('en-US');
			const lcLocale = getLC(new Intl.Locale('en-US'));
			expect(lcString).toBe(lcLocale);
		});

		it('should format relative time and lists with options and LocaleInput', () => {
			expect(getRelativeTime(2, 'day', 'en-US', 'long', 'always')).toBe('in 2 days');
			expect(getRelativeTime(2, 'day', new Intl.Locale('en-US'), 'long', 'always')).toBe('in 2 days');

			expect(formatList(['A', 'B', 'C'], 'en-US', 'conjunction', 'long')).toBe('A, B, and C');
			expect(formatList(['A', 'B', 'C'], new Intl.Locale('en-US'), 'conjunction', 'long')).toBe('A, B, and C');
		});

		it('should accept LocaleInput in canonicalLocale and probeMDY', () => {
			const loc = new Intl.Locale('en-US');
			expect(canonicalLocale(loc)).toBe('en-US');
			expect(probeMDY(loc)).toBe(true);
			expect(probeMDY(new Intl.Locale('en-GB'))).toBe(false);
		});

		it('should accept LocaleInput across higher-level formatters', () => {
			const loc = new Intl.Locale('en-US');
			expect(formatNumber(1234, loc)).toContain('1,234');
			expect(formatList(['x', 'y'], loc)).toBe('x and y');
			expect(getRelativeTime(3, 'days', loc)).toContain('3d');
		});

		it('should preserve Unicode extensions on Intl.Locale instances', () => {
			const loc = new Intl.Locale('en-US', { hourCycle: 'h23' });
			expect(cleanLocaleTag(loc)).toContain('h23');
			const dtf = getDTF(loc, { hour: 'numeric' });
			expect(dtf.resolvedOptions().hourCycle).toBe('h23');
		});
	});
});

