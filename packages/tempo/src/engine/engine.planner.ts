import { ownEntries } from '#library/primitive.library.js';
import type * as t from '../tempo.type.js';

const AGO_HENCE_RE = /\b(ago|hence|from\s+now|prior)\b/i;
const CLASS_CACHE_LIMIT = 256;
const classCache = new Map<string, ParseInputClass>();

function classifyParseInputCached(value: string | number): ParseInputClass {
	const key = String(value ?? '').trim();
	const cached = classCache.get(key);
	if (cached) return cached;

	const cls = classifyParseInput(key);
	classCache.set(key, cls);

	if (classCache.size > CLASS_CACHE_LIMIT) {
		const oldest = classCache.keys().next().value;
		if (oldest !== undefined) classCache.delete(oldest);
	}

	return cls;
}

export interface ParseInputClass {
	trim: string;
	length: number;
	hasDigits: boolean;
	hasLetters: boolean;
	hasColon: boolean;
	hasSign: boolean;
	hasAgoHence: boolean;
	isPureNumeric: boolean;
	isAlphaOnly: boolean;
	isSixDigits: boolean;
	isEightDigits: boolean;
}

export interface SelectLayoutPatternsOptions {
	enablePrefilter?: boolean;
	onPlan?: (summary: PlannerSummary) => void;
}

export interface PlannerSummary {
	inputClass: ParseInputClass;
	totalCandidates: number;
	selectedCandidates: number;
	fallbackToFull: boolean;
	rulesApplied: string[];
}

const LAYOUT = {
	hms: 'hourMinuteSecond',
	dmy6: 'dayMonthYearShort',
	mdy6: 'monthDayYearShort',
	ymd6: 'yearMonthDayShort',
	wkd: 'weekDay',
	dt: 'date',
	tm: 'time',
	dtm: 'dateTime',
	tmd: 'timeDate',
	dmy: 'dayMonthYear',
	mdy: 'monthDayYear',
	ymd: 'yearMonthDay',
	off: 'offset',
	rel: 'relativeOffset',
} as const;

const COMPACT_SIX = new Set<string>([LAYOUT.hms, LAYOUT.dmy6, LAYOUT.mdy6, LAYOUT.ymd6]);
const COMPACT_EIGHT = new Set<string>([LAYOUT.dt, LAYOUT.dmy, LAYOUT.mdy, LAYOUT.ymd]);
const ALPHA_EXCLUDE = new Set<string>([LAYOUT.hms, LAYOUT.dmy6, LAYOUT.mdy6, LAYOUT.ymd6, LAYOUT.off]);
const NUMERIC_EXCLUDE = new Set<string>([LAYOUT.wkd, LAYOUT.rel]);
const COLON_BIAS = new Set<string>([LAYOUT.tm, LAYOUT.tmd, LAYOUT.dtm]);

/**
 * Classify raw parse input once so later planner phases can choose candidate layouts.
 * Release C planner shell: currently classification is observational only.
 */
export function classifyParseInput(value: string | number): ParseInputClass {
	const trim = String(value ?? '').trim();
	const length = trim.length;

	let hasDigits = false;
	let hasLetters = false;
	let hasColon = false;
	let hasOther = false;

	for (let i = 0; i < length; i++) {
		const code = trim.charCodeAt(i);
		if (code >= 48 && code <= 57) {
			hasDigits = true;
			continue;
		}
		if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
			hasLetters = true;
			continue;
		}
		if (code === 58) {
			hasColon = true;
			continue;
		}
		hasOther = true;
	}

	const hasSign = length > 0 && (trim[0] === '+' || trim[0] === '-');
	const isPureNumeric = hasDigits && !hasLetters && !hasOther && !hasColon;
	const isAlphaOnly = hasLetters && !hasDigits && !hasOther && !hasColon;
	const isSixDigits = isPureNumeric && length === 6;
	const isEightDigits = isPureNumeric && length === 8;
	const hasAgoHence = hasLetters && AGO_HENCE_RE.test(trim);

	return {
		trim,
		length,
		hasDigits,
		hasLetters,
		hasColon,
		hasSign,
		hasAgoHence,
		isPureNumeric,
		isAlphaOnly,
		isSixDigits,
		isEightDigits,
	}
}

/** Return layout patterns in resolved layout order, with optional planner pre-filtering. */
export function selectLayoutPatterns(
	state: t.Internal.State,
	value: string | number,
	options: SelectLayoutPatternsOptions = {}
): ReadonlyArray<readonly [symbol, RegExp]> {
	const onPlan = options.onPlan;
	const wantsPlan = typeof onPlan === 'function';

	const ordered = (ownEntries(state.parse.layout) as [PropertyKey, string][])
		.map(([layoutKey]) => {
			const symKey = typeof layoutKey === 'symbol'
				? layoutKey
				: (state.parse.token?.[String(layoutKey)] as symbol | undefined);
			return [symKey, symKey ? state.parse.pattern.get(symKey) : undefined] as const;
		})
		.filter((entry): entry is readonly [symbol, RegExp] => Boolean(entry[0] && entry[1]));

	if (options.enablePrefilter !== true) {
		if (wantsPlan) {
			onPlan({
				inputClass: classifyParseInputCached(value),
				totalCandidates: ordered.length,
				selectedCandidates: ordered.length,
				fallbackToFull: false,
				rulesApplied: [],
			});
		}
		return ordered;
	}

	const cls = classifyParseInputCached(value);

	const hasAgoHence = cls.hasAgoHence;
	const isAlphaOnly = cls.isAlphaOnly;
	const isSixDigits = cls.isSixDigits;
	const isEightDigits = cls.isEightDigits;
	const isPureNumeric = cls.isPureNumeric;
	const hasColon = cls.hasColon;

	let rulesApplied: string[] | undefined;
	if (wantsPlan) {
		rulesApplied = [];
		if (hasAgoHence) rulesApplied.push('hasAgoHence');
		if (isAlphaOnly) rulesApplied.push('isAlphaOnly');
		if (isSixDigits) rulesApplied.push('isSixDigits');
		if (isEightDigits) rulesApplied.push('isEightDigits');
		if (isPureNumeric) rulesApplied.push('isPureNumeric');
		if (hasColon) rulesApplied.push('hasColon');
	}

	const selected: Array<readonly [symbol, RegExp]> = [];
	const timeBiased: Array<readonly [symbol, RegExp]> = [];

	for (const entry of ordered) {
		const desc = entry[0].description ?? '';
		let include = true;

		if (hasAgoHence) {
			include = desc === LAYOUT.rel;
		} else {
			if (include && isAlphaOnly && ALPHA_EXCLUDE.has(desc)) include = false;
			if (include && isSixDigits && !COMPACT_SIX.has(desc)) include = false;
			if (include && isEightDigits && !COMPACT_EIGHT.has(desc)) include = false;
			if (include && isPureNumeric && NUMERIC_EXCLUDE.has(desc)) include = false;
		}

		if (!include) continue;

		if (hasColon && COLON_BIAS.has(desc)) timeBiased.push(entry);
		else selected.push(entry);
	}

	let next = selected;
	if (hasColon && timeBiased.length > 0) {
		next = timeBiased;
		for (const entry of selected) next.push(entry);
	}

	// Safety: if a pre-filter rule over-constrains, retain full candidate order.
	if (next.length === 0) {
		if (wantsPlan) {
			onPlan({
				inputClass: cls,
				totalCandidates: ordered.length,
				selectedCandidates: ordered.length,
				fallbackToFull: true,
				rulesApplied: rulesApplied!,
			});
		}
		return ordered;
	}

	if (wantsPlan) {
		onPlan({
			inputClass: cls,
			totalCandidates: ordered.length,
			selectedCandidates: next.length,
			fallbackToFull: false,
			rulesApplied: rulesApplied!,
		});
	}

	return next;
}
