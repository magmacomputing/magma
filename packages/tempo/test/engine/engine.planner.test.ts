import { classifyParseInput, selectLayoutPatterns } from '#tempo/engine/engine.planner.js';

const makeState = (layoutNames: string[]) => {
	const symbols = layoutNames.map(name => Symbol(name));
	const layout = Object.fromEntries(symbols.map(sym => [sym, `{${sym.description}}`])) as Record<symbol, string>;
	const pattern = new Map(symbols.map(sym => [sym, new RegExp(`^${sym.description}$`, 'i')]));

	return {
		parse: {
			layout,
			pattern,
			token: {},
		}
	} as any;
};

describe('engine.planner shell', () => {
	test('classifies numeric compact input', () => {
		const cls = classifyParseInput('04012026');

		expect(cls.trim).toBe('04012026');
		expect(cls.isPureNumeric).toBe(true);
		expect(cls.isEightDigits).toBe(true);
		expect(cls.hasLetters).toBe(false);
		expect(cls.hasColon).toBe(false);
	});

	test('classifies letter-only relative input', () => {
		const cls = classifyParseInput('ago');

		expect(cls.isAlphaOnly).toBe(true);
		expect(cls.hasAgoHence).toBe(true);
		expect(cls.isPureNumeric).toBe(false);
	});

	test('returns patterns in layout order (not map insertion order)', () => {
		const state = makeState(['weekDay', 'date', 'time']);
		const patterns = selectLayoutPatterns(state, 'monday');

		expect(patterns.map(([sym]) => sym.description)).toEqual(['weekDay', 'date', 'time']);
	});

	test('prefilter: alpha-only input excludes compact numeric/offset layouts', () => {
		const state = makeState(['hourMinuteSecond', 'dayMonthYearShort', 'monthDayYearShort', 'yearMonthDayShort', 'weekDay', 'date', 'offset']);
		const pre = selectLayoutPatterns(state, 'monday', { enablePrefilter: true });

		expect(pre.map(([sym]) => sym.description)).toEqual(['weekDay', 'date']);
	});

	test('prefilter: six-digit input narrows to compact six candidates', () => {
		const state = makeState(['weekDay', 'date', 'hourMinuteSecond', 'dayMonthYearShort', 'monthDayYearShort', 'yearMonthDayShort', 'time']);
		const pre = selectLayoutPatterns(state, '310559', { enablePrefilter: true });

		expect(pre.map(([sym]) => sym.description)).toEqual([
			'hourMinuteSecond',
			'dayMonthYearShort',
			'monthDayYearShort',
			'yearMonthDayShort',
		]);
	});

	test('prefilter: ago/hence inputs jump straight to relativeOffset', () => {
		const state = makeState(['weekDay', 'date', 'time', 'relativeOffset']);
		const pre = selectLayoutPatterns(state, '2 days ago', { enablePrefilter: true });

		expect(pre.map(([sym]) => sym.description)).toEqual(['relativeOffset']);
	});

	test('prefilter: colon input biases time-family layouts first', () => {
		const state = makeState(['date', 'weekDay', 'time', 'timeDate', 'dateTime']);
		const pre = selectLayoutPatterns(state, '09:30', { enablePrefilter: true });

		expect(pre.map(([sym]) => sym.description)).toEqual(['time', 'timeDate', 'dateTime', 'date', 'weekDay']);
	});

	test('prefilter: falls back to full order when filtering removes all candidates', () => {
		const state = makeState(['weekDay']);
		const pre = selectLayoutPatterns(state, '123456', { enablePrefilter: true });

		expect(pre.map(([sym]) => sym.description)).toEqual(['weekDay']);
	});

	test('planner hook reports candidate reduction when prefilter narrows set', () => {
		const state = makeState(['weekDay', 'date', 'hourMinuteSecond', 'dayMonthYearShort', 'monthDayYearShort', 'yearMonthDayShort', 'time']);
		let summary: any;

		selectLayoutPatterns(state, '310559', {
			enablePrefilter: true,
			onPlan: s => { summary = s; },
		});

		expect(summary).toBeDefined();
		expect(summary.totalCandidates).toBe(7);
		expect(summary.selectedCandidates).toBe(4);
		expect(summary.fallbackToFull).toBe(false);
		expect(summary.rulesApplied).toContain('isSixDigits');
	});

	test('planner hook reports fallback when filter over-constrains', () => {
		const state = makeState(['weekDay']);
		let summary: any;

		selectLayoutPatterns(state, '123456', {
			enablePrefilter: true,
			onPlan: s => { summary = s; },
		});

		expect(summary).toBeDefined();
		expect(summary.totalCandidates).toBe(1);
		expect(summary.selectedCandidates).toBe(1);
		expect(summary.fallbackToFull).toBe(true);
		expect(summary.rulesApplied).toContain('isSixDigits');
	});
});
