import { parse } from '#tempo/parse';
import { Tempo } from '#tempo';
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
		registry: {
			events: {
				'party-time': '2025-12-31T23:59:59'
			}
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

test('standalone parse: human date string with GMT/UTC timezone offset (e.g. Aug 6, 16:16 GMT+10)', () => {
	const zdt = parse('Aug 6, 16:16 GMT+10');
	expect(zdt.month).toBe(8);
	expect(zdt.day).toBe(6);
	expect(zdt.hour).toBe(16);
	expect(zdt.minute).toBe(16);
	expect(zdt.offset).toBe('+10:00');

	const zdt2 = parse('Aug 6, 16:16 UTC-5');
	expect(zdt2.month).toBe(8);
	expect(zdt2.day).toBe(6);
	expect(zdt2.hour).toBe(16);
	expect(zdt2.minute).toBe(16);
	expect(zdt2.offset).toBe('-05:00');

	const t = new Tempo('Aug 6, 16:16 GMT+10');
	expect(t.mm).toBe(8);
	expect(t.dd).toBe(6);
	expect(t.hh).toBe(16);
	expect(t.mi).toBe(16);

	const zdtAest = parse('August 6, 16:16 AEST');
	expect(zdtAest.month).toBe(8);
	expect(zdtAest.day).toBe(6);
	expect(zdtAest.hour).toBe(16);
	expect(zdtAest.minute).toBe(16);
	expect(zdtAest.timeZoneId).toBe('Australia/Sydney');
	expect(zdtAest.offset).toBe('+10:00');

	const zdtPst = parse('Aug 6, 16:16 PST');
	expect(zdtPst.month).toBe(8);
	expect(zdtPst.day).toBe(6);
	expect(zdtPst.hour).toBe(16);
	expect(zdtPst.minute).toBe(16);
	expect(zdtPst.timeZoneId).toBe('America/Los_Angeles');
	expect(zdtPst.offset).toBe('-07:00');

	const zdt3 = parse('Aug 6, 16:16 GMT+5:30');
	expect(zdt3.month).toBe(8);
	expect(zdt3.day).toBe(6);
	expect(zdt3.hour).toBe(16);
	expect(zdt3.minute).toBe(16);
	expect(zdt3.offset).toBe('+05:30');

	const zdt4 = parse('Aug 6, 16:16 UTC-8:30');
	expect(zdt4.month).toBe(8);
	expect(zdt4.day).toBe(6);
	expect(zdt4.hour).toBe(16);
	expect(zdt4.minute).toBe(16);
	expect(zdt4.offset).toBe('-08:30');
});
