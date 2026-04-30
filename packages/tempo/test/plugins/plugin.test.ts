import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/plugin/plugin.type.js';

describe('Tempo Plugin System', () => {

	test('should extend Tempo with a static method', () => {
		const staticPlugin: Plugin = {
			name: 'StaticPlugin',
			install(this: Tempo, TempoClass) {
				(TempoClass as any).staticMethod = () => 'static';
			},
		};

		Tempo.extend(staticPlugin);
		expect((Tempo as any).staticMethod()).toBe('static');
	});

	test('should extend Tempo with an instance method', () => {
		const instancePlugin: Plugin = {
			name: 'InstancePlugin',
			install(this: Tempo, TempoClass) {
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

	test('should auto-load plugins from init options', () => {
		let loaded = false;
		const initPlugin: Plugin = {
			name: 'InitPlugin',
			install() { loaded = true; },
		};

		Tempo.init({ plugins: [initPlugin] });
		expect(loaded).toBe(true);
	});

	test('should auto-load plugins from global discovery', () => {
		const testDiscovery = '$TempoTestDiscovery';
		const discoveryKey = Symbol.for(testDiscovery);
		let loaded = false;
		const discoveryPlugin: Plugin = {
			name: 'DiscoveryPlugin',
			install() { loaded = true; },
		};

		(globalThis as any)[discoveryKey] = {
			plugins: [discoveryPlugin]
		};

		try {
			Tempo.init({ discovery: testDiscovery });
			expect(loaded).toBe(true);
		} finally {
			delete (globalThis as any)[discoveryKey];
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
			install(this: Tempo, TempoClass) {
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
