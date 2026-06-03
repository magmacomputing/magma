import { Tempo } from '#tempo/core';
import { Pledge } from '#library/pledge.class.js';
import { FormatModule } from '#tempo/format';
import { MutateModule } from '#tempo/mutate';

Tempo.extend(FormatModule, MutateModule);

describe('Static Symbol.dispose', () => {

	test('Tempo static dispose resets global config', () => {
		// 1. Set a non-default config
		Tempo.init({ timeZone: 'Africa/Cairo' });
		expect(Tempo.config.timeZone).toBe('Africa/Cairo');

		// 2. Dispose
		if (typeof Symbol.dispose === 'symbol') {
			Tempo[Symbol.dispose]();

			// 3. Verify reset (should match system timezone)
			const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
			expect(Tempo.config.timeZone).toBe(timeZone);
		}
	});

	test('Pledge static dispose resets static state', () => {
		// 1. Set a non-default static config
		Pledge.init({ debug: 5, silent: true, tag: 'TestPledge' });
		expect(Pledge.status.debug).toBe(5);
		expect(Pledge.status.tag).toBe('TestPledge');

		// 2. Dispose
		if (typeof Symbol.dispose === 'symbol') {
			Pledge[Symbol.dispose]();

			// 3. Verify reset
			expect(Pledge.status.debug).toBeFalsy();
			expect(Pledge.status.tag).toBeUndefined();
		}
	});
	test('Tempo static dispose resets global config (using syntax)', () => {
		const systemTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
		{
			using _ = Tempo;
			Tempo.init({ timeZone: 'Africa/Cairo' });
			expect(Tempo.config.timeZone).toBe('Africa/Cairo');
		}
		// Should be reset to system default after block
		expect(Tempo.config.timeZone).toBe(systemTZ);
	});

});
