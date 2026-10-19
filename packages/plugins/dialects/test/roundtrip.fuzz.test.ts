import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT, type Dialect } from '../src/index.js';

describe('Dialects Property-Based Roundtrip & Fuzzing Harness', () => {
	beforeAll(() => {
		Tempo.use(DialectsPlugin);
	});

	// Edge dates targeting leap days, century bounds, year rollovers, and ISO week boundaries
	const EDGE_DATES = [
		'2000-02-29T12:30:45Z', // Century leap year
		'2024-02-29T23:59:59Z', // Modern leap year
		'2028-02-29T00:00:00Z', // Future leap year
		'2023-02-28T23:59:59Z', // Non-leap year Feb end
		'2023-03-01T00:00:00Z', // Non-leap year Mar start
		'2025-12-31T23:59:59Z', // Year boundary end
		'2026-01-01T00:00:00Z', // Year boundary start
		'2019-12-30T10:15:30Z', // ISO week 1 of 2020 (December dates belonging to next ISO year)
		'2019-12-31T14:20:00Z',
		'2020-01-01T08:05:10Z', // ISO week 1 of 2020 (January date matching ISO year)
		'2021-01-01T18:45:22Z', // ISO week 53 of 2020 (January dates belonging to previous ISO year)
		'2021-01-03T21:10:05Z', // ISO week 53 Sunday
		'2024-12-30T09:00:00Z', // ISO week 1 of 2025
		'2024-12-31T23:59:59Z', // ISO week 1 of 2025
		'2025-01-01T00:00:00Z', // ISO week 1 of 2025
		'1970-01-01T00:00:00Z', // Unix epoch
		'2038-01-19T03:14:07Z', // 32-bit int epoch boundary
		'2099-12-31T23:59:59Z', // 21st century end
	];

	interface DialectMaskSet {
		dialect: Dialect;
		standardMask: string;
		doyMask?: string;
		isoWeekMask?: string;
		twelveHourMask: string;
		millisecondMask: string;
	}

	const DIALECT_CONFIGS: DialectMaskSet[] = [
		{
			dialect: DIALECT.Oracle,
			standardMask: 'YYYY-MM-DD HH24:MI:SS',
			doyMask: 'YYYY-DDD HH24:MI:SS',
			isoWeekMask: 'IYYY-IW-D HH24:MI:SS',
			twelveHourMask: 'YYYY-MM-DD HH12:MI:SS AM',
			millisecondMask: 'YYYY-MM-DD HH24:MI:SS.FF3',
		},
		{
			dialect: DIALECT.Ldml,
			standardMask: 'yyyy-MM-dd HH:mm:ss',
			doyMask: 'yyyy-DDD HH:mm:ss',
			isoWeekMask: "YYYY-'W'ww-e HH:mm:ss",
			twelveHourMask: 'yyyy-MM-dd hh:mm:ss a',
			millisecondMask: 'yyyy-MM-dd HH:mm:ss.SSS',
		},
		{
			dialect: DIALECT.Strftime,
			standardMask: '%Y-%m-%d %H:%M:%S',
			doyMask: '%Y-%j %H:%M:%S',
			isoWeekMask: '%G-W%V-%u %H:%M:%S',
			twelveHourMask: '%Y-%m-%d %I:%M:%S %p',
			millisecondMask: '%Y-%m-%d %H:%M:%S.%3f',
		},
		{
			dialect: DIALECT.Php,
			standardMask: 'Y-m-d H:i:s',
			isoWeekMask: 'o-\\WW-N H:i:s',
			twelveHourMask: 'Y-m-d h:i:s A',
			millisecondMask: 'Y-m-d H:i:s.v',
		},
		{
			dialect: DIALECT.Go,
			standardMask: '2006-01-02 15:04:05',
			doyMask: '2006-002 15:04:05',
			twelveHourMask: '2006-01-02 03:04:05 PM',
			millisecondMask: '2006-01-02 15:04:05.000',
		},
	];

	describe('Systematic Edge-Case Invertibility', () => {
		for (const cfg of DIALECT_CONFIGS) {
			describe(`Dialect: ${cfg.dialect}`, () => {
				it.each(EDGE_DATES)('round-trips standard mask on %s', (isoStr) => {
					const t = Tempo.from(isoStr, { timeZone: 'UTC' });
					const formatted = t.dialects.format(cfg.standardMask, cfg.dialect);
					const parsed = Tempo.dialects.parse(formatted, cfg.standardMask, cfg.dialect, { timeZone: 'UTC' });

					expect(parsed.isValid).toBe(true);
					expect(parsed.yy).toBe(t.yy);
					expect(parsed.mm).toBe(t.mm);
					expect(parsed.dd).toBe(t.dd);
					expect(parsed.hh).toBe(t.hh);
					expect(parsed.mi).toBe(t.mi);
					expect(parsed.ss).toBe(t.ss);
				});

				it.each(EDGE_DATES)('round-trips 12-hour AM/PM mask on %s', (isoStr) => {
					const t = Tempo.from(isoStr, { timeZone: 'UTC' });
					const formatted = t.dialects.format(cfg.twelveHourMask, cfg.dialect);
					const parsed = Tempo.dialects.parse(formatted, cfg.twelveHourMask, cfg.dialect, { timeZone: 'UTC' });

					expect(parsed.isValid).toBe(true);
					expect(parsed.yy).toBe(t.yy);
					expect(parsed.mm).toBe(t.mm);
					expect(parsed.dd).toBe(t.dd);
					expect(parsed.hh).toBe(t.hh);
					expect(parsed.mi).toBe(t.mi);
					expect(parsed.ss).toBe(t.ss);
				});

				it.each(EDGE_DATES)('round-trips millisecond fractional mask on %s', (isoStr) => {
					// Add non-zero milliseconds to the test instant
					const t = Tempo.from(isoStr, { timeZone: 'UTC' }).set({ millisecond: 456 });
					const formatted = t.dialects.format(cfg.millisecondMask, cfg.dialect);
					const parsed = Tempo.dialects.parse(formatted, cfg.millisecondMask, cfg.dialect, { timeZone: 'UTC' });

					expect(parsed.isValid).toBe(true);
					expect(parsed.yy).toBe(t.yy);
					expect(parsed.mm).toBe(t.mm);
					expect(parsed.dd).toBe(t.dd);
					expect(parsed.hh).toBe(t.hh);
					expect(parsed.mi).toBe(t.mi);
					expect(parsed.ss).toBe(t.ss);
					expect(parsed.ms).toBe(456);
				});

				if (cfg.doyMask) {
					it.each(EDGE_DATES)('round-trips Day of Year mask on %s', (isoStr) => {
						const t = Tempo.from(isoStr, { timeZone: 'UTC' });
						const formatted = t.dialects.format(cfg.doyMask!, cfg.dialect);
						const parsed = Tempo.dialects.parse(formatted, cfg.doyMask!, cfg.dialect, { timeZone: 'UTC' });

						expect(parsed.isValid).toBe(true);
						expect(parsed.yy).toBe(t.yy);
						expect(parsed.mm).toBe(t.mm);
						expect(parsed.dd).toBe(t.dd);
						expect(parsed.hh).toBe(t.hh);
						expect(parsed.mi).toBe(t.mi);
						expect(parsed.ss).toBe(t.ss);
					});
				}

				if (cfg.isoWeekMask) {
					it.each(EDGE_DATES)('round-trips ISO Week mask on %s', (isoStr) => {
						const t = Tempo.from(isoStr, { timeZone: 'UTC' });
						const formatted = t.dialects.format(cfg.isoWeekMask!, cfg.dialect);
						const parsed = Tempo.dialects.parse(formatted, cfg.isoWeekMask!, cfg.dialect, { timeZone: 'UTC' });

						expect(parsed.isValid).toBe(true);
						expect(parsed.yy).toBe(t.yy);
						expect(parsed.mm).toBe(t.mm);
						expect(parsed.dd).toBe(t.dd);
						expect(parsed.hh).toBe(t.hh);
						expect(parsed.mi).toBe(t.mi);
						expect(parsed.ss).toBe(t.ss);
					});
				}
			});
		}
	});

	describe('High-Volume Pseudo-Random Fuzzing (200 distinct instants)', () => {
		// Deterministic pseudo-random linear congruential generator for reproducible fuzz tests
		function createLcg(seed: number) {
			let state = seed;
			return () => {
				state = (state * 1664525 + 1013904223) % 4294967296;
				return state / 4294967296;
			};
		}

		const rand = createLcg(42);
		const FUZZ_SAMPLES: string[] = [];

		for (let i = 0; i < 200; i++) {
			const year = 1970 + Math.floor(rand() * 120); // 1970 - 2089
			const month = 1 + Math.floor(rand() * 12);
			const maxDays = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
			const day = 1 + Math.floor(rand() * maxDays);
			const hour = Math.floor(rand() * 24);
			const minute = Math.floor(rand() * 60);
			const second = Math.floor(rand() * 60);

			const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}Z`;
			FUZZ_SAMPLES.push(iso);
		}

		it('round-trips 200 random instants through Oracle, LDML, Strftime, PHP, and Go', () => {
			for (const isoStr of FUZZ_SAMPLES) {
				const t = Tempo.from(isoStr, { timeZone: 'UTC' });

				for (const cfg of DIALECT_CONFIGS) {
					const formatted = t.dialects.format(cfg.standardMask, cfg.dialect);
					const parsed = Tempo.dialects.parse(formatted, cfg.standardMask, cfg.dialect, { timeZone: 'UTC' });

					if (!parsed.isValid) {
						throw new Error(`Failed to parse formatted string "${formatted}" in ${cfg.dialect} for instant ${isoStr}`);
					}
					expect(parsed.yy).toBe(t.yy);
					expect(parsed.mm).toBe(t.mm);
					expect(parsed.dd).toBe(t.dd);
					expect(parsed.hh).toBe(t.hh);
					expect(parsed.mi).toBe(t.mi);
					expect(parsed.ss).toBe(t.ss);
				}
			}
		}, 20000);
	});

	describe('Auxiliary Contradiction Rejection Fuzzing', () => {
		it('systematically rejects mutated weekdays across all dialects', () => {
			const baseDate = '2026-10-24 15:30:00'; // Saturday (ISO 6, 0-indexed 6)

			// Oracle: D = 6 (Saturday), mutate to 5 (Friday)
			const oracleGood = Tempo.dialects.parse(`${baseDate} 6`, 'YYYY-MM-DD HH24:MI:SS D', DIALECT.Oracle);
			expect(oracleGood.isValid).toBe(true);
			const oracleBad = Tempo.dialects.parse(`${baseDate} 5`, 'YYYY-MM-DD HH24:MI:SS D', DIALECT.Oracle, { error: 'catch' });
			expect(oracleBad.isValid).toBe(false);

			// LDML: e = 6, mutate to 1
			const ldmlGood = Tempo.dialects.parse(`${baseDate} 6`, 'yyyy-MM-dd HH:mm:ss e', DIALECT.Ldml);
			expect(ldmlGood.isValid).toBe(true);
			const ldmlBad = Tempo.dialects.parse(`${baseDate} 1`, 'yyyy-MM-dd HH:mm:ss e', DIALECT.Ldml, { error: 'catch' });
			expect(ldmlBad.isValid).toBe(false);

			// Strftime: %u = 6, mutate to 7
			const strftimeGood = Tempo.dialects.parse(`${baseDate} 6`, '%Y-%m-%d %H:%M:%S %u', DIALECT.Strftime);
			expect(strftimeGood.isValid).toBe(true);
			const strftimeBad = Tempo.dialects.parse(`${baseDate} 7`, '%Y-%m-%d %H:%M:%S %u', DIALECT.Strftime, { error: 'catch' });
			expect(strftimeBad.isValid).toBe(false);

			// PHP: N = 6, mutate to 2
			const phpGood = Tempo.dialects.parse(`${baseDate} 6`, 'Y-m-d H:i:s N', DIALECT.Php);
			expect(phpGood.isValid).toBe(true);
			const phpBad = Tempo.dialects.parse(`${baseDate} 2`, 'Y-m-d H:i:s N', DIALECT.Php, { error: 'catch' });
			expect(phpBad.isValid).toBe(false);
		});

		it('systematically rejects mutated calendar weeks (%U, %W) in Strftime', () => {
			// 2026-10-24 is Week 42 for both %U and %W
			const dateStr = '2026-10-24 12:00:00';

			expect(Tempo.dialects.parse(`${dateStr} 42`, '%Y-%m-%d %H:%M:%S %U', DIALECT.Strftime).isValid).toBe(true);
			expect(Tempo.dialects.parse(`${dateStr} 40`, '%Y-%m-%d %H:%M:%S %U', DIALECT.Strftime, { error: 'catch' }).isValid).toBe(false);

			expect(Tempo.dialects.parse(`${dateStr} 42`, '%Y-%m-%d %H:%M:%S %W', DIALECT.Strftime).isValid).toBe(true);
			expect(Tempo.dialects.parse(`${dateStr} 43`, '%Y-%m-%d %H:%M:%S %W', DIALECT.Strftime, { error: 'catch' }).isValid).toBe(false);
		});

		it('systematically rejects mutated days-in-month (t) in PHP', () => {
			// October has 31 days; February 2026 has 28 days
			expect(Tempo.dialects.parse('2026-10-15 31', 'Y-m-d t', DIALECT.Php).isValid).toBe(true);
			expect(Tempo.dialects.parse('2026-10-15 30', 'Y-m-d t', DIALECT.Php, { error: 'catch' }).isValid).toBe(false);

			expect(Tempo.dialects.parse('2026-02-15 28', 'Y-m-d t', DIALECT.Php).isValid).toBe(true);
			expect(Tempo.dialects.parse('2026-02-15 29', 'Y-m-d t', DIALECT.Php, { error: 'catch' }).isValid).toBe(false);
		});
	});
});
