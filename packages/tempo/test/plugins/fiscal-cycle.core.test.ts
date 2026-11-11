import { Tempo } from '#tempo/core';
import '#tempo/parse';
import '#tempo/term';
import '#tempo/mutate';
import { FormatModule } from '#tempo/format';
import { QuarterTerm, FiscalTerm } from '#tempo/terms';
import { TermsModule } from '#tempo';

Tempo.use([FormatModule, TermsModule, QuarterTerm, FiscalTerm]);

describe('Calendar Quarter and Fiscal Cycle', () => {
	it('should strictly resolve calendar quarter as Q2 globally on April 1st', () => {
		const t1 = new Tempo('2026-04-01', { sphere: 'south' });
		// QuarterTerm is ISO calendar: April 1st is Q2 globally
		expect(t1.term.qtr).toBe('Q2');
	});

	it('should resolve FiscalTerm FQ4 for Australian July-start fiscal cycle', () => {
		const t1 = new Tempo('2026-04-01', { pluginOptions: { fiscal: { country: 'AU' } } });
		// In July-start fiscal cycle, April 1st is FQ4 of FY26
		expect(t1.term.fqtr).toBe('FQ4');
		expect(t1.term.fiscal.fiscalYear).toBe(2026);
	});

	it('should back-date to FQ2 of the same fiscal cycle', () => {
		const t1 = new Tempo('2026-04-01', { pluginOptions: { fiscal: { country: 'AU' } } });
		const t2 = t1.set({ '#fiscal': 2 });
		// FQ2 of the same fiscal cycle (FY26) started Oct 1st, 2025.
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
	});

	it('should advance to FQ1 of the next fiscal cycle (+1 quarter)', () => {
		const t1 = new Tempo('2026-04-01', { pluginOptions: { fiscal: { country: 'AU' } } });
		const t2 = t1.set('#fiscal.>');
		// Next Q after FQ4(FY26) is FQ1(FY27) starting Jul 1st, 2026.
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-01');
	});

	it('should handle large forward shifts (+5 fiscal quarters)', () => {
		const t1 = new Tempo('2026-04-01', { pluginOptions: { fiscal: { country: 'AU' } } });
		const t2 = t1.set('#fiscal.>5');
		// FQ4(FY26) + 5 = FQ1(FY28) starting Jul 1st, 2027.
		// FQ4(FY26) -> FQ1(FY27) -> FQ2(FY27) -> FQ3(FY27) -> FQ4(FY27) -> FQ1(FY28)
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2027-07-01');
	});
});
