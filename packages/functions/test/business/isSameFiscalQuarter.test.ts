import { isSameFiscalQuarter } from '../../src/business/isSameFiscalQuarter.js';
import { Tempo } from '@magmacomputing/tempo';
import { FiscalTerm } from '@magmacomputing/tempo/terms';

describe('isSameFiscalQuarter', () => {
	beforeAll(() => {
		Tempo.init({ sphere: 'north' });
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
	});
});
