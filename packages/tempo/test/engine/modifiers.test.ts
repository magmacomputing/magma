import { Tempo, defineConfig } from '#tempo';

describe('Localized Modifiers', () => {

	test('should parse localized prefix and suffix modifiers for weekdays', () => {
		const config = defineConfig({
			registry: {
				modifiers: {
					'>': ['prochain'],
					'<': ['dernier']
				}
			}
		});

		const now = new Tempo('2026-06-20T12:00:00+10:00', config); // Saturday

		const prochainFriday = new Tempo('prochain friday', { ...config, anchor: now });
		expect(prochainFriday.dow).toBe(5);
		expect(prochainFriday.toPlainDate().toString() > now.toPlainDate().toString()).toBe(true);

		const fridayDernier = new Tempo('friday dernier', { ...config, anchor: now });
		expect(fridayDernier.dow).toBe(5);
		expect(fridayDernier.toPlainDate().toString() < now.toPlainDate().toString()).toBe(true);
	});

	test('should parse localized prefix and suffix modifiers for explicit dates', () => {
		const config = defineConfig({
			registry: {
				modifiers: {
					'>': ['prochain'],
					'<': ['dernier']
				}
			}
		});

		const now = new Tempo('2026-06-20T12:00:00+10:00', config);
		
		const nextMay = new Tempo('1 May prochain', { ...config, anchor: now });
		if (nextMay.yy !== 2027) throw new Error("nextMay.yy is " + nextMay.yy + " month: " + nextMay.mm + " day: " + nextMay.day);
		expect(nextMay.mm).toBe(5);
		expect(nextMay.day).toBe(1);
		expect(nextMay.yy).toBeGreaterThan(2026);

		const pastMay = new Tempo('1 May dernier', { ...config, anchor: now });
		expect(pastMay.mm).toBe(5);
		expect(pastMay.day).toBe(1);
		expect(pastMay.yy).toBe(2026);

		const pastAugust = new Tempo('1 August dernier', { ...config, anchor: now });
		expect(pastAugust.mm).toBe(8);
		expect(pastAugust.day).toBe(1);
		expect(pastAugust.yy).toBe(2025);
	});

	test('should respect partial match fallback sorting (longest-match first)', () => {
		const config = defineConfig({
			registry: {
				modifiers: {
					'>': ['dans', 'dans la', 'en']
				}
			}
		});

		const now = new Tempo('2026-06-20T12:00:00+10:00', config);

		const futureDate = new Tempo('1 May dans la', { ...config, anchor: now });
		expect(futureDate.mm).toBe(5);
		expect(futureDate.day).toBe(1);
		expect(futureDate.yy).toBeGreaterThan(2026);
	});

	test('should map shorthand localized terms correctly', () => {
		const config = defineConfig({
			registry: {
				modifiers: {
					'>': ['prochain']
				}
			}
		});

		const now = new Tempo('2026-06-20T12:00:00+10:00', config);

		// shorthand shift using localized term
		const nextQtr = new Tempo('#qtr.prochain', { ...config, anchor: now });
		expect(nextQtr.mm).toBeGreaterThan(6);
	});
});
