import { Tempo } from '#tempo';
import { definePlugin } from '#tempo/plugin/plugin.util.js';
import { defineTerm } from '#tempo/plugin/term/term.util.js';
import { $Internal, getRuntime } from '#tempo/support';

const DummyPlugin = definePlugin({
	name: 'DummyPlugin',
	install(TempoClass: any) {
		TempoClass.dummy = true;
	}
});

describe('Plugin Registration / Initialization', () => {
	test('Plugins should survive Tempo.init() reset', () => {
		// 1. Verify installed
		Tempo.use(DummyPlugin);
		Tempo.init();
		expect((Tempo as any).dummy).toBe(true);

		// 2. Perform a hard reset (empty init)
		Tempo.init();

		// 3. Verify it's STILL installed (init() should have re-extended from $Plugins)
		expect((Tempo as any).dummy).toBe(true);
	});

	test('Dynamic plugin registration does not throw when state or pluginsDb is non-extensible', () => {
		// Explicitly freeze pluginsDb and its plugins array to simulate external deep-freeze
		const state = (Tempo as any)[$Internal]?.();
		expect(Array.isArray(state?.pluginsDb?.plugins)).toBe(true);
		const originalPlugins = state.pluginsDb.plugins;
		Object.freeze(originalPlugins);
		Object.freeze(state.pluginsDb);

		const DynamicTestPlugin = definePlugin({
			name: 'DynamicTestPlugin',
			install(TempoClass: any) {
				TempoClass.dynamicRegistered = true;
			}
		});

		// 1. Test append path on non-extensible pluginsDb
		expect(() => {
			Tempo.use(DynamicTestPlugin);
		}).not.toThrow();

		const updatedState = (Tempo as any)[$Internal]?.();
		expect((Tempo as any).dynamicRegistered).toBe(true);
		expect(updatedState.pluginsDb.plugins).not.toBe(originalPlugins);
		expect(updatedState.pluginsDb.plugins.some((p: any) => p.name === 'DynamicTestPlugin')).toBe(true);

		// 2. Test replace path on non-extensible pluginsDb
		Object.freeze(updatedState.pluginsDb.plugins);
		Object.freeze(updatedState.pluginsDb);

		const ReplacementPlugin = definePlugin({
			name: 'DynamicTestPlugin',
			install(TempoClass: any) {
				TempoClass.dynamicRegisteredReplaced = true;
			}
		});

		expect(() => {
			Tempo.use(ReplacementPlugin, { force: true });
		}).not.toThrow();

		const finalState = (Tempo as any)[$Internal]?.();
		expect((Tempo as any).dynamicRegisteredReplaced).toBe(true);
		expect(finalState.pluginsDb.plugins.find((p: any) => p.name === 'DynamicTestPlugin')).toBe(ReplacementPlugin);
	});

	test('Dynamic term registration does not throw when state or pluginsDb is non-extensible', () => {
		const state = (Tempo as any)[$Internal]?.();
		expect(Array.isArray(state?.pluginsDb?.terms)).toBe(true);
		const originalTerms = state.pluginsDb.terms;
		Object.freeze(originalTerms);
		Object.freeze(state.pluginsDb);

		const DynamicTestTerm = defineTerm({
			key: 'dynamicTestTerm',
			scope: 'dynamicTestTerm',
			description: 'Dynamic test term',
			define() {
				return undefined;
			},
		});

		// 1. Test append path on non-extensible pluginsDb
		expect(() => {
			Tempo.use(DynamicTestTerm);
		}).not.toThrow();

		const updatedState = (Tempo as any)[$Internal]?.();
		expect(updatedState.pluginsDb.terms).not.toBe(originalTerms);
		expect(updatedState.pluginsDb.terms.some((t: any) => t.key === 'dynamicTestTerm')).toBe(true);

		// 2. Test replace path on non-extensible pluginsDb (e.g. HMR / test reload)
		Object.freeze(updatedState.pluginsDb.terms);
		Object.freeze(updatedState.pluginsDb);

		const ReplacementTerm = {
			key: 'dynamicTestTerm',
			scope: 'dynamicTestTerm',
			description: 'Replacement test term',
			define() {
				return undefined;
			},
		} as any;

		expect(() => {
			getRuntime().addTerm(updatedState, ReplacementTerm);
		}).not.toThrow();

		const finalState = (Tempo as any)[$Internal]?.();
		expect(finalState.pluginsDb.terms.find((t: any) => t.key === 'dynamicTestTerm')).toBe(ReplacementTerm);
	});
});
