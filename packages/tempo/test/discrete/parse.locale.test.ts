import { Temporal } from '@js-temporal/polyfill';
import { Tempo } from '#tempo';

describe('Localized Parsing', () => {
	beforeEach(() => {
		Tempo.init({ mode: 'strict', timeZone: 'UTC', calendar: 'iso8601' });
	});

	afterEach(() => {
		// no-op
	});

	it('should parse French months correctly when localized parsing is enabled', () => {
		const t = new Tempo('15 janv. 2024', { locale: 'fr-FR', localize: true });

		expect(t.isValid).toBe(true);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(15);
		expect(t.yy).toBe(2024);

		const t2 = new Tempo('15 février 2024', { locale: 'fr-FR', localize: true });
		expect(t2.isValid).toBe(true);
		expect(t2.mm).toBe(2);
	});

	it('should parse French months without trailing punctuation', () => {
		const t = new Tempo('15 janv 2024', { locale: 'fr-FR', localize: true });
		expect(t.isValid).toBe(true);
		expect(t.mm).toBe(1);
	});

	it('should parse French weekdays correctly', () => {
		// 15 Jan 2024 is a Monday (lundi)
		// We expect parsing "mercredi" (Wednesday) without a date to resolve to the current week's Wednesday.
		const t = new Tempo('mercredi', { locale: 'fr-FR', localize: true, anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t.isValid).toBe(true);
		expect(t.dow).toBe(3); // Wednesday
	});

	it('should parse French relative events (yesterday, today, tomorrow)', () => {
		const t1 = new Tempo('hier', { locale: 'fr-FR', localize: true, anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t1.isValid).toBe(true);
		expect(t1.day).toBe(14);

		const t2 = new Tempo("aujourd’hui", { locale: 'fr-FR', localize: true, anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t2.isValid).toBe(true);
		const currentDay = Temporal.Now.zonedDateTimeISO('UTC').day;
		expect(t2.day).toBe(currentDay);

		const t3 = new Tempo('demain', { locale: 'fr-FR', localize: true, anchor: '2024-01-15T12:00:00+00:00[UTC]' });
		expect(t3.isValid).toBe(true);
		expect(t3.day).toBe(16);
	});

	it('should NOT parse French dates if localize is false (default)', () => {
		expect(() => new Tempo('15 janv. 2024', { locale: 'fr-FR' })).toThrow();
	});

	it('should fail to parse English dates if localized parsing is active for French', () => {
		expect(() => new Tempo('15 January 2024', { locale: 'fr-FR', localize: true })).toThrow();
	});
});
