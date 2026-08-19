import { Tempo } from '#tempo';

describe('Dynamic Context Evaluation in Tempo Core', () => {
	beforeEach(() => {
		Tempo[Symbol.dispose]();
	});

	test('should dynamically evaluate timezone supplier on instance creation', () => {
		let currentTz = 'Australia/Sydney';
		const getTz = () => currentTz;

		const t1 = new Tempo('2026-06-01T12:00:00', { timeZone: getTz });
		expect(t1.tz).toBe('Australia/Sydney');
		expect(t1.config.timeZone).toBe('Australia/Sydney');

		currentTz = 'America/New_York';
		const t2 = new Tempo('2026-06-01T12:00:00', { timeZone: getTz });
		expect(t2.tz).toBe('America/New_York');
		expect(t2.config.timeZone).toBe('America/New_York');
	});

	test('should dynamically evaluate locale supplier on instance creation', () => {
		let currentLocale = 'fr-FR';
		const getLocale = () => currentLocale;

		const t1 = new Tempo('2026-06-01T12:00:00', { locale: getLocale });
		expect(t1.locale).toBe('fr-FR');
		expect(t1.config.locale).toBe('fr-FR');

		currentLocale = 'de-DE';
		const t2 = new Tempo('2026-06-01T12:00:00', { locale: getLocale });
		expect(t2.locale).toBe('de-DE');
		expect(t2.config.locale).toBe('de-DE');
	});

	test('should dynamically evaluate calendar supplier on instance creation', () => {
		let currentCal = 'iso8601';
		const getCal = () => currentCal;

		const t1 = new Tempo('2026-06-01T12:00:00', { calendar: getCal });
		expect(t1.cal).toBe('iso8601');
		expect(t1.config.calendar).toBe('iso8601');

		currentCal = 'gregory';
		const t2 = new Tempo('2026-06-01T12:00:00', { calendar: getCal });
		expect(t2.cal).toBe('gregory');
		expect(t2.config.calendar).toBe('gregory');
	});

	test('should dynamically evaluate sphere supplier on instance creation', () => {
		let currentSphere: 'north' | 'south' = 'south';
		const getSphere = () => currentSphere;

		const t1 = new Tempo('2026-06-01T12:00:00', { sphere: getSphere });
		expect(t1.sphere).toBe('south');
		expect(t1.config.sphere).toBe('south');

		currentSphere = 'north';
		const t2 = new Tempo('2026-06-01T12:00:00', { sphere: getSphere });
		expect(t2.sphere).toBe('north');
		expect(t2.config.sphere).toBe('north');
	});

	test('should dynamically evaluate anchor supplier on instance creation', () => {
		let anchorYear = 2024;
		const getAnchor = () => new Tempo(`${anchorYear}-01-01T00:00:00Z`);

		const t1 = new Tempo({ days: 5 }, { anchor: getAnchor });
		expect(t1.yy).toBe(2024);
		expect(t1.dd).toBe(6);

		anchorYear = 2028;
		const t2 = new Tempo({ days: 5 }, { anchor: getAnchor });
		expect(t2.yy).toBe(2028);
		expect(t2.dd).toBe(6);
	});

	test('should evaluate global suppliers when creating new Tempo instances after supplier changes', () => {
		let dynamicTz = 'Asia/Tokyo';
		let dynamicLocale = 'ja-JP';
		Tempo.init({
			timeZone: () => dynamicTz,
			locale: () => dynamicLocale
		});

		const t1 = new Tempo('2026-06-01T12:00:00');
		expect(t1.tz).toBe('Asia/Tokyo');
		expect(t1.locale).toBe('ja-JP');

		// Change supplier return values
		dynamicTz = 'America/Chicago';
		dynamicLocale = 'es-ES';

		const t2 = new Tempo('2026-06-01T12:00:00');
		expect(t2.tz).toBe('America/Chicago');
		expect(t2.locale).toBe('es-ES');

		// Verify existing instance t1 remained immutable
		expect(t1.tz).toBe('Asia/Tokyo');
		expect(t1.locale).toBe('ja-JP');
	});

	test('should evaluate global sphere supplier when creating new Tempo instances after supplier changes', () => {
		let dynamicSphere: 'north' | 'south' = 'south';
		Tempo.init({
			sphere: () => dynamicSphere,
		});

		expect(typeof (Tempo.config.sphere as any)).toBe('function');
		expect((Tempo.config.sphere as any)()).toBe('south');

		const t1 = new Tempo('2026-06-01T12:00:00');
		expect(t1.sphere).toBe('south');
		expect(t1.config.sphere).toBe('south');

		dynamicSphere = 'north';
		expect((Tempo.config.sphere as any)()).toBe('north');

		const t2 = new Tempo('2026-06-01T12:00:00');
		expect(t2.sphere).toBe('north');
		expect(t2.config.sphere).toBe('north');

		// Verify existing instance t1 remained immutable
		expect(t1.sphere).toBe('south');
		expect(t1.config.sphere).toBe('south');
	});

	test('should preserve static sphere values during initialization', () => {
		Tempo.init({
			sphere: 'south',
		});

		expect(Tempo.config.sphere).toBe('south');

		const t = new Tempo('2026-06-01T12:00:00');
		expect(t.sphere).toBe('south');
		expect(t.config.sphere).toBe('south');
	});

	test('should infer sphere from dynamic global timeZone supplier when sphere is not explicitly set', () => {
		let dynamicTz = 'Australia/Sydney';
		Tempo.init({
			timeZone: () => dynamicTz,
		});

		const t1 = new Tempo('2026-06-01T12:00:00');
		expect(t1.tz).toBe('Australia/Sydney');
		expect(t1.sphere).toBe('south');
		expect(t1.config.sphere).toBe('south');

		dynamicTz = 'America/New_York';
		const t2 = new Tempo('2026-06-01T12:00:00');
		expect(t2.tz).toBe('America/New_York');
		expect(t2.sphere).toBe('north');
		expect(t2.config.sphere).toBe('north');

		// Verify existing instance t1 remained immutable
		expect(t1.tz).toBe('Australia/Sydney');
		expect(t1.sphere).toBe('south');
		expect(t1.config.sphere).toBe('south');
	});
});
