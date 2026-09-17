import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/plugin/plugin.type.js';
import { definePlugin } from '#tempo/plugin/plugin.util.js';
import { defineTerm } from '#tempo/plugin/term/term.util.js';

describe('Colocated Plugin Options & Factories', () => {

	test('Pattern 1: Callable Plugin Factory (options passed via function call)', () => {
		let installedOptions: any = null;

		interface TickerOpts { interval?: number; active?: boolean }
		const TickerPlugin = definePlugin<Plugin, TickerOpts>({
			name: 'colocatedTicker',
			install(TempoClass, options) {
				installedOptions = options;
			},
		});

		Tempo.use(TickerPlugin({ interval: 500, active: true }));

		expect(installedOptions).toEqual({ interval: 500, active: true });
		expect(Tempo.config.pluginOptions?.colocatedTicker?.interval).toBe(500);
		expect(Tempo.config.pluginOptions?.colocatedTicker?.active).toBe(true);
	});

	test('Pattern 2: Tuple Syntax [Plugin, Options]', () => {
		let installedOptions: any = null;

		interface GeoOpts { timeout?: number; highAccuracy?: boolean }
		const GeoPlugin = definePlugin<Plugin, GeoOpts>({
			name: 'colocatedGeo',
			install(TempoClass, options) {
				installedOptions = options;
			},
		});

		Tempo.use([GeoPlugin, { timeout: 750, highAccuracy: true }]);

		expect(installedOptions).toEqual({ timeout: 750, highAccuracy: true });
		expect(Tempo.config.pluginOptions?.colocatedGeo?.timeout).toBe(750);
		expect(Tempo.config.pluginOptions?.colocatedGeo?.highAccuracy).toBe(true);
	});

	test('Bare Plugin Registration maintains 100% backward compatibility', () => {
		let installedOptions: any = 'not-called';

		const BarePlugin = definePlugin<Plugin>({
			name: 'colocatedBare',
			install(TempoClass, options) {
				installedOptions = options;
			},
		});

		Tempo.use(BarePlugin);

		expect(installedOptions).toBeUndefined();
	});

	test('Trailing Options in Tempo.use(plugin, options) maintains backward compatibility', () => {
		let installedOptions: any = null;

		const TrailingPlugin = definePlugin<Plugin>({
			name: 'colocatedTrailing',
			install(TempoClass, options) {
				installedOptions = options;
			},
		});

		Tempo.use(TrailingPlugin, { trailing: true });

		expect(installedOptions).toEqual({ trailing: true });
		expect(Tempo.config.pluginOptions?.colocatedTrailing?.trailing).toBe(true);
	});

	test('Option Precedence: call-site options override trailing options and existing config', () => {
		let installedOptions: any = null;

		const PrecedencePlugin = definePlugin<Plugin>({
			name: 'colocatedPrecedence',
			install(TempoClass, options) {
				installedOptions = options;
			},
		});

		// Pre-configure options in Tempo.config.pluginOptions
		Tempo.init({
			pluginOptions: {
				colocatedPrecedence: {
					interval: 1000,
					color: 'blue',
					timeout: 3000,
				},
			},
		});

		// Register with trailing options AND call-site tuple
		Tempo.use([PrecedencePlugin, { interval: 500, timeout: 4000 }]);

		// Call-site tuple (500, 4000) overrides existing config (1000, 3000), while preserving color ('blue')
		expect(installedOptions.interval).toBe(500);
		expect(installedOptions.timeout).toBe(4000);
		expect(installedOptions.color).toBe('blue');

		expect(Tempo.config.pluginOptions?.colocatedPrecedence?.interval).toBe(500);
		expect(Tempo.config.pluginOptions?.colocatedPrecedence?.timeout).toBe(4000);
		expect(Tempo.config.pluginOptions?.colocatedPrecedence?.color).toBe('blue');
	});

	test('Pattern 1 with Term Plugins: Callable Term Factory', () => {
		const AstroTerm = defineTerm({
			key: 'colocatedAstro',
			scope: 'colocatedAstro',
			description: 'Astronomical seasons test term',
			define() {
				return undefined;
			},
		});

		Tempo.use(AstroTerm({ sphere: 'south', precision: 'high' }));

		expect(Tempo.config.pluginOptions?.colocatedAstro?.sphere).toBe('south');
		expect(Tempo.config.pluginOptions?.colocatedAstro?.precision).toBe('high');
		expect(Tempo.terms['colocatedAstro']?.options?.sphere).toBe('south');
	});

	test('Pattern 2 with Term Plugins: Tuple Syntax [TermPlugin, Options]', () => {
		const LunarTerm = defineTerm({
			key: 'colocatedLunar',
			scope: 'colocatedLunar',
			description: 'Lunar phase test term',
			define() {
				return undefined;
			},
		});

		Tempo.use([LunarTerm, { hemisphere: 'southern' }]);

		expect(Tempo.config.pluginOptions?.colocatedLunar?.hemisphere).toBe('southern');
		expect(Tempo.terms['colocatedLunar']?.options?.hemisphere).toBe('southern');
	});

	test('Mixed plugins array in Tempo.init supports Bare, Factory, and Tuples together', () => {
		let p1Loaded = false;
		let p2Options: any = null;
		let p3Options: any = null;

		const P1 = definePlugin({
			name: 'mixedP1',
			install() { p1Loaded = true; },
		});
		const P2 = definePlugin({
			name: 'mixedP2',
			install(cls, opts) { p2Options = opts; },
		});
		const P3 = definePlugin({
			name: 'mixedP3',
			install(cls, opts) { p3Options = opts; },
		});

		Tempo.init({
			plugins: [
				P1,
				P2({ p2: true }),
				[P3, { p3: true }],
			],
		});

		expect(p1Loaded).toBe(true);
		expect(p2Options).toEqual({ p2: true });
		expect(p3Options).toEqual({ p3: true });
		expect(Tempo.config.pluginOptions?.mixedP2?.p2).toBe(true);
		expect(Tempo.config.pluginOptions?.mixedP3?.p3).toBe(true);
	});

	test('Sandbox Isolation: Tempo.create scopes colocated options to sandbox', () => {
		let sandboxOpts: any = null;

		const SandboxPlugin = definePlugin({
			name: 'isolatedPlugin',
			install(cls, opts) { sandboxOpts = opts; },
		});

		const sb = Tempo.create({
			plugins: [
				[SandboxPlugin, { isolatedPort: 8080 }],
			],
		});

		expect(sandboxOpts).toEqual({ isolatedPort: 8080 });
		expect(sb.config.pluginOptions?.isolatedPlugin?.isolatedPort).toBe(8080);
		// Global Tempo must NOT be polluted
		expect(Tempo.config.pluginOptions?.isolatedPlugin).toBeUndefined();
	});

	test('Inert Unused Options: pre-configuring unknown or lazy plugins causes no errors', () => {
		expect(() => {
			Tempo.init({
				pluginOptions: {
					uninstalledAI: { model: 'gpt-4o', timeout: 15000 },
					uninstalledFinance: { currency: 'EUR' },
				},
			});
		}).not.toThrow();

		expect(Tempo.config.pluginOptions?.uninstalledAI?.model).toBe('gpt-4o');
		expect(Tempo.config.pluginOptions?.uninstalledFinance?.currency).toBe('EUR');
	});

});
