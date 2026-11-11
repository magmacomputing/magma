import { isSameFiscalQuarter } from '../../src/business/isSameFiscalQuarter.js';
import { Tempo } from '@magmacomputing/tempo';
import { FiscalTerm } from '@magmacomputing/tempo/terms';

describe('isSameFiscalQuarter', () => {
	beforeAll(() => {
		Tempo.init();
	});

	it('should return true for dates in the same ISO quarter when FiscalTerm is not loaded', () => {
		const t1 = new Tempo('2026-02-01');
		const t2 = new Tempo('2026-03-01');

		expect(isSameFiscalQuarter(t1, t2)).toBe(true);
	});

	it('should return false for dates in different ISO quarters when FiscalTerm is not loaded', () => {
		const t1 = new Tempo('2026-03-01');
		const t2 = new Tempo('2026-04-01');

		expect(isSameFiscalQuarter(t1, t2)).toBe(false);
	});

	it('should prioritize FiscalTerm when loaded', () => {
		const FiscalTempo = Tempo.derive();
		FiscalTempo.use(FiscalTerm);

		// With fiscal startMonth = 2 (Feb 1):
		// - FQ1 runs Feb 1 .. Apr 30 (spans ISO Q1 and ISO Q2)
		// - FQ2 runs May 1 .. Jul 31
		const tFeb = new FiscalTempo('2025-02-15', { pluginOptions: { fiscal: { startMonth: 2 } } });
		const tApr = new FiscalTempo('2025-04-15', { pluginOptions: { fiscal: { startMonth: 2 } } });
		const tMay = new FiscalTempo('2025-05-15', { pluginOptions: { fiscal: { startMonth: 2 } } });

		// Different ISO quarters (Q1 vs Q2), same Fiscal FQ1 -> true
		expect(isSameFiscalQuarter(tFeb, tApr)).toBe(true);

		// Same ISO quarter (Q2), different Fiscal quarters (FQ1 vs FQ2) -> false
		expect(isSameFiscalQuarter(tApr, tMay)).toBe(false);

		// Same physical quarter start (April 1) but different fiscal calendars (startMonth 1: FQ2 vs startMonth 4: FQ1) -> false
		const tCal1 = new FiscalTempo('2025-04-15', { pluginOptions: { fiscal: { startMonth: 1 } } });
		const tCal4 = new FiscalTempo('2025-04-15', { pluginOptions: { fiscal: { startMonth: 4 } } });
		expect(isSameFiscalQuarter(tCal1, tCal4)).toBe(false);
	});

	it('should throw when FiscalTerm resolves for only one of the two dates', () => {
		const FiscalTempo = Tempo.derive();
		FiscalTempo.use(FiscalTerm);

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const tConfigured = new FiscalTempo('2026-07-15', { pluginOptions: { fiscal: { startMonth: 7 } } });
			const tUnconfigured = new FiscalTempo('2026-08-15', { locale: 'en' });

			expect(() => isSameFiscalQuarter(tConfigured, tUnconfigured)).toThrow(
				/FiscalTerm resolved for only one date/
			);
			expect(() => isSameFiscalQuarter(tUnconfigured, tConfigured)).toThrow(
				/FiscalTerm resolved for only one date/
			);
		} finally {
			warnSpy.mockRestore();
		}
	});

	it('should return true for dates in the same ISO quarter even across differing time zones', () => {
		const tUtc = new Tempo('2026-02-15T12:00:00Z', { timeZone: 'UTC' });
		const tNy = new Tempo('2026-02-15T12:00:00-05:00', { timeZone: 'America/New_York' });

		expect(isSameFiscalQuarter(tUtc, tNy)).toBe(true);
	});

	it('should return true for dates in the same fiscal quarter even across differing time zones', () => {
		const FiscalTempo = Tempo.derive();
		FiscalTempo.use(FiscalTerm);

		const tUtc = new FiscalTempo('2026-08-15T12:00:00Z', { timeZone: 'UTC', pluginOptions: { fiscal: { country: 'AU' } } });
		const tNy = new FiscalTempo('2026-08-15T12:00:00-04:00', { timeZone: 'America/New_York', pluginOptions: { fiscal: { country: 'AU' } } });

		expect(isSameFiscalQuarter(tUtc, tNy)).toBe(true);
	});
});
