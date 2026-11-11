import { Tempo } from '@magmacomputing/tempo';
import { FiscalTerm, FISCAL_KEYS } from '../src/term.fiscal.js';

describe('FiscalTerm Plugin', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(FiscalTerm);
	});

	it('exposes frozen keys constant without redundant plural properties', () => {
		expect(FiscalTerm.keys).toBe(FISCAL_KEYS);
		expect(Object.isFrozen(FISCAL_KEYS)).toBe(true);
		expect((FiscalTerm as any).quarters).toBeUndefined();

		const t = new Tempo('2025-08-15', { pluginOptions: { fiscal: { startMonth: 7 } } });
		expect(t.term.fiscal.keys).toBe(FISCAL_KEYS);
		expect((t.term.fiscal as any).quarters).toBeUndefined();
	});

	describe('Australian Fiscal Year (July 1 start, FY ending year)', () => {
		it('resolves FQ1 to FQ4 with accurate fiscalYear (2026) and .span metrics', () => {
			const config = { pluginOptions: { fiscal: { country: 'AU' } } };

			// FQ1: August 2025
			const t1 = new Tempo('2025-08-15T12:00:00Z', config);
			expect(t1.term.fqtr).toBe('FQ1');
			expect(t1.term.fiscal.key).toBe('FQ1');
			expect(t1.term.fiscal.label).toBe('First Fiscal Quarter');
			expect(t1.term.fiscal.fiscalYear).toBe(2026);
			expect(t1.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
			expect(t1.term.fiscal.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
			expect(t1.term.fiscal.span.progress).toBeGreaterThan(0.4);
			expect(t1.term.fiscal.span.progress).toBeLessThan(0.6);

			// FQ2: November 2025
			const t2 = new Tempo('2025-11-15T12:00:00Z', config);
			expect(t2.term.fiscal.key).toBe('FQ2');
			expect(t2.term.fiscal.fiscalYear).toBe(2026);
			expect(t2.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
			expect(t2.term.fiscal.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');

			// FQ3: February 2026
			const t3 = new Tempo('2026-02-15T12:00:00Z', config);
			expect(t3.term.fiscal.key).toBe('FQ3');
			expect(t3.term.fiscal.fiscalYear).toBe(2026);
			expect(t3.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');
			expect(t3.term.fiscal.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');

			// FQ4: May 2026
			const t4 = new Tempo('2026-05-15T12:00:00Z', config);
			expect(t4.term.fiscal.key).toBe('FQ4');
			expect(t4.term.fiscal.fiscalYear).toBe(2026);
			expect(t4.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');
			expect(t4.term.fiscal.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-01');

			// Rollover to next fiscal year: July 2026 -> FY2027
			const tNext = new Tempo('2026-07-01T00:00:00Z', config);
			expect(tNext.term.fiscal.key).toBe('FQ1');
			expect(tNext.term.fiscal.fiscalYear).toBe(2027);
		});
	});

	describe('Precedence & Conflict Warning Rules', () => {
		it('warns when country default start month diverges from explicit startMonth, and prioritizes startMonth', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				// AU defaults to month 7, but startMonth is 10
				const t = new Tempo('2025-11-01', {
					pluginOptions: { fiscal: { country: 'AU', startMonth: 10 } }
				});

				// Starts October 1, so November is in FQ1 (evaluates term and logs conflict warning)
				expect(t.term.fiscal.key).toBe('FQ1');
				expect(t.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');

				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining("conflicting options: country 'AU' (default start month 7) and explicit startMonth 10")
				);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('does NOT warn when country default matches explicit startMonth', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const t = new Tempo('2025-08-01', {
					pluginOptions: { fiscal: { country: 'AU', startMonth: 7 } }
				});

				expect(warnSpy).not.toHaveBeenCalled();
				expect(t.term.fiscal.key).toBe('FQ1');
			} finally {
				warnSpy.mockRestore();
			}
		});
	});

	describe('Jurisdiction Resolution Cascade', () => {
		it('infers fiscal year start month from geo.country', () => {
			const t = new Tempo('2025-08-15', { geo: { country: 'AU' } });
			expect(t.term.fiscal.key).toBe('FQ1');
			expect(t.term.fiscal.fiscalYear).toBe(2026);
		});

		it('infers fiscal year start month from locale regional subtag (en-GB -> April)', () => {
			// April start: May 15 is in FQ1
			const t = new Tempo('2025-05-15', { locale: 'en-GB' });
			expect(t.term.fiscal.key).toBe('FQ1');
			expect(t.term.fiscal.fiscalYear).toBe(2026);
			expect(t.term.fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-01');
		});

		it('refuses to guess when jurisdiction cannot be resolved from bare locale', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const t = new Tempo('2025-05-15', { locale: 'en' });
				expect(t.term.fiscal).toBeUndefined();
				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining("FiscalTerm requires an explicit country, startMonth, or locale region")
				);
			} finally {
				warnSpy.mockRestore();
			}
		});
	});

	describe('Formatting & Term Hooks', () => {
		it('formats fiscal tokens {#fiscal}, {#fiscal.fiscalYear}, and subpaths', () => {
			const t = new Tempo('2025-08-15', { pluginOptions: { fiscal: { country: 'AU' } } });
			expect(t.format('{#fiscal}')).toBe('First Fiscal Quarter');
			expect(t.format('{#fqtr}')).toBe('FQ1');
			expect(t.format('{#fiscal.fiscalYear}')).toBe('2026');
			expect(t.format('{#fiscal.span.start}')).toBe('2025-07-01');
		});
	});
});
