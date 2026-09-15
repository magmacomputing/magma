import { formatCurrency, getDateTimeFormat, getHemisphere, getLC, getLI, hasIntl, getDTF, probeMDY, formatList, getRelativeTime, canonicalLocales, resolveLocale, isEnglish, getLanguage, cleanLocaleTag, getPR, formatNumber } from '#library/international.library.js';

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

		it('should memoize getHemisphere results', () => {
			const first = getHemisphere('America/New_York');
			const second = getHemisphere('America/New_York');
			expect(first).toBe('north');
			expect(second).toBe(first);
		});
	});

	describe('getDateTimeFormat', () => {
		it('should memoize and return the same resolved options object reference', () => {
			const a = getDateTimeFormat();
			const b = getDateTimeFormat();
			expect(a).toBe(b);
			expect(a.timeZone).toBeDefined();
			expect(a.locale).toBeDefined();
		});
	});

	describe('getLI and hasIntl', () => {
		it('should detect Intl capability with hasIntl', () => {
			expect(hasIntl()).toBe(true);
			expect(hasIntl('DateTimeFormat')).toBe(true);
			expect(hasIntl('NonExistentIntlConstructor')).toBe(false);
			expect(hasIntl('toString' as any)).toBe(false);
			expect(hasIntl('valueOf' as any)).toBe(false);
			expect(hasIntl('constructor' as any)).toBe(false);
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

		it('should correctly resolve regions for locales with script or without region subtags', () => {
			const withScript = getLI('zh-Hans-CN');
			expect(withScript.baseName).toBe('zh-Hans-CN');
			expect(withScript.language).toBe('zh');
			expect(withScript.locale?.region).toBe('CN');

			const noRegion = getLI('zh-Hans');
			expect(noRegion.baseName).toBe('zh-Hans');
			expect(noRegion.locale?.region).toBeUndefined();
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

	describe('canonicalLocales', () => {
		it('should return empty array for undefined, empty, or whitespace-only input', () => {
			expect(canonicalLocales(undefined)).toEqual([]);
			expect(canonicalLocales([])).toEqual([]);
			expect(canonicalLocales('')).toEqual([]);
			expect(canonicalLocales('   ')).toEqual([]);
		});

		it('should canonicalize valid locale strings with POSIX conversions', () => {
			expect(canonicalLocales('en_US')).toEqual(['en-US']);
			expect(canonicalLocales('en_US.UTF-8')).toEqual(['en-US']);
			expect(canonicalLocales('fr-FR')).toEqual(['fr-FR']);
		});

		it('should canonicalize case per BCP 47', () => {
			expect(canonicalLocales('EN-us')).toEqual(['en-US']);
		});

		it('should filter out invalid locale strings without throwing', () => {
			expect(canonicalLocales('invalid!locale#tag')).toEqual([]);
			expect(canonicalLocales(['en_US.UTF-8', 'invalid!locale#tag', 'fr-FR'])).toEqual(['en-US', 'fr-FR']);
		});

		it('should handle Intl.Locale instances in array or scalar input', () => {
			expect(canonicalLocales(new Intl.Locale('en-US'))).toEqual(['en-US']);
			expect(canonicalLocales([new Intl.Locale('en-US'), 'ja_JP'])).toEqual(['en-US', 'ja-JP']);
		});

		it('should memoize canonicalLocales results', () => {
			const first = canonicalLocales('en_US.UTF-8');
			const second = canonicalLocales('en_US.UTF-8');
			expect(first).toEqual(['en-US']);
			expect(second).toBe(first);
		});
	});

	describe('resolveLocale', () => {
		it('should return undefined when no valid locales resolve', () => {
			expect(resolveLocale(undefined)).toBeUndefined();
			expect(resolveLocale([])).toBeUndefined();
			expect(resolveLocale('invalid!tag')).toBeUndefined();
		});

		it('should return a scalar string when exactly one locale resolves', () => {
			expect(resolveLocale('en_US.UTF-8')).toBe('en-US');
			expect(resolveLocale(['en_US.UTF-8'])).toBe('en-US');
			expect(resolveLocale(['en_US.UTF-8', 'invalid!tag'])).toBe('en-US');
		});

		it('should return an array when multiple locales resolve', () => {
			expect(resolveLocale(['en_US', 'fr_FR'])).toEqual(['en-US', 'fr-FR']);
		});
	});

	describe('isEnglish', () => {
		it('should return true for English locales', () => {
			expect(isEnglish('en-US')).toBe(true);
			expect(isEnglish(['en-US', 'en-GB'])).toBe(true);
			expect(isEnglish(['en_AU.UTF-8'])).toBe(true);
		});

		it('should return false if any non-English locale exists or if none resolve', () => {
			expect(isEnglish('fr-FR')).toBe(false);
			expect(isEnglish(['en-US', 'fr-FR'])).toBe(false);
			expect(isEnglish([])).toBe(false);
			expect(isEnglish(undefined)).toBe(false);
		});
	});

	describe('getLanguage', () => {
		it('should extract the language subtag', () => {
			expect(getLanguage('en-US')).toBe('en');
			expect(getLanguage(['fr-CA', 'en-US'])).toBe('fr');
			expect(getLanguage('de_DE.UTF-8')).toBe('de');
		});

		it('should use fallback when unresolvable', () => {
			expect(getLanguage(undefined)).toBe('en');
			expect(getLanguage('invalid!tag', 'fr')).toBe('fr');
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

		it('should accept LocaleInput in canonicalLocales and probeMDY', () => {
			const loc = new Intl.Locale('en-US');
			expect(canonicalLocales(loc)).toEqual(['en-US']);
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

