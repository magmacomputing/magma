import { Tempo } from '@magmacomputing/tempo';
import {
	SignalsPlugin,
	disposeConfigSignals,
	watchSystemConfig,
} from '../src/index.js';

function mockSystemIntl(initialLocale: string, initialTimeZone: string) {
	const state = { locale: initialLocale, timeZone: initialTimeZone };
	const OrigDTF = Intl.DateTimeFormat;
	const MockDTF = function (this: any, ...args: any[]) {
		const dtf = new (OrigDTF as any)(...args);
		if (args.length === 0) {
			const origResolved = dtf.resolvedOptions.bind(dtf);
			dtf.resolvedOptions = () => ({
				...origResolved(),
				locale: state.locale,
				timeZone: state.timeZone,
			});
		}
		return dtf;
	} as unknown as typeof Intl.DateTimeFormat;
	MockDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf.bind(OrigDTF);
	vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(MockDTF);
	return state;
}

describe('System Intl Watchers (watchSystemConfig / Tempo.signals.watchSystem)', () => {
	beforeEach(() => {
		disposeConfigSignals();
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
		Tempo.use(SignalsPlugin);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		disposeConfigSignals();
	});

	it('updates Tempo.signals.locale and Tempo.signals.timeZone when host Intl changes', () => {
		const state = mockSystemIntl('en-US', 'UTC');

		let triggerFn: (() => void) | null = null;
		using watcher = Tempo.signals.watchSystem({
			subscribe: (trigger) => {
				triggerFn = trigger;
			},
		});

		expect(Tempo.signals.timeZone.get()).toBe('UTC');
		expect(Tempo.signals.locale.get()).toBe('en-US');

		state.locale = 'ja-JP';
		state.timeZone = 'Asia/Tokyo';
		triggerFn!();

		expect(Tempo.signals.locale.get()).toBe('ja-JP');
		expect(Tempo.signals.timeZone.get()).toBe('Asia/Tokyo');
		void watcher;
	});

	it('respects { locale: false } to keep a pinned locale while syncing timeZone', () => {
		const state = mockSystemIntl('en-US', 'UTC');

		Tempo.init({
			locale: 'fr-FR',
			timeZone: 'UTC',
			calendar: 'hebrew',
			planner: { layoutOrder: ['dmy', 'mdy'] },
		});

		using watcher = watchSystemConfig({ locale: false });
		state.locale = 'de-DE';
		state.timeZone = 'Australia/Sydney';
		expect(watcher.check()).toBe(true);

		expect(Tempo.signals.locale.get()).toBe('fr-FR');
		expect(Tempo.signals.timeZone.get()).toBe('Australia/Sydney');
		expect(Tempo.config.calendar).toBe('hebrew');
		expect(Tempo.parse.planner.layoutOrder).toEqual(['dmy', 'mdy']);
	});

	it('supports sandbox-scoped watchSystem() without mutating global Tempo', () => {
		const state = mockSystemIntl('en-GB', 'Europe/London');

		using sb = Tempo.extend({ locale: 'en-GB', timeZone: 'Europe/London', plugins: [SignalsPlugin] });
		using watcher = sb.signals.watchSystem();

		state.timeZone = 'America/Los_Angeles';
		expect(watcher.check()).toBe(true);

		expect(sb.signals.timeZone.get()).toBe('America/Los_Angeles');
		expect(Tempo.signals.timeZone.get()).toBe('UTC');
	});

	it('recalculates automatic monthDay ordering on host locale/timezone change', () => {
		const state = mockSystemIntl('en-GB', 'Europe/London');

		using sb = Tempo.extend({ locale: 'en-GB', timeZone: 'Europe/London', plugins: [SignalsPlugin] });
		expect(sb.parse.monthDay.isExplicit).toBeFalsy();
		expect(sb.parse.monthDay.active).toBe(false);

		using watcher = sb.signals.watchSystem();

		state.locale = 'en-US';
		state.timeZone = 'America/New_York';
		expect(watcher.check()).toBe(true);

		expect(sb.parse.monthDay.isExplicit).toBeFalsy();
		expect(sb.parse.monthDay.active).toBe(true);
	});

	it('preserves explicit monthDay override across host locale/timezone changes', () => {
		const state = mockSystemIntl('en-GB', 'Europe/London');

		using sb = Tempo.extend({
			locale: 'en-GB',
			timeZone: 'Europe/London',
			monthDay: { active: true },
			plugins: [SignalsPlugin],
		});
		expect(sb.parse.monthDay.isExplicit).toBe(true);
		expect(sb.parse.monthDay.active).toBe(true);

		using watcher = sb.signals.watchSystem();

		state.locale = 'fr-FR';
		state.timeZone = 'Europe/Paris';
		expect(watcher.check()).toBe(true);

		expect(sb.parse.monthDay.isExplicit).toBe(true);
		expect(sb.parse.monthDay.active).toBe(true);
	});

	it('preserves custom parser registrations while regenerating localized entries', () => {
		const state = mockSystemIntl('fr-FR', 'Europe/Paris');

		using sb = Tempo.extend({
			locale: 'fr-FR',
			timeZone: 'Europe/Paris',
			registry: {
				events: { launch: '2026-01-01' },
				snippets: { customYear: /202\d/ },
			},
			plugins: [SignalsPlugin],
		});
		expect(sb.parse.event.launch).toBe('2026-01-01');
		expect(sb.parse.event['aujourd’hui'] ?? sb.parse.event["aujourd'hui"] ?? sb.parse.event['demain']).toBeDefined();

		using watcher = sb.signals.watchSystem();

		state.locale = 'de-DE';
		state.timeZone = 'Europe/Berlin';
		expect(watcher.check()).toBe(true);

		expect(sb.parse.event.launch).toBe('2026-01-01');
		expect(sb.parse.snippet[Symbol.for('$Tempo.customYear')]).toBeInstanceOf(RegExp);
		expect(sb.parse.event['aujourd’hui']).toBeUndefined();
		expect(sb.parse.event['morgen']).toBe('tomorrow');
	});

	it('recomputes inferred sphere on timeZone change while preserving explicit sphere override', () => {
		const state = mockSystemIntl('en-GB', 'Europe/London');

		using inferredSb = Tempo.extend({ locale: 'en-GB', timeZone: 'Europe/London', plugins: [SignalsPlugin] });
		expect(inferredSb.config.sphere).toBe('north');

		using inferredWatcher = inferredSb.signals.watchSystem();
		state.timeZone = 'Australia/Sydney';
		expect(inferredWatcher.check()).toBe(true);
		expect(inferredSb.config.sphere).toBe('south');

		state.timeZone = 'Europe/London';
		using explicitSb = Tempo.extend({
			locale: 'en-GB',
			timeZone: 'Europe/London',
			sphere: 'north',
			plugins: [SignalsPlugin],
		});
		using explicitWatcher = explicitSb.signals.watchSystem();
		state.timeZone = 'Australia/Sydney';
		expect(explicitWatcher.check()).toBe(true);
		expect(explicitSb.config.sphere).toBe('north');
	});
});
