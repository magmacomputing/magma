import { Tempo } from '@magmacomputing/tempo';
import { FiscalTerm, FISCAL_KEYS, QuarterTerm } from '@magmacomputing/tempo/terms';

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
		const fiscal = t.term.fiscal;
		expect(fiscal).toBeDefined();
		if (fiscal) {
			expect(fiscal.keys).toBe(FISCAL_KEYS);
			expect((fiscal as any).quarters).toBeUndefined();
		}
	});

	describe('Australian Fiscal Year (July 1 start, FY ending year)', () => {
		it('resolves FQ1 to FQ4 with accurate year (2026) and .span metrics', () => {
			const config = { pluginOptions: { fiscal: { country: 'AU' } } };

			// FQ1: August 2025
			const t1 = new Tempo('2025-08-15T12:00:00Z', config);
			expect(t1.term.fqtr).toBe('FQ1');
			const f1 = t1.term.fiscal;
			expect(f1).toBeDefined();
			if (f1) {
				expect(f1.key).toBe('FQ1');
				expect(f1.label).toBe('First Fiscal Quarter');
				expect(f1.year).toBe(2026);
				expect(f1.config).toEqual({ startMonth: 7, startDay: 1, country: 'AU' });
				expect(Object.isFrozen(f1.config)).toBe(true);
				expect(f1.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
				expect(f1.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
				expect(f1.span.progress).toBeGreaterThan(0.4);
				expect(f1.span.progress).toBeLessThan(0.6);
			}

			// FQ2: November 2025
			const t2 = new Tempo('2025-11-15T12:00:00Z', config);
			const f2 = t2.term.fiscal;
			expect(f2).toBeDefined();
			if (f2) {
				expect(f2.key).toBe('FQ2');
				expect(f2.year).toBe(2026);
				expect(f2.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
				expect(f2.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');
			}

			// FQ3: February 2026
			const t3 = new Tempo('2026-02-15T12:00:00Z', config);
			const f3 = t3.term.fiscal;
			expect(f3).toBeDefined();
			if (f3) {
				expect(f3.key).toBe('FQ3');
				expect(f3.year).toBe(2026);
				expect(f3.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');
				expect(f3.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');
			}

			// FQ4: May 2026
			const t4 = new Tempo('2026-05-15T12:00:00Z', config);
			const f4 = t4.term.fiscal;
			expect(f4).toBeDefined();
			if (f4) {
				expect(f4.key).toBe('FQ4');
				expect(f4.year).toBe(2026);
				expect(f4.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');
				expect(f4.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-01');
			}

			// Rollover to next fiscal year: July 2026 -> FY2027
			const tNext = new Tempo('2026-07-01T00:00:00Z', config);
			const fNext = tNext.term.fiscal;
			expect(fNext).toBeDefined();
			if (fNext) {
				expect(fNext.key).toBe('FQ1');
				expect(fNext.year).toBe(2027);
			}

			// Querying named 'FQ1' from February 2026 selects the FQ1 of the active cycle (July 2025), not July 2026
			const fq1FromFeb = FiscalTerm.define!.call(t3, 'FQ1') as any;
			expect(fq1FromFeb.key).toBe('FQ1');
			expect(fq1FromFeb.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
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
				const fiscal = t.term.fiscal;
				expect(fiscal).toBeDefined();
				if (fiscal) {
					expect(fiscal.key).toBe('FQ1');
					expect(fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
				}

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
				expect(t.term.fqtr).toBe('FQ1');
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('warns when startMonth is invalid and falls back to country default or locale', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				// AU defaults to month 7; startMonth 13 is invalid
				const t = new Tempo('2025-08-01', {
					pluginOptions: { fiscal: { country: 'AU', startMonth: 13 } }
				});

				const fiscal = t.term.fiscal;
				expect(fiscal).toBeDefined();
				if (fiscal) {
					expect(fiscal.key).toBe('FQ1');
					expect(fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
				}

				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining('FiscalTerm ignoring invalid startMonth 13; expected an integer from 1 to 12.')
				);

				// Fractional startMonth (e.g. 7.9) should also be rejected
				warnSpy.mockClear();
				const tFrac = new Tempo('2025-08-01', {
					pluginOptions: { fiscal: { country: 'AU', startMonth: 7.9 } }
				});
				expect(tFrac.term.fqtr).toBe('FQ1');
				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining('FiscalTerm ignoring invalid startMonth 7.9; expected an integer from 1 to 12.')
				);
			} finally {
				warnSpy.mockRestore();
			}
		});
	});

	describe('Jurisdiction Resolution Cascade', () => {
		it('infers fiscal year start month from geo.country', () => {
			const t = new Tempo('2025-08-15', { geo: { country: 'AU' } });
			const fiscal = t.term.fiscal;
			expect(fiscal).toBeDefined();
			if (fiscal) {
				expect(fiscal.key).toBe('FQ1');
				expect(fiscal.year).toBe(2026);
			}
		});

		it('infers fiscal year start month from locale regional subtag (en-GB -> April)', () => {
			// April start: May 15 is in FQ1
			const t = new Tempo('2025-05-15', { locale: 'en-GB' });
			const fiscal = t.term.fiscal;
			expect(fiscal).toBeDefined();
			if (fiscal) {
				expect(fiscal.key).toBe('FQ1');
				expect(fiscal.year).toBe(2026);
				expect(fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-01');
			}
		});

		it('infers fiscal country from explicit timeZone when country, geo.country, and explicit locale are omitted', () => {
			const t = new Tempo('2025-08-15', { timeZone: 'America/New_York' });
			const fiscal = t.term.fiscal;
			expect(fiscal).toBeDefined();
			if (fiscal) {
				expect(fiscal.key).toBe('FQ3');
				expect(fiscal.year).toBe(2025);
				expect(fiscal.config).toEqual({ startMonth: 1, startDay: 1, country: 'US' });
			}
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

		it('warns and returns undefined when explicit country is unrecognized, without falling through to locale', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const t = new Tempo('2025-05-15', {
					locale: 'en-GB',
					pluginOptions: { fiscal: { country: 'AUS' } }
				});
				expect(t.term.fiscal).toBeUndefined();
				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining("FiscalTerm received unrecognized country 'AUS'")
				);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('rejects inherited prototype names as country without treating them as start months', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const t = new Tempo('2025-05-15', {
					pluginOptions: { fiscal: { country: 'toString' } }
				});
				expect(t.term.fiscal).toBeUndefined();
				expect(warnSpy).toHaveBeenCalledWith(
					expect.stringContaining("FiscalTerm received unrecognized country 'toString'")
				);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('resolves Gregorian fiscal quarters and year even when Tempo uses a non-ISO calendar', () => {
			// In Hebrew calendar, 2025-08-15 Gregorian is in year 5785.
			// With AU fiscal settings (startMonth = 7), it should resolve to Gregorian FQ1 of FY2026.
			const tHebrew = new Tempo('2025-08-15T12:00:00Z', {
				calendar: 'hebrew',
				pluginOptions: { fiscal: { country: 'AU' } }
			});
			expect(tHebrew.term.fqtr).toBe('FQ1');
			const fiscal = tHebrew.term.fiscal;
			expect(fiscal).toBeDefined();
			if (fiscal) {
				expect(fiscal.year).toBe(2026);
				expect(fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
				expect(fiscal.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
			}

			// Also verify when anchor is passed directly as a non-ISO Temporal.ZonedDateTime
			const zdtHebrew = tHebrew.toDateTime();
			const tBase = new Tempo('2025-01-01T00:00:00Z', { pluginOptions: { fiscal: { country: 'AU' } } });
			const scopeAnchor = (FiscalTerm as any).define.call(tBase, false, zdtHebrew);
			expect(scopeAnchor).toBeDefined();
			expect(scopeAnchor.key).toBe('FQ1');
			expect(scopeAnchor.year).toBe(2026);
			expect(scopeAnchor.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-01');
		});
	});

	describe('Custom startDay & UK Personal Tax Year (April 6)', () => {
		it('resolves UK personal tax year (country: GB, startDay: 6) and detects year start via .equals()', () => {
			const config = { pluginOptions: { fiscal: { country: 'GB', startDay: 6 } } };

			// 2025-04-06 is exact start of UK Personal Tax Year 2025/26 (FY 2026)
			const tStart = new Tempo('2025-04-06T12:00:00Z', config);
			expect(tStart.term.fqtr).toBe('FQ1');
			const fStart = tStart.term.fiscal;
			expect(fStart).toBeDefined();
			if (fStart) {
				expect(fStart.year).toBe(2026);
				expect(fStart.config).toEqual({ startMonth: 4, startDay: 6, country: 'GB' });
				expect(fStart.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-06');
				expect(fStart.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2025-07-06');
				expect(tStart.equals(fStart.span.start, 'day')).toBe(true);
			}
			expect(tStart.format('{#fiscal.year}')).toBe('2026');

			// 2025-04-05 is the final day of FQ4 of FY 2025
			const tPrev = new Tempo('2025-04-05T12:00:00Z', config);
			expect(tPrev.term.fqtr).toBe('FQ4');
			const fPrev = tPrev.term.fiscal;
			expect(fPrev).toBeDefined();
			if (fPrev) {
				expect(fPrev.year).toBe(2025);
				expect(fPrev.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-01-06');
				expect(fPrev.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-06');
				expect(tPrev.equals(fPrev.span.start, 'day')).toBe(false);
			}

			// 2026-01-06 is start of FQ4 of FY 2026
			const tQ4 = new Tempo('2026-01-06T00:00:00Z', config);
			expect(tQ4.term.fqtr).toBe('FQ4');
			const fQ4 = tQ4.term.fiscal;
			expect(fQ4).toBeDefined();
			if (fQ4) {
				expect(fQ4.year).toBe(2026);
				expect(fQ4.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-06');
				expect(fQ4.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-06');
				expect(tQ4.equals(fQ4.span.start, 'day')).toBe(true);
			}
		});

		it('retains default startDay: 1 for standard UK corporate tax year', () => {
			const tCorp = new Tempo('2025-04-01T12:00:00Z', { pluginOptions: { fiscal: { country: 'GB' } } });
			expect(tCorp.term.fqtr).toBe('FQ1');
			const fCorp = tCorp.term.fiscal;
			expect(fCorp).toBeDefined();
			if (fCorp) {
				expect(fCorp.year).toBe(2026);
				expect(fCorp.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-01');
				expect(tCorp.equals(fCorp.span.start, 'day')).toBe(true);
			}
		});

		it('warns and defaults startDay to 1 when out of 1..28 bounds or non-integer', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				for (const badDay of [0, 29, 6.5]) {
					warnSpy.mockClear();
					const t = new Tempo('2025-04-01', {
						pluginOptions: { fiscal: { country: 'GB', startDay: badDay } }
					});
					const fiscal = t.term.fiscal;
					expect(fiscal).toBeDefined();
					if (fiscal) {
						expect(fiscal.key).toBe('FQ1');
						expect(fiscal.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2025-04-01');
					}
					expect(warnSpy).toHaveBeenCalledWith(
						expect.stringContaining(`FiscalTerm ignoring invalid startDay ${badDay}; expected an integer from 1 to 28.`)
					);
				}
			} finally {
				warnSpy.mockRestore();
			}
		});
	});

	describe('Formatting & Term Hooks', () => {
		it('formats fiscal tokens {#fiscal}, {#fiscal.year}, and subpaths', () => {
			const t = new Tempo('2025-08-15', { pluginOptions: { fiscal: { country: 'AU' } } });
			expect(t.format('{#fiscal}')).toBe('First Fiscal Quarter');
			expect(t.format('{#fqtr}')).toBe('FQ1');
			expect(t.format('{#fiscal.year}')).toBe('2026');
			expect(t.format('{#fiscal.span.start}')).toBe('2025-07-01');
		});

		it('applies registered factory options when FiscalTerm is registered with options', () => {
			Tempo.init();
			Tempo.use(FiscalTerm({ startMonth: 7 }));
			const t = new Tempo('2025-08-15');
			expect(t.term.fqtr).toBe('FQ1');
			expect(t.term.fiscal?.year).toBe(2026);
		});

		it('reads fiscal factory options from a derived Tempo class plugin state', () => {
			class CorpTempo extends Tempo {}
			CorpTempo.init();
			CorpTempo.use(FiscalTerm({ startMonth: 10 })); // October start (e.g. US Federal)

			const tCorp = new CorpTempo('2025-11-15');
			// November is in FQ1 of FY2026 for October start
			expect(tCorp.term.fqtr).toBe('FQ1');
			const fCorp = tCorp.term.fiscal;
			expect(fCorp).toBeDefined();
			if (fCorp) {
				expect(fCorp.year).toBe(2026);
				expect(fCorp.config).toEqual({ startMonth: 10, startDay: 1 });
				expect(fCorp.config).not.toHaveProperty('country');
			}
		});

		it('omits config on stateless Terms like QuarterTerm', () => {
			Tempo.use(QuarterTerm);
			const t = new Tempo('2025-08-15');
			expect(t.term.quarter.key).toBe('Q3');
			expect(t.term.quarter.span).toBeDefined();
			expect((t.term.quarter as any).config).toBeUndefined();
			expect('config' in t.term.quarter).toBe(false);
		});
	});
});
