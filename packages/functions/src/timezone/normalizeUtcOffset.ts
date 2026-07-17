/**
 * ## normalizeUtcOffset
 * Convert informal UTC offset strings into the `±HH:MM` format required by Temporal.
 * Accepts forms like `'UTC+8'`, `'UTC-9'`, `'UTC+08:00'`, `'UTC-05:30'`.
 * Returns the input unchanged if it does not match the UTC± pattern.
 */
export function normalizeUtcOffset(zone: string): string {
	const match = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/i.exec(zone);
	if (!match) return zone;

	const [, sign, hours, minutes] = match;
	const h = Number(hours);
	const m = Number(minutes ?? '0');

	// Temporal-valid range: -12:00 .. +14:00, minutes 0..59
	if (h > 14 || m > 59 || (sign === '+' && h === 14 && m !== 0) || (sign === '-' && (h > 12 || (h === 12 && m > 0)))) return zone;

	return `${sign}${hours.padStart(2, '0')}:${minutes ?? '00'}`;
}
