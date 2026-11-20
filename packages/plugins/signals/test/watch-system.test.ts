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

		Tempo.init({ locale: 'fr-FR', timeZone: 'UTC', calendar: 'hebrew' });

		using watcher = watchSystemConfig({ locale: false });
		state.locale = 'de-DE';
		state.timeZone = 'Australia/Sydney';
		expect(watcher.check()).toBe(true);

		expect(Tempo.signals.locale.get()).toBe('fr-FR');
		expect(Tempo.signals.timeZone.get()).toBe('Australia/Sydney');
		expect(Tempo.config.calendar).toBe('hebrew');
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
});
