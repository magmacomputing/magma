import {
	DEFAULT_LAYOUT_CLASS,
	createLayoutController,
	resolveLayoutClassificationOrder,
	resolveLayoutOrder,
} from '#tempo/engine/engine.layout.js';

const makeLayout = (names: string[]) =>
	Object.fromEntries(names.map(name => [Symbol(name), name])) as Record<symbol, string>;

const orderOf = (layout: Record<symbol, string>) =>
	Reflect.ownKeys(layout).map(key => (key as symbol).description);

describe('engine.layout resolver', () => {
	test('no-op when no swap pair matches', () => {
		const layout = makeLayout(['x', 'y', 'z']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dmy', 'mdy']],
			isMonthDay: true,
		});

		expect(resolved).toBe(layout);
		expect(orderOf(resolved)).toEqual(['x', 'y', 'z']);
	});

	test('swaps matching pair in month-day locales', () => {
		const layout = makeLayout(['dmy', 'mdy', 'x']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dmy', 'mdy']],
			isMonthDay: true,
		});

		expect(orderOf(resolved)).toEqual(['mdy', 'dmy', 'x']);
	});

	test('swaps matching pair in reverse for non-month-day locales', () => {
		const layout = makeLayout(['mdy', 'dmy', 'x']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dmy', 'mdy']],
			isMonthDay: false,
		});

		expect(orderOf(resolved)).toEqual(['dmy', 'mdy', 'x']);
	});

	test('handles multiple swap pairs deterministically', () => {
		const layout = makeLayout(['dmyA', 'mdyA', 'x', 'dmyB', 'mdyB', 'y']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dmyA', 'mdyA'], ['dmyB', 'mdyB']],
			isMonthDay: true,
		});

		expect(orderOf(resolved)).toEqual(['mdyA', 'dmyA', 'x', 'mdyB', 'dmyB', 'y']);
	});

	test('preserves relative order of unrelated layouts', () => {
		const layout = makeLayout(['before', 'dmy', 'mdy', 'after']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dmy', 'mdy']],
			isMonthDay: true,
		});

		expect(orderOf(resolved)).toEqual(['before', 'mdy', 'dmy', 'after']);
	});

	test('creates a minimum controller map with one default entry', () => {
		const layout = makeLayout(['hms', 'dmy6', 'mdy6', 'ymd6']);
		const controller = createLayoutController(layout);

		expect(Reflect.ownKeys(controller)).toEqual([DEFAULT_LAYOUT_CLASS]);
		expect(controller[DEFAULT_LAYOUT_CLASS]).toEqual(['hms', 'dmy6', 'mdy6', 'ymd6']);
	});

	test('uses controller classification order when provided', () => {
		const layout = makeLayout(['hms', 'dmy6', 'mdy6', 'ymd6', 'custom']);
		const classified = resolveLayoutClassificationOrder(layout, {
			[DEFAULT_LAYOUT_CLASS]: ['hms', 'ymd6', 'dmy6', 'mdy6'],
		}, DEFAULT_LAYOUT_CLASS);

		expect(orderOf(classified)).toEqual(['hms', 'ymd6', 'dmy6', 'mdy6', 'custom']);
	});

	test('falls back to original order when classification is missing', () => {
		const layout = makeLayout(['hms', 'dmy6', 'mdy6', 'ymd6']);
		const classified = resolveLayoutClassificationOrder(layout, {
			other: ['ymd6', 'mdy6'],
		}, DEFAULT_LAYOUT_CLASS);

		expect(classified).toBe(layout);
		expect(orderOf(classified)).toEqual(['hms', 'dmy6', 'mdy6', 'ymd6']);
	});

	test('supports token-key aliases in preferred layout ordering', () => {
		const layout = makeLayout(['hourMinuteSecond', 'weekDay', 'date', 'time']);
		const classified = resolveLayoutClassificationOrder(layout, {
			[DEFAULT_LAYOUT_CLASS]: ['wkd', 'dt', 'tm'],
		}, DEFAULT_LAYOUT_CLASS);

		expect(orderOf(classified)).toEqual(['weekDay', 'date', 'time', 'hourMinuteSecond']);
	});

	test('applies preferred order before month-day swaps', () => {
		const layout = makeLayout(['dayMonthYear', 'monthDayYear', 'weekDay', 'date', 'time']);
		const resolved = resolveLayoutOrder({
			layout,
			mdyLayouts: [['dayMonthYear', 'monthDayYear']],
			isMonthDay: true,
			layoutController: {
				[DEFAULT_LAYOUT_CLASS]: ['wkd', 'dt', 'tm', 'dmy', 'mdy'],
			},
			classification: DEFAULT_LAYOUT_CLASS,
		});

		expect(orderOf(resolved)).toEqual(['weekDay', 'date', 'time', 'monthDayYear', 'dayMonthYear']);
	});
});
