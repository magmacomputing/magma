import { describe, it, expect } from 'vitest';
import { Tempo } from '../src/tempo.class.js';
import { ParseModule } from '../src/discrete/discrete.parse.js';
import { Token } from '../src/support/tempo.symbol.js';
import { datePattern } from '../src/support/tempo.default.js';

// Ensure ParseModule is loaded for date component parsing
Tempo.extend(ParseModule);

describe('Tempo: Month-Day Parsing (Ambiguity Support)', () => {

	it('should auto-detect MDY order for en-US locale', () => {
		const t = new Tempo('04/01/2023', { locale: 'en-US' });
		expect(t.parse.monthDay.active, 'MDY should be active for en-US').toBe(true);
		expect(t.mm, 'Month should be April (4)').toBe(4);
		expect(t.day, 'Day should be 1st').toBe(1);
	});

	it('should auto-detect DMY order for en-GB locale', () => {
		const t = new Tempo('04/01/2023', { locale: 'en-GB' });
		expect(t.parse.monthDay.active, 'MDY should NOT be active for en-GB').toBe(false);
		expect(t.mm, 'Month should be January (1)').toBe(1);
		expect(t.day, 'Day should be 4th').toBe(4);
	});

	it('should auto-detect MDY order for America/New_York timezone', () => {
		const t = new Tempo('04/01/2023', { timeZone: 'America/New_York' });
		expect(t.parse.monthDay.active, 'MDY should be active for New York').toBe(true);
		expect(t.mm, 'Month should be April (4)').toBe(4);
	});

	it('should allow manual override to force MDY parsing (active: true)', () => {
		const t = new Tempo('04/01/2023', {
			timeZone: 'Europe/London',
			monthDay: { active: true }
		});
		expect(t.parse.monthDay.active, 'MDY should be forced active').toBe(true);
		expect(t.mm, 'Month should be April (4)').toBe(4);
	});

	it('should allow manual override to force DMY parsing (active: false)', () => {
		const t = new Tempo('04/01/2023', {
			timeZone: 'America/New_York',
			monthDay: { active: false }
		});
		expect(t.parse.monthDay.active, 'MDY should be forced inactive').toBe(false);
		expect(t.mm, 'Month should be January (1)').toBe(1);
	});

	it('should respect registry augmentation via Discovery', () => {
		const Sandbox = Tempo.create({
			discovery: {
				monthDay: {
					locales: ['fr-CA']
				}
			}
		});

		const t = new Sandbox('04/01/2023', { locale: 'fr-CA' });
		expect(t.parse.monthDay.active, 'MDY should be active for fr-CA after augmentation').toBe(true);
		expect(t.mm).toBe(4);
	});

	it('should correctly swap layouts based on the active flag', () => {
		const t_mdy = new Tempo('04/01/23', { monthDay: { active: true } });
		expect(t_mdy.mm, 'Month should be April (4) for MDY').toBe(4);

		const t_dmy = new Tempo('04/01/23', { monthDay: { active: false } });
		expect(t_dmy.mm, 'Month should be January (1) for DMY').toBe(1);
	});

	it('should provide fallback timezones if Intl.Locale.getTimeZones is missing', () => {
		expect(Tempo.MONTH_DAY.timezones['en-US']).toContain('America/New_York');
	});

	it('should deep-merge timezones in instance options', () => {
		const t = new Tempo({
			monthDay: {
				timezones: {
					'en-US': ['X/Y']
				}
			}
		});

		const tzs = t.parse.monthDay.timezones?.['en-US'];
		expect(tzs).toContain('X/Y');
		expect(tzs).toContain('America/New_York'); // inherited from global
	});

	it('should allow boolean shortcut for monthDay option', () => {
		const t = new Tempo('04/01/2023', { monthDay: true });
		expect(t.parse.monthDay.active).toBe(true);
		expect(t.mm).toBe(4);
	});
});
