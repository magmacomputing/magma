import { Tempo } from '#tempo';
import { defineExtension } from '#tempo/plugin/plugin.util.js';

const DummyModule = defineExtension({
	name: 'DummyModule',
	install(TempoClass: any) {
		TempoClass.dummy = true;
	}
});

describe('Plugin Registration / Initialization', () => {
	test('Plugins should survive Tempo.init() reset', () => {
		// 1. Verify installed
		Tempo.extend(DummyModule);
		Tempo.init();
		expect((Tempo as any).dummy).toBe(true);

		// 2. Perform a hard reset (empty init)
		Tempo.init();

		// 3. Verify it's STILL installed (init() should have re-extended from $Plugins)
		expect((Tempo as any).dummy).toBe(true);
	});
});
