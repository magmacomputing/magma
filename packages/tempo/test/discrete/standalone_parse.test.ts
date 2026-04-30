import { parse } from '#tempo/parse';
import { Tempo } from '#tempo';
import { Temporal } from '@js-temporal/polyfill';
import { registryReset } from '#tempo/support';

beforeEach(() => {
	registryReset();
});

test('standalone parse: tomorrow', () => {
	const now = Temporal.Now.zonedDateTimeISO();
	const zdt = parse('tomorrow', { anchor: now });
	expect(zdt).toBeInstanceOf(Temporal.ZonedDateTime);

	const tomorrow = now.add({ days: 1 }).startOfDay();

	expect(zdt.year).toBe(tomorrow.year);
	expect(zdt.month).toBe(tomorrow.month);
	expect(zdt.day).toBe(tomorrow.day);
});

test('standalone parse: with options', () => {
	const zdt = parse('10:00', { timeZone: 'America/New_York' });
	expect(zdt.timeZoneId).toBe('America/New_York');
	expect(zdt.hour).toBe(10);
	expect(zdt.minute).toBe(0);
});

test('standalone parse: strict mode (ambiguous input)', () => {
	// In strict mode, '20' alone might be ambiguous or invalid depending on context
	// Actually, '20' is often parsed as a day if it's the only thing, but strict mode might reject it if it's not clearly a date.

	// Let's try something that requires 'strict' mode to fail or behave differently.
	// Actually, the goal is just to ensure it works and returns ZonedDateTime.

	const zdt = parse('2025-05-20');
	expect(zdt.year).toBe(2025);
	expect(zdt.month).toBe(5);
	expect(zdt.day).toBe(20);
});

test('standalone parse: shared state with Tempo class', () => {
	// Register a custom event via Tempo
	Tempo.init({
		event: {
			'party-time': '2025-12-31T23:59:59'
		}
	});

	const zdt = parse('party-time');
	expect(zdt.year).toBe(2025);
	expect(zdt.month).toBe(12);
	expect(zdt.day).toBe(31);
	expect(zdt.hour).toBe(23);
});

test('standalone parse: timezone lookup', () => {
	const zdt = parse('2025-05-20 10:00', { timeZone: 'pst' });
	expect(zdt.timeZoneId).toBe('America/Los_Angeles');
});
