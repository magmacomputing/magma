let dateTimeFormatCache: Intl.ResolvedDateTimeFormatOptions | undefined;

/**
 * Returns the resolved environment DateTimeFormat options, caching them for performance.
 */
export const getDateTimeFormatOptions = (): Intl.ResolvedDateTimeFormatOptions => {
	if (!dateTimeFormatCache)
		dateTimeFormatCache = Intl.DateTimeFormat().resolvedOptions();

	return dateTimeFormatCache;
}

const localeInstanceCache = new Map<string, Intl.Locale>();

/**
 * Returns a cached Intl.Locale instance for the given locale string.
 * Defaults to the environment locale if no string is provided.
 */
export const getLocale = (localeStr?: string): Intl.Locale => {
	const key = localeStr || getDateTimeFormatOptions().locale;

	let instance = localeInstanceCache.get(key);
	if (!instance) {
		instance = new Intl.Locale(key);
		localeInstanceCache.set(key, instance);
	}

	return instance;
}
