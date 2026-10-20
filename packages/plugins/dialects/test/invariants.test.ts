import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';
import { ParseModule } from '@magmacomputing/tempo/parse';
import {
	DialectsPlugin,
	DIALECT,
	LDML_TOKENS,
	ORACLE_TOKENS,
	ORACLE_UNSUPPORTED_PARSE_TOKENS,
	STRFTIME_SPECIFIERS,
	PHP_TOKENS,
	MOMENT_TOKENS,
	MOMENT_TO_LDML_MAP,
	MYSQL_SPECIFIERS,
	DOTNET_TOKENS,
	SHEET_TOKENS,
	validateResolvedDateFields,
} from '../src/index.js';

describe('Dialect Compiler Invariants & Token Parity', () => {
	beforeAll(() => {
		Tempo.use(FormatModule);
		Tempo.use(ParseModule);
		Tempo.use(DialectsPlugin);
	});

	/**
	 * Asserts that whenever token A is a prefix of token B and length(B) > length(A),
	 * B must strictly appear before A in the alternation list to avoid premature matching.
	 */
	function assertPrefixOrdering(tokens: readonly string[], regexName: string) {
		for (let i = 0; i < tokens.length; i++) {
			for (let j = i + 1; j < tokens.length; j++) {
				const current = tokens[i];
				const later = tokens[j];
				if (later.startsWith(current) && later.length > current.length) {
					throw new Error(
						`Prefix violation in ${regexName}: shorter token '${current}' at index ${i} precedes longer token '${later}' at index ${j}`
					);
				}
			}
		}
	}

	describe('Regex Prefix-Ordering Invariants (Source of Truth)', () => {
		it('ensures source LDML_TOKENS strictly orders longer forms before shorter prefixes', () => {
			expect(() => assertPrefixOrdering(LDML_TOKENS, 'LDML_TOKENS')).not.toThrow();
		});

		it('ensures source MOMENT_TOKENS strictly orders longer forms before shorter prefixes', () => {
			expect(() => assertPrefixOrdering(MOMENT_TOKENS, 'MOMENT_TOKENS')).not.toThrow();
		});

		it('ensures source ORACLE_TOKENS strictly orders longer forms before shorter prefixes', () => {
			expect(() => assertPrefixOrdering(ORACLE_TOKENS, 'ORACLE_TOKENS')).not.toThrow();
		});

		it('ensures source DOTNET_TOKENS strictly orders longer forms before shorter prefixes', () => {
			expect(() => assertPrefixOrdering(DOTNET_TOKENS, 'DOTNET_TOKENS')).not.toThrow();
		});

		it('ensures source SHEET_TOKENS strictly orders longer forms before shorter prefixes', () => {
			expect(() => assertPrefixOrdering(SHEET_TOKENS, 'SHEET_TOKENS')).not.toThrow();
		});
	});

	describe('Dialect Token Parity: Oracle', () => {
		it('every canonical Oracle token is either supported in reverse parsing or tracked in unsupported set', () => {
			for (const token of ORACLE_TOKENS) {
				const isUnsupported = ORACLE_UNSUPPORTED_PARSE_TOKENS.has(token);
				const testMask = `YYYY-MM-DD ${token}`;
				const parsed = Tempo.dialects.parse('2026-10-24 test', testMask, DIALECT.Oracle, { error: 'catch' });

				if (isUnsupported) {
					expect(parsed.isValid, `Unsupported token '${token}' should yield invalid parsed instance`).toBe(false);
				}
			}
		});
	});

	describe('Dialect Token Parity: Moment.js', () => {
		const MOMENT_REJECTED_TOKENS = MOMENT_TOKENS.filter((t) => !(t in MOMENT_TO_LDML_MAP));

		it('rejects every Moment token lacking an LDML equivalent during both format and parse', () => {
			const dt = new Tempo('2026-10-24T15:30:45Z');
			for (const token of MOMENT_REJECTED_TOKENS) {
				expect(() => dt.format(token, { dialect: DIALECT.Moment })).toThrow(/no LDML equivalent/);
				const parsed = Tempo.dialects.parse('2026', token, DIALECT.Moment, { error: 'catch' });
				expect(parsed.isValid).toBe(false);
			}
		});

		it('translates supported Moment tokens to correct LDML tokens', () => {
			const dt = new Tempo('2026-10-24T15:30:45Z', { timeZone: 'UTC' });
			for (const [momentToken, ldmlToken] of Object.entries(MOMENT_TO_LDML_MAP)) {
				const momentOut = dt.format(momentToken, { dialect: DIALECT.Moment });
				const ldmlOut = dt.format(ldmlToken, { dialect: DIALECT.Ldml });
				expect(momentOut).toBe(ldmlOut);
			}
		});
	});

	describe('Dialect Token Parity: LDML', () => {
		it('compiles valid parser regexes for all canonical LDML tokens', () => {
			for (const token of LDML_TOKENS) {
				const mask = `yyyy-MM-dd '${token}:' ${token}`;
				expect(() => Tempo.dialects.parse('2026-10-24 token: val', mask, DIALECT.Ldml, { error: 'catch' })).not.toThrow();
			}
		});
	});

	describe('Dialect Token Parity: POSIX Strftime', () => {
		it('compiles valid parser regexes for all canonical Strftime specifiers', () => {
			for (const spec of STRFTIME_SPECIFIERS) {
				if (spec === '%') continue;
				const mask = `%Y-%m-%d %${spec}`;
				expect(() => Tempo.dialects.parse('2026-10-24 val', mask, DIALECT.Strftime, { error: 'catch' })).not.toThrow();
			}
		});
	});

	describe('Dialect Token Parity: PHP', () => {
		it('compiles valid parser regexes for all canonical PHP tokens', () => {
			for (const token of PHP_TOKENS) {
				const mask = `Y-m-d ${token}`;
				expect(() => Tempo.dialects.parse('2026-10-24 val', mask, DIALECT.Php, { error: 'catch' })).not.toThrow();
			}
		});
	});

	describe('Dialect Token Parity: MySQL', () => {
		it('compiles valid parser regexes for all canonical MySQL specifiers', () => {
			for (const spec of MYSQL_SPECIFIERS) {
				if (spec === '%') continue;
				const mask = `%Y-%m-%d %${spec}`;
				expect(() => Tempo.dialects.parse('2026-10-24 val', mask, DIALECT.Mysql, { error: 'catch' })).not.toThrow();
			}
		});
	});

	describe('Dialect Token Inventory Specification', () => {
		it('verifies canonical token count invariants per source modules', () => {
			expect(LDML_TOKENS.length).toBeGreaterThanOrEqual(48);
			expect(ORACLE_TOKENS.length).toBeGreaterThanOrEqual(40);
			expect(STRFTIME_SPECIFIERS.length).toBeGreaterThanOrEqual(30);
			expect(PHP_TOKENS.length).toBeGreaterThanOrEqual(30);
			expect(MOMENT_TOKENS.length).toBeGreaterThanOrEqual(25);
			expect(MYSQL_SPECIFIERS.length).toBeGreaterThanOrEqual(30);
		});
	});

	describe('Explain Map Coverage Invariants', () => {
		it('explains all canonical LDML tokens without throwing or returning empty descriptions', () => {
			for (const tok of LDML_TOKENS) {
				const res = Tempo.dialects.explain(tok, DIALECT.Ldml);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].source).toBe(tok);
				expect(res.tokens[0].desc.length).toBeGreaterThan(0);
				expect(res.pattern).toMatch(/^\{/);
			}
		});

		it('explains all canonical Oracle tokens with defined descriptions and tokens', () => {
			for (const tok of ORACLE_TOKENS) {
				const res = Tempo.dialects.explain(tok, DIALECT.Oracle);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].desc.length).toBeGreaterThan(0);
			}
		});

		it('explains all canonical PHP tokens with defined descriptions and tokens', () => {
			for (const tok of PHP_TOKENS) {
				const res = Tempo.dialects.explain(tok, DIALECT.Php);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].source).toBe(tok);
				expect(res.tokens[0].desc.length).toBeGreaterThan(0);
			}
		});

		it('explains all canonical Strftime specifiers with defined descriptions and tokens', () => {
			for (const spec of STRFTIME_SPECIFIERS) {
				if (spec === '%') {
					expect(Tempo.dialects.explain('%%', DIALECT.Strftime).pattern).toBe('%');
					continue;
				}
				const res = Tempo.dialects.explain(`%${spec}`, DIALECT.Strftime);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].desc.length).toBeGreaterThan(0);
			}
		});

		it('explains all canonical MySQL specifiers with defined descriptions and tokens', () => {
			for (const spec of MYSQL_SPECIFIERS) {
				if (spec === '%') {
					expect(Tempo.dialects.explain('%%', DIALECT.Mysql).pattern).toBe('%');
					continue;
				}
				const res = Tempo.dialects.explain(`%${spec}`, DIALECT.Mysql);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].desc.length).toBeGreaterThan(0);
			}
		});

		it('provides descriptive explain entries for Strftime calendar week specifiers (%U, %W)', () => {
			for (const spec of ['%U', '%W']) {
				const res = Tempo.dialects.explain(spec, DIALECT.Strftime);
				expect(res.tokens.length).toBeGreaterThanOrEqual(1);
				expect(res.tokens[0].desc).toMatch(/Week number of year/);
			}
		});
	});

	describe('Contradiction Rejection Invariants', () => {
		// 2026-10-24 is Saturday (ISO Day 6, Day of Year 297, ISO Week 43, Quarter 4)
		it('rejects weekday number contradictions across supported dialects', () => {
			// Mismatched weekday (1 = Monday, but Oct 24 2026 is Saturday)
			const oracleMismatch = Tempo.dialects.parse('2026-10-24 1', 'YYYY-MM-DD D', DIALECT.Oracle, { error: 'catch' });
			expect(oracleMismatch.isValid).toBe(false);

			const strftimeMismatchU = Tempo.dialects.parse('2026-10-24 1', '%Y-%m-%d %u', DIALECT.Strftime, { error: 'catch' });
			expect(strftimeMismatchU.isValid).toBe(false);

			const strftimeMismatchW = Tempo.dialects.parse('2026-10-24 0', '%Y-%m-%d %w', DIALECT.Strftime, { error: 'catch' });
			expect(strftimeMismatchW.isValid).toBe(false);

			const phpMismatchN = Tempo.dialects.parse('2026-10-24 1', 'Y-m-d N', DIALECT.Php, { error: 'catch' });
			expect(phpMismatchN.isValid).toBe(false);

			const phpMismatchW = Tempo.dialects.parse('2026-10-24 0', 'Y-m-d w', DIALECT.Php, { error: 'catch' });
			expect(phpMismatchW.isValid).toBe(false);

			const ldmlMismatchNum = Tempo.dialects.parse('2026-10-24 1', 'yyyy-MM-dd e', DIALECT.Ldml, { error: 'catch' });
			expect(ldmlMismatchNum.isValid).toBe(false);

			const ldmlMismatchName = Tempo.dialects.parse('2026-10-24 Monday', 'yyyy-MM-dd EEEE', DIALECT.Ldml, { error: 'catch' });
			expect(ldmlMismatchName.isValid).toBe(false);

			// Matching weekday (6 = Saturday)
			const oracleMatch = Tempo.dialects.parse('2026-10-24 6', 'YYYY-MM-DD D', DIALECT.Oracle);
			expect(oracleMatch.isValid).toBe(true);

			const strftimeMatchU = Tempo.dialects.parse('2026-10-24 6', '%Y-%m-%d %u', DIALECT.Strftime);
			expect(strftimeMatchU.isValid).toBe(true);

			const strftimeMatchW = Tempo.dialects.parse('2026-10-24 6', '%Y-%m-%d %w', DIALECT.Strftime);
			expect(strftimeMatchW.isValid).toBe(true);

			const phpMatchN = Tempo.dialects.parse('2026-10-24 6', 'Y-m-d N', DIALECT.Php);
			expect(phpMatchN.isValid).toBe(true);

			const phpMatchW = Tempo.dialects.parse('2026-10-24 6', 'Y-m-d w', DIALECT.Php);
			expect(phpMatchW.isValid).toBe(true);

			const ldmlMatchNum = Tempo.dialects.parse('2026-10-24 6', 'yyyy-MM-dd e', DIALECT.Ldml);
			expect(ldmlMatchNum.isValid).toBe(true);

			const ldmlMatchName = Tempo.dialects.parse('2026-10-24 Saturday', 'yyyy-MM-dd EEEE', DIALECT.Ldml);
			expect(ldmlMatchName.isValid).toBe(true);
		});

		it('rejects quarter contradictions in LDML parsing', () => {
			// October is Q4. Mismatched Q1 should reject.
			const ldmlMismatchQ = Tempo.dialects.parse('2026-10-24 Q1', "yyyy-MM-dd 'Q'Q", DIALECT.Ldml, { error: 'catch' });
			expect(ldmlMismatchQ.isValid).toBe(false);

			const ldmlMatchQ = Tempo.dialects.parse('2026-10-24 Q4', "yyyy-MM-dd 'Q'Q", DIALECT.Ldml);
			expect(ldmlMatchQ.isValid).toBe(true);
		});

		it('rejects days-in-month contradictions in PHP parsing', () => {
			// October has 31 days. 30 is a contradiction.
			const phpMismatchT = Tempo.dialects.parse('2026-10-24 30', 'Y-m-d t', DIALECT.Php, { error: 'catch' });
			expect(phpMismatchT.isValid).toBe(false);

			const phpMatchT = Tempo.dialects.parse('2026-10-24 31', 'Y-m-d t', DIALECT.Php);
			expect(phpMatchT.isValid).toBe(true);
		});

		it('rejects day of year contradictions across supported dialects', () => {
			// Day of year for 2026-10-24 is 297. 296 is mismatch.
			const goMismatch = Tempo.dialects.parse('2026 Nov 297', '2006 Jan 002', DIALECT.Go, { timeZone: 'UTC', error: 'catch' });
			expect(goMismatch.isValid).toBe(false);

			const goMatch = Tempo.dialects.parse('2026 Oct 297', '2006 Jan 002', DIALECT.Go, { timeZone: 'UTC' });
			expect(goMatch.isValid).toBe(true);

			// Oracle Day of Year contradiction with MM-DD
			const oracleMismatch = Tempo.dialects.parse('2026-10-24 296', 'YYYY-MM-DD DDD', DIALECT.Oracle, { error: 'catch' });
			expect(oracleMismatch.isValid).toBe(false);

			const oracleMatch = Tempo.dialects.parse('2026-10-24 297', 'YYYY-MM-DD DDD', DIALECT.Oracle);
			expect(oracleMatch.isValid).toBe(true);

			// Strftime Sunday-start week (%U) contradiction
			const strftimeMismatchU = Tempo.dialects.parse('2026-10-24 41', '%Y-%m-%d %U', DIALECT.Strftime, { error: 'catch' });
			expect(strftimeMismatchU.isValid).toBe(false);

			const strftimeMatchU = Tempo.dialects.parse('2026-10-24 42', '%Y-%m-%d %U', DIALECT.Strftime);
			expect(strftimeMatchU.isValid).toBe(true);
		});
	});

	describe('validateResolvedDateFields helper', () => {
		const targetDate = { year: 2026, month: 10, day: 24 };

		it('validates matching auxiliary metadata fields against a resolved calendar date', () => {
			expect(validateResolvedDateFields(targetDate, {
				expectedDayOfWeek: 6,
				expectedQuarter: 4,
				expectedDaysInMonth: 31,
				expectedDayOfYear: 297,
				expectedIsoWeek: 43,
				expectedIsoYear: 2026,
				expectedWeekU: 42,
				expectedWeekW: 42,
				expectedIsLeap: 0,
			})).toBe(true);
		});

		it('supports Temporal.PlainDate instances directly', () => {
			const plain = Temporal.PlainDate.from('2026-10-24');
			expect(validateResolvedDateFields(plain, { expectedDayOfWeek: 6 })).toBe(true);
			expect(validateResolvedDateFields(plain, { expectedDayOfWeek: 5 })).toBe(false);
		});

		it('rejects invalid or non-existent calendar dates via overflow reject', () => {
			expect(validateResolvedDateFields({ year: 2026, month: 2, day: 29 }, {})).toBe(false);
			expect(validateResolvedDateFields({ year: 2026, month: 4, day: 31 }, {})).toBe(false);
			expect(validateResolvedDateFields({ year: 2024, month: 2, day: 29 }, {})).toBe(true);
		});

		it('rejects conflicting individual auxiliary date fields', () => {
			expect(validateResolvedDateFields(targetDate, { expectedDayOfWeek: 5 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedQuarter: 3 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedDaysInMonth: 30 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedDayOfYear: 296 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedIsoWeek: 44 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedIsoYear: 2025 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedWeekU: 41 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedWeekW: 43 })).toBe(false);
			expect(validateResolvedDateFields(targetDate, { expectedIsLeap: 1 })).toBe(false);
		});
	});
});
