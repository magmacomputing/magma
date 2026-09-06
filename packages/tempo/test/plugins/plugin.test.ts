import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/plugin/plugin.type.js';
import { definePlugin } from '#tempo/plugin/plugin.util.js';

describe('Tempo Plugin System', () => {

	test('should extend Tempo with a static method', () => {
		const staticPlugin: Plugin = definePlugin({
			name: 'StaticPlugin',
			install(TempoClass) {
				(TempoClass as any).staticMethod = () => 'static';
			},
		});

		Tempo.use(staticPlugin);
		expect((Tempo as any).staticMethod()).toBe('static');
	});

	test('should extend Tempo with an instance method', () => {
		const instancePlugin: Plugin = definePlugin({
			name: 'InstancePlugin',
			install(TempoClass) {
				(TempoClass.prototype as any).instanceMethod = function () {
					return 'instance';
				};
			},
		});

		Tempo.use(instancePlugin);
		const t = new Tempo();
		expect((t as any).instanceMethod()).toBe('instance');
	});

	test('should not install the same plugin twice', () => {
		let installCount = 0;
		const singlePlugin: Plugin = definePlugin({
			name: 'SinglePlugin',
			install() { installCount++; },
		});

		Tempo.use(singlePlugin);
		Tempo.use(singlePlugin);
		expect(installCount).toBe(1);
	});

	test('should auto-load plugins from init plugins option', () => {
		let loaded = false;
		const initPlugin: Plugin = definePlugin({
			name: 'InitPluginsPlugin',
			install() { loaded = true; },
		});

		Tempo.init({ plugins: [initPlugin] });
		expect(loaded).toBe(true);
	});

	test('should auto-load both plugins and terms via init plugins option', () => {
		let pluginInstalled = false;

		const testPlugin: Plugin = definePlugin({
			name: 'TestPluginMulti',
			install() { pluginInstalled = true; },
		});

		const testTerm = {
			key: 'customTermMulti',
			define(tempo: any) {
				return tempo;
			},
		};

		Tempo.init({ plugins: [testPlugin, testTerm] });
		expect(pluginInstalled).toBe(true);
		expect(Tempo.terms['customTermMulti']?.key).toBe('customTermMulti');
	});

	test('should store plugin configuration dictionary in Tempo.config.plugins', () => {
		Tempo.init({
			plugins: {
				ai: {
					mode: 'fallback',
					timeout: 5000,
				},
			},
		});
		expect(Tempo.config.plugins?.ai?.mode).toBe('fallback');
		expect(Tempo.config.plugins?.ai?.timeout).toBe(5000);
	});

	test('should allow plugin configuration dictionary inside plugins array alongside plugins', () => {
		let pluginInstalled = false;
		const testPlugin: Plugin = definePlugin({
			name: 'TestPluginWithDict',
			install() { pluginInstalled = true; },
		});

		Tempo.init({
			plugins: [
				testPlugin,
				{
					ai: {
						mode: 'fallback',
						timeout: 8000,
					},
				},
			],
		});
		expect(pluginInstalled).toBe(true);
		expect(Tempo.config.plugins?.ai?.mode).toBe('fallback');
		expect(Tempo.config.plugins?.ai?.timeout).toBe(8000);
	});

	test('should auto-load plugins from global discovery plugins', () => {
		const testDiscovery = '$TempoTestDiscoveryPlugins';
		const discoveryKey = Symbol.for(testDiscovery);
		let loaded = false;
		const discoveryPlugin: Plugin = {
			name: 'DiscoveryPluginsPlugin',
			install() { loaded = true; },
		} as Plugin;

		(globalThis as any)[discoveryKey] = {
			plugins: [discoveryPlugin],
		};

		try {
			expect(loaded).toBe(false);
			Tempo.init({ discovery: testDiscovery });
			expect(loaded).toBe(true);
		} finally {
			delete (globalThis as any)[discoveryKey];
		}
	});

	test('should allow discovery-installed plugin to read its configuration from Tempo.config.plugins during install()', () => {
		const testDiscovery = '$TempoTestDiscoveryConfig';
		const discoveryKey = Symbol.for(testDiscovery);
		let pluginConfigDuringInstall: any = null;

		const discoveryPlugin: Plugin = definePlugin({
			name: 'ConfiguredDiscoveryPlugin',
			install(tempo) {
				pluginConfigDuringInstall = (tempo.config as any)?.plugins?.ConfiguredDiscoveryPlugin;
			},
		});

		(globalThis as any)[discoveryKey] = {
			plugins: [discoveryPlugin],
		};

		try {
			Tempo.init({
				discovery: testDiscovery,
				plugins: {
					ConfiguredDiscoveryPlugin: { apiKey: 'test-key-123', customOption: true },
				},
			});
			expect(pluginConfigDuringInstall).toEqual({ apiKey: 'test-key-123', customOption: true });
			expect((Tempo.config as any)?.plugins?.ConfiguredDiscoveryPlugin).toEqual({ apiKey: 'test-key-123', customOption: true });
		} finally {
			delete (globalThis as any)[discoveryKey];
			Tempo.init();
		}
	});

	test('should configure plugins via pluginOptions and maintain legacy plugins fallback', () => {
		try {
			Tempo.init({
				pluginOptions: {
					samplePlugin: { timeout: 5000, enabled: true },
				},
			});
			expect((Tempo.config as any)?.pluginOptions?.samplePlugin).toEqual({ timeout: 5000, enabled: true });
			expect((Tempo.config as any)?.plugins?.samplePlugin).toEqual({ timeout: 5000, enabled: true });
		} finally {
			Tempo.init();
		}
	});

	test('should populate both plugins and pluginOptions when using deprecated plugins dictionary', () => {
		try {
			Tempo.init({
				plugins: {
					legacyPlugin: { retries: 3 },
				},
			});
			expect((Tempo.config as any)?.plugins?.legacyPlugin).toEqual({ retries: 3 });
			expect((Tempo.config as any)?.pluginOptions?.legacyPlugin).toEqual({ retries: 3 });
		} finally {
			Tempo.init();
		}
	});

	test('should protect existing members but allow new ones', () => {
		// 1. Try to overwrite existing (should throw in strict mode)
		// Note: Tempo.now is a static method we want to protect
		expect(() => {
			(Tempo as any).now = () => 'hacked';
		}).toThrow();

		// 2. Try to add new (should succeed)
		const newPlugin: Plugin = definePlugin({
			name: 'NewPlugin',
			install(TempoClass) {
				(TempoClass as any).freshMethod = () => 'fresh';
			},
		});
		Tempo.use(newPlugin);
		expect((Tempo as any).freshMethod()).toBe('fresh');
	});

	test('should protect Symbol properties (like Symbol.dispose)', () => {
		expect(() => {
			(Tempo as any)[Symbol.dispose] = () => { };
		}).toThrow();
	});
});
