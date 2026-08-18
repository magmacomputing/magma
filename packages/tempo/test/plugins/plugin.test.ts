import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/plugin/plugin.type.js';

describe('Tempo Plugin System', () => {

	test('should extend Tempo with a static method', () => {
		const staticPlugin: Plugin = {
			name: 'StaticPlugin',
			install(TempoClass) {
				(TempoClass as any).staticMethod = () => 'static';
			},
		};

		Tempo.extend(staticPlugin);
		expect((Tempo as any).staticMethod()).toBe('static');
	});

	test('should extend Tempo with an instance method', () => {
		const instancePlugin: Plugin = {
			name: 'InstancePlugin',
			install(TempoClass) {
				(TempoClass.prototype as any).instanceMethod = function () {
					return 'instance';
				};
			},
		};

		Tempo.extend(instancePlugin);
		const t = new Tempo();
		expect((t as any).instanceMethod()).toBe('instance');
	});

	test('should not install the same plugin twice', () => {
		let installCount = 0;
		const singlePlugin: Plugin = {
			name: 'SinglePlugin',
			install() { installCount++; },
		};

		Tempo.extend(singlePlugin);
		Tempo.extend(singlePlugin);
		expect(installCount).toBe(1);
	});

	test('should auto-load plugins from init extends option', () => {
		let loaded = false;
		const initPlugin: Plugin = {
			name: 'InitExtendsPlugin',
			install() { loaded = true; },
		};

		Tempo.init({ extends: [initPlugin] });
		expect(loaded).toBe(true);
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

	test('should support legacy plugins array registration with @deprecated fallback', () => {
		let loaded = false;
		const legacyPlugin: Plugin = {
			name: 'LegacyArrayPlugin',
			install() { loaded = true; },
		};

		Tempo.init({ plugins: [legacyPlugin] });
		expect(loaded).toBe(true);
	});

	test('should auto-load plugins from global discovery extends', () => {
		const testDiscovery = '$TempoTestDiscoveryExtends';
		const discoveryKey = Symbol.for(testDiscovery);
		let loaded = false;
		const discoveryPlugin: Plugin = {
			name: 'DiscoveryExtendsPlugin',
			install() { loaded = true; },
		};

		(globalThis as any)[discoveryKey] = {
			extends: [discoveryPlugin],
		};

		try {
			Tempo.init({ discovery: testDiscovery });
			expect(loaded).toBe(true);
		} finally {
			delete (globalThis as any)[discoveryKey];
		}
	});

	test('should auto-load plugins from global discovery legacy plugins array', () => {
		const testDiscovery = '$TempoTestDiscoveryLegacy';
		const discoveryKey = Symbol.for(testDiscovery);
		let loaded = false;
		const discoveryPlugin: Plugin = {
			name: 'DiscoveryLegacyPlugin',
			install() { loaded = true; },
		};

		(globalThis as any)[discoveryKey] = {
			plugins: [discoveryPlugin],
		};

		try {
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
		const discoveryPlugin: Plugin = {
			name: 'ConfiguredDiscoveryPlugin',
			install(tempo) {
				pluginConfigDuringInstall = (tempo.config as any)?.plugins?.ConfiguredDiscoveryPlugin;
			},
		};

		(globalThis as any)[discoveryKey] = {
			plugins: {
				ConfiguredDiscoveryPlugin: { apiKey: 'test-key-123', customOption: true },
			},
			extends: [discoveryPlugin],
		};

		try {
			Tempo.init({ discovery: testDiscovery });
			expect(pluginConfigDuringInstall).toEqual({ apiKey: 'test-key-123', customOption: true });
			expect((Tempo.config as any)?.plugins?.ConfiguredDiscoveryPlugin).toEqual({ apiKey: 'test-key-123', customOption: true });
		} finally {
			delete (globalThis as any)[discoveryKey];
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
		const newPlugin: Plugin = {
			name: 'NewPlugin',
			install(TempoClass) {
				(TempoClass as any).freshMethod = () => 'fresh';
			},
		};
		Tempo.extend(newPlugin);
		expect((Tempo as any).freshMethod()).toBe('fresh');
	});

	test('should protect Symbol properties (like Symbol.dispose)', () => {
		expect(() => {
			(Tempo as any)[Symbol.dispose] = () => { };
		}).toThrow();
	});
});
