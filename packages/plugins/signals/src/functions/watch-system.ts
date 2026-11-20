import { Tempo } from '@magmacomputing/tempo';
import { watchIntl, type IntlWatcher } from '@magmacomputing/tempo/plugin/sdk';
import type { WatchSystemConfigOptions } from '../types/index.js';

function preserveMonthDay(monthDay: any): any {
	if (!monthDay || monthDay.isExplicit)
		return monthDay;
	const { active: _active, isExplicit: _isExplicit, ...rest } = monthDay;
	return rest;
}

/**
 * Watches the host runtime's resolved `Intl` locale and IANA time zone and
 * synchronizes changes into `Tempo.init()` (or a target sandbox) without polling.
 */
export function watchSystemConfig(options: WatchSystemConfigOptions = {}): IntlWatcher {
	const target = options.target ?? Tempo;
	const syncLocale = options.locale !== false;
	const syncTimeZone = options.timeZone !== false;

	return watchIntl(({ locale, timeZone }) => {
		if (!syncLocale && !syncTimeZone)
			return;
		const parseState = (target as any).parse;
		const patch: Record<string, any> = {
			...(target.config ?? {}),
			...(parseState ? {
				pivot: parseState.pivot,
				monthDay: preserveMonthDay(parseState.monthDay),
				planner: parseState.planner,
			} : {}),
		};
		if (syncLocale)
			patch.locale = locale;
		if (syncTimeZone)
			patch.timeZone = timeZone;
		target.init(patch);
	}, options);
}
