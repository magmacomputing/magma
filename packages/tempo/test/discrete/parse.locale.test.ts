import { Tempo } from '#tempo';
import { resetRuntime } from '#tempo/support';

describe('Localized Parsing', () => {
	beforeEach(() => {
		resetRuntime();
		Tempo.init({ mode: 'strict', timeZone: 'UTC', calendar: 'iso8601' });
	});

	afterEach(() => {
		// no-op
	});

	it('should parse French months correctly when localized parsing is enabled', () => {
		const t = new Tempo('15 janv. 2024', { locale: 'fr-FR' });

		expect(t.isValid).toBe(true);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(15);
		expect(t.yy).toBe(2024);

		const t2 = new Tempo('15 février 2024', { locale: 'fr-FR' });
		expect(t2.isValid).toBe(true);
		expect(t2.mm).toBe(2);
	});

	it('should parse French months without trailing punctuation', () => {
		const t = new Tempo('15 janv 2024', { locale: 'fr-FR' });
		expect(t.isValid).toBe(true);
		expect(t.mm).toBe(1);
	});

	it('should parse French weekdays correctly', () => {
		// 15 Jan 2024 is a Monday (lundi)
		// We expect parsing "mercredi" (Wednesday) without a date to resolve to the current week's Wednesday.
		const t = new Tempo('mercredi', { locale: 'fr-FR', anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t.isValid).toBe(true);
		expect(t.dow).toBe(3); // Wednesday
	});

	it('should parse French relative events (yesterday, today, tomorrow)', () => {
		const t1 = new Tempo('hier', { locale: 'fr-FR', anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t1.isValid).toBe(true);
		expect(t1.day).toBe(14);

		const t2 = new Tempo("aujourd’hui", { locale: 'fr-FR', anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t2.isValid).toBe(true);
		const currentDay = Temporal.Now.zonedDateTimeISO('UTC').day;
		expect(t2.day).toBe(currentDay);

		const t3 = new Tempo('demain', { locale: 'fr-FR', anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t3.isValid).toBe(true);
		expect(t3.day).toBe(16);
	});

	it('should preserve English dates even if localized parsing is active for French', () => {
		const t = new Tempo('15 January 2024', { locale: 'fr-FR' });
		expect(t.isValid).toBe(true);
		expect(t.mm).toBe(1);
	});

	it('should parse both French and Spanish dates when an array of locales is provided', () => {
		const t1 = new Tempo('15 février 2024', { locale: ['fr-FR', 'es-ES'] });
		expect(t1.isValid).toBe(true);
		expect(t1.mm).toBe(2);

		const t2 = new Tempo('15 febrero 2024', { locale: ['fr-FR', 'es-ES'] });
		expect(t2.isValid).toBe(true);
		expect(t2.mm).toBe(2);
	});

	it('should parse English dates when en-US is included in the locale array', () => {
		const t1 = new Tempo('15 January 2024', { locale: ['fr-FR', 'en-US'] });
		expect(t1.isValid).toBe(true);
		expect(t1.mm).toBe(1);
		
		const t2 = new Tempo('15 janvier 2024', { locale: ['fr-FR', 'en-US'] });
		expect(t2.isValid).toBe(true);
		expect(t2.mm).toBe(1);
	});

	it('test Spanish el próximo lunes', () => {
		Tempo.init({ 
			locale: ['fr-FR', 'es-ES'],
			registry: {
				modifiers: {
					'+': ['próximo', 'proximo', 'siguiente']
				},
				ignores: ['el', 'la', 'los', 'las']
			}
		});
		const anchor = '2026-07-31T12:00:00+00:00[UTC]';

		const t1 = new Tempo('lunes', { anchor });
		expect(t1.isValid).toBe(true);

		const t2 = new Tempo('próximo lunes', { anchor });
		expect(t2.isValid).toBe(true);
		expect(t2.dow).toBe(1);
		expect(t2.yy).toBe(2026);
		expect(t2.mm).toBe(8);
		expect(t2.dd).toBe(3);

		const t3 = new Tempo('el próximo lunes', { anchor });
		expect(t3.isValid).toBe(true);
		expect(t3.dow).toBe(1);
		expect(t3.yy).toBe(2026);
		expect(t3.mm).toBe(8);
		expect(t3.dd).toBe(3);

		const t4 = new Tempo('el proximo lunes', { anchor });
		expect(t4.isValid).toBe(true);
		expect(t4.dow).toBe(1);
		expect(t4.yy).toBe(2026);
		expect(t4.mm).toBe(8);
		expect(t4.dd).toBe(3);
	});
});
