import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/plugin/plugin.type.js';

describe('Tempo Reactive Registration', () => {
	test('late-imported plugin is automatically registered', async () => {
		// Initially, the plugin-provided method should NOT exist if we haven't loaded it yet
		// (Assuming we haven't imported it in this test context yet)

		// Let's verify we are initialized
		expect(Tempo.config.scope).toBe('global')

		const { registerPlugin, definePlugin } = await import('#tempo/plugin/plugin.util.js')
		const myLatePlugin: Plugin = definePlugin({
			name: 'LateDiscovery',
			install(TempoClass) {
				(TempoClass as any).lateMethod = () => 'it works!'
			},
		})

		// Register it (simulating side-effect import)
		registerPlugin(myLatePlugin)

		// Now, WITHOUT manual Tempo.init(), it should still be there!
		expect((Tempo as any).lateMethod).toBeDefined()
		expect((Tempo as any).lateMethod()).toBe('it works!')

		// Cleanup
		delete (Tempo as any).lateMethod
	})
})
