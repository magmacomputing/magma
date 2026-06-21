import { Tempo } from '#tempo';
import path from 'node:path';

describe('Tempo.bootstrap()', () => {
	afterEach(() => {
		Tempo.init();
	});

	it('should dynamically discover and load a configuration file', async () => {
		// Resolve the fixture directory from the workspace root
		const fixtureDir = path.resolve('./test/core/__fixtures__/config');

		await Tempo.bootstrap({ cwd: fixtureDir });

		expect(Tempo.config.timeZone).toBe('Europe/Paris');

		const t = new Tempo('custom-bootstrap-period');
		expect(t.isValid).toBe(true);
		expect(t.format('{h24}:{mi}')).toBe('13:00');
	});

	it('should allow explicitly passing a configFile', async () => {
		const fixtureDir = path.resolve('./test/core/__fixtures__/config');

		// Pass the explicit file path
		await Tempo.bootstrap({ configFile: path.join(fixtureDir, 'tempo.config.js') });

		expect(Tempo.config.timeZone).toBe('Europe/Paris');

		const t = new Tempo('custom-bootstrap-period');
		expect(t.isValid).toBe(true);
		expect(t.format('{h24}:{mi}')).toBe('13:00');
	});
});
