import { fromRoman } from '@magmacomputing/tempo/plugin/sdk';
import { getDaysInMonth } from '@magmacomputing/tempo/library';
import type {
	ParsedRomanDate,
	RomanAnchor,
	RomanDateRelation,
	RomanParseOptions,
} from './types.js';
import { calculateClassicalRomanDate, calculateGregorianFromRoman } from './math.js';
import { COUNT_WORDS_ABLATIVE, COUNT_WORDS_ACCUSATIVE } from './constants.js';
import { findConsulYears } from './consul-engine.js';

/** Latin spelling variants are folded together: `j` → `i` (Januarius / Ianuarius). */
const fold = (s: string) => s.toLowerCase().replace(/j/g, 'i');

/** Month stems (first three letters of the folded Latin name) → month number. */
const MONTH_STEMS: Readonly<Record<string, number>> = Object.freeze({
	ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6,
	iul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
});

/** Folded Latin count word (or two-word phrase) → inclusive count to the anchor. */
const COUNT_WORDS: ReadonlyMap<string, number> = (() => {
	const map = new Map<string, number>();
	for (const list of [COUNT_WORDS_ACCUSATIVE, COUNT_WORDS_ABLATIVE])
		list.forEach((word, count) => {
			if (word && count > 2) map.set(fold(word), count);
		});
	return map;
})();

const ERA_BCE = new Set(['bce', 'bc', 'ac', 'aec']);
const ERA_CE = new Set(['ce', 'ad', 'ce.']);

/** Resolves a folded token to a Roman anchor, accepting nominative, accusative, ablative and abbreviated forms. */
function toAnchor(token: string | undefined): RomanAnchor | undefined {
	if (!token) return undefined;
	if (token === 'kal' || token.startsWith('kalend') || token === 'cal' || token.startsWith('calend')) return 'Kalends';
	if (token === 'non' || token === 'nonis' || token === 'nonas' || token === 'nonae' || token === 'nones') return 'Nones';
	if (token === 'id' || token === 'idus' || token === 'idibus') return 'Ides';
	return undefined;
}

/** Resolves a folded token to a month number (1–12) from its three-letter Latin stem. */
function toMonth(token: string | undefined): number | undefined {
	if (!token || token.length < 3) return undefined;
	return MONTH_STEMS[token.slice(0, 3)];
}

/** Parses a numeric or Roman-numeral year token, returning `NaN` if it is neither. */
function toNumber(token: string): number {
	if (/^\d+$/.test(token)) return Number(token);
	return fromRoman(token);
}

/**
 * Parses a classical Latin date expression into a Gregorian calendar date.
 *
 * Understands the Kalends / Nones / Ides system in any grammatical case, including:
 * - Anchor dates: `Idibus Martiis`, `Id. Mart.`, `Kalendae Januariae`
 * - Pridie: `Pridie Idus Octobres`, `Prid. Kal. Nov.`
 * - Ante diem with numerals or Latin words: `ante diem XVII Kalendas Novembres`, `a.d. IV Id. Mart.`, `ante diem tertium decimum Kalendas Apriles`
 * - The bissextile day: `a.d. bis VI Kal. Mart.`
 * - A trailing or leading year: `710 AUC`, `AUC MMDCCLXXIX`, `44 BCE`, `2026`, or `options.year`
 *
 * The result is verified by formatting it back to its classical form, so impossible
 * dates (e.g. `a.d. XX Kal. Nov.`) are rejected rather than silently mis-resolved.
 *
 * @param input - Latin date string
 * @param options - Julian/bissextile rules and a fallback astronomical `year`
 * @throws {RangeError} when the expression cannot be recognised or does not describe a real date
 */
export function parseClassicalRomanDate(input: string, options?: RomanParseOptions): ParsedRomanDate {
	if (typeof input !== 'string' || !input.trim())
		throw new TypeError('Tempo.roman.parse requires a non-empty Latin date string');

	const fail = (why: string): never => {
		throw new RangeError(`Unrecognised classical Roman date "${input}": ${why}`);
	};

	const tokens = fold(input)
		.replace(/ab urbe condita/g, 'auc')
		.replace(/[.,;()]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);

	let i = 0;
	const peek = (n = 0) => tokens[i + n];

	// optional leading marker: "ante diem", "a.d.", "ad", "die"
	let marker = false;
	if (peek() === 'ante' && peek(1) === 'diem') { i += 2; marker = true; }
	else if (peek() === 'a' && peek(1) === 'd') { i += 2; marker = true; }
	else if (peek() === 'ad' || peek() === 'die') { i += 1; marker = true; }

	let relation: RomanDateRelation;
	let count = 1;
	let isBissextile = false;

	if (peek() === 'pridie' || peek() === 'prid') {
		i += 1;
		relation = 'pridie';
		count = 2;
	} else if (toAnchor(peek()) && !marker) {
		relation = 'on';
	} else {
		if (peek() === 'bis') { i += 1; isBissextile = true; }

		const two = peek(1) ? `${peek()} ${peek(1)}` : undefined;
		const asNumber = peek() ? toNumber(peek()!) : NaN;
		if (two && COUNT_WORDS.has(two)) {
			count = COUNT_WORDS.get(two)!;
			i += 2;
		} else if (peek() && COUNT_WORDS.has(peek()!)) {
			count = COUNT_WORDS.get(peek()!)!;
			i += 1;
		} else if (Number.isFinite(asNumber) && asNumber >= 2) {
			count = asNumber;
			i += 1;
		} else {
			return fail('expected a day count, "pridie", or an anchor (Kalends, Nones, Ides)');
		}
		if (count > 19) fail('the day count is out of range');
		relation = count === 2 ? 'pridie' : 'ante_diem';
	}

	// the countdown numeral is followed by the (optional) "ante" in "die tertio ante Kalendas"
	if (peek() === 'ante') i += 1;

	const anchor = toAnchor(peek());
	if (!anchor) return fail('expected Kalends, Nones or Ides');
	i += 1;

	const anchorMonth = toMonth(peek());
	if (!anchorMonth) return fail('expected a Latin month name');
	i += 1;

	if (isBissextile && !(count === 6 && anchor === 'Kalends' && anchorMonth === 3))
		fail('"bis" is only valid for "ante diem bis sextum Kalendas Martias"');

	// year: AUC (either side), "<n> BCE|CE", a bare astronomical year, or options.year
	const rest = tokens.slice(i);
	let year: number | undefined;

	if (rest.length) {
		const aucAt = rest.indexOf('auc');
		if (aucAt >= 0) {
			const value = toNumber(rest[aucAt === 0 ? 1 : aucAt - 1] ?? '');
			if (!Number.isFinite(value) || value < 1 || rest.length !== 2)
				return fail('invalid AUC year');
			year = value - 753;				// astronomical (AUC 1 = 753 BCE = year -752)
		} else if (rest.length === 2 && ERA_BCE.has(rest[1]) && /^\d+$/.test(rest[0])) {
			year = 1 - Number(rest[0]);
		} else if (rest.length === 2 && ERA_CE.has(rest[1]) && /^\d+$/.test(rest[0])) {
			year = Number(rest[0]);
		} else if (rest.length === 1 && /^-?\d+$/.test(rest[0])) {
			year = Number(rest[0]);
		} else {
			// Check if rest contains a consular dating phrase (e.g. "Cicerone et Antonio coss." or "Cicerone coss")
			const restStr = rest.join(' ').replace(/\b(coss?|consulibus|consule)\b/g, '').trim();
			const matches = restStr ? findConsulYears(restStr) : [];
			if (matches.length === 1) {
				year = matches[0].year;
			} else if (matches.length > 1) {
				return fail(`ambiguous consular dating "${restStr}": multiple years match (${matches.map(m => m.year).join(', ')})`);
			} else {
				return fail(`unexpected trailing text "${rest.join(' ')}"`);
			}
		}
	}

	year ??= options?.year;
	if (year === undefined) return fail('no year given; add "AUC", "BCE"/"CE", or pass options.year');

	// a Kalends reckoned back from January belongs to the previous December
	const anchorYear = anchor === 'Kalends' && anchorMonth === 1 && relation !== 'on' ? year + 1 : year;

	const { month, day, year: resolvedYear } = calculateGregorianFromRoman(
		anchor, anchorMonth, anchorYear, relation, count, isBissextile, options?.isJulian ?? false, options?.bissextile ?? true,
	);

	// verify: the resolved date must read back as exactly what was parsed
	const valid = month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(resolvedYear, month, options?.isJulian ?? false);
	const classical = valid ? calculateClassicalRomanDate(resolvedYear, month, day, options) : undefined;
	if (!classical
		|| classical.anchor !== anchor
		|| classical.anchorMonth !== anchorMonth
		|| classical.relation !== relation
		|| classical.count !== count
		|| classical.isBissextile !== isBissextile)
		return fail('that expression does not describe a real calendar date');

	return Object.freeze({
		year: resolvedYear,
		month,
		day,
		auc: classical.auc,
		classical,
	});
}
