import { isText } from '../support/index.js';

/**
 * Checks whether a string is a valid IANA timezone identifier accepted by the host environment.
 * Safe, non-throwing check that returns boolean true/false.
 *
 * @param timeZone - The timezone string to validate (e.g. 'America/New_York', 'UTC', 'Etc/GMT+5')
 * @returns `true` if valid, `false` otherwise
 *
 * @example
 * ```ts
 * isValidTimeZone('America/New_York'); // true
 * isValidTimeZone('UTC');              // true
 * isValidTimeZone('Mars/Curiosity');   // false
 * ```
 */
export function isValidTimeZone(timeZone: string | unknown): boolean {
	if (!isText(timeZone))
		return false;

	try {
		new Intl.DateTimeFormat(undefined, { timeZone: timeZone.trim() });
		return true;
	} catch {
		return false;
	}
}
