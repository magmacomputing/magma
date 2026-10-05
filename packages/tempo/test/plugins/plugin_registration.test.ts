import { Tempo } from '#tempo';
import { definePlugin } from '#tempo/plugin/plugin.util.js';

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
		const DynamicTestPlugin = definePlugin({
			name: 'DynamicTestPlugin',
			install(TempoClass: any) {
				TempoClass.dynamicRegistered = true;
			}
		});

		// Explicitly freeze the internal arrays to simulate external deep-freeze
		const rt = (Tempo as any)[Symbol.for('$LibraryInternal')]?.() ?? {};
		if (rt.pluginsDb?.plugins) Object.freeze(rt.pluginsDb.plugins);

		expect(() => {
			Tempo.use(DynamicTestPlugin);
		}).not.toThrow();

		expect((Tempo as any).dynamicRegistered).toBe(true);
	});
});
