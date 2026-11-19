import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/plugin/sdk';
import {
	SignalsPlugin,
	createConfigSignals,
	disposeConfigSignals,
	localeSignal,
	timeZoneSignal,
} from '../src/index.js';

describe('Config-Change Signals (locale & timeZone)', () => {
	it('reattaches one shared subscription after repeated disposal and initialization', () => {
		const original = createConfigSignals();
		disposeConfigSignals();
		disposeConfigSignals();
		Tempo.init({ locale: 'de-DE', timeZone: 'Europe/Berlin' });
		expect(original.locale.get()).toBe('en-US');
		const replacement = createConfigSignals();
		expect(original.locale.get()).toBe('de-DE');
		expect(replacement.timeZone.get()).toBe('Europe/Berlin');
		Tempo.init({ locale: 'ja-JP', timeZone: 'Asia/Tokyo' });
		expect(original.locale.get()).toBe('ja-JP');
		expect(original.timeZone.get()).toBe('Asia/Tokyo');
		expect(replacement.locale.get()).toBe('ja-JP');
		expect(replacement.timeZone.get()).toBe('Asia/Tokyo');
	});

	it('updates sandbox signals when sandbox.init() changes configuration without affecting global Tempo', () => {
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });

		using sb = Tempo.extend({ locale: 'en-GB', timeZone: 'Europe/London', plugins: [SignalsPlugin] });

		expect(sb.signals.locale.get()).toBe('en-GB');
		expect(sb.signals.timeZone.get()).toBe('Europe/London');

		sb.init({ locale: 'fr-FR', timeZone: 'Europe/Paris' });
		expect(sb.signals.locale.get()).toBe('fr-FR');
		expect(sb.signals.timeZone.get()).toBe('Europe/Paris');

		expect(localeSignal().get()).toBe('en-US');
		expect(timeZoneSignal().get()).toBe('UTC');
	});

	beforeEach(() => {
		disposeConfigSignals();
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
		Tempo.use(SignalsPlugin);
	});

	afterEach(() => {
		disposeConfigSignals();
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
	});

	it('initializes locale and timeZone signals from Tempo.config', () => {
		expect(localeSignal().get()).toBe('en-US');
		expect(timeZoneSignal().get()).toBe('UTC');
		expect(Tempo.signals.locale.get()).toBe('en-US');
		expect(Tempo.signals.timeZone.get()).toBe('UTC');
	});

	it('returns frozen ConfigSignals from createConfigSignals()', () => {
		const cfg = createConfigSignals();
		expect(Object.isFrozen(cfg)).toBe(true);
		expect(cfg.locale.get()).toBe('en-US');
		expect(cfg.timeZone.get()).toBe('UTC');
	});

	it('reactively updates locale and timeZone signals when Tempo.init() changes config', () => {
		const formatted = Signify.computed(
			() => `${Tempo.signals.locale.get()}@${Tempo.signals.timeZone.get()}`,
		);

		expect(formatted.get()).toBe('en-US@UTC');

		Tempo.init({ locale: 'fr-FR', timeZone: 'Europe/Paris' });
		expect(Tempo.signals.locale.get()).toBe('fr-FR');
		expect(Tempo.signals.timeZone.get()).toBe('Europe/Paris');
		expect(formatted.get()).toBe('fr-FR@Europe/Paris');

		Tempo.init({ locale: 'ja-JP', timeZone: 'Europe/Paris' });
		expect(Tempo.signals.locale.get()).toBe('ja-JP');
		expect(formatted.get()).toBe('ja-JP@Europe/Paris');
	});

	it('stops updating after disposeConfigSignals() and re-attaches on Tempo.use(SignalsPlugin)', () => {
		const locale = localeSignal();
		const timeZone = timeZoneSignal();

		disposeConfigSignals();

		Tempo.init({ locale: 'de-DE', timeZone: 'Europe/Berlin' });
		expect(locale.get()).toBe('en-US');
		expect(timeZone.get()).toBe('UTC');

		Tempo.use(SignalsPlugin);
		expect(locale.get()).toBe('de-DE');
		expect(timeZone.get()).toBe('Europe/Berlin');

		Tempo.init({ locale: 'es-ES', timeZone: 'Europe/Madrid' });
		expect(locale.get()).toBe('es-ES');
		expect(timeZone.get()).toBe('Europe/Madrid');

		Tempo.init({ locale: () => 'pt-BR', timeZone: () => 'America/Sao_Paulo' });
		expect(locale.get()).toBe('pt-BR');
		expect(timeZone.get()).toBe('America/Sao_Paulo');
	});
});
