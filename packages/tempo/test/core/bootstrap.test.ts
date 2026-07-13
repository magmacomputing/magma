import { Tempo } from '#tempo';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Tempo.bootstrap()', () => {
	afterEach(() => {
		Tempo.init();
	});

	it('should dynamically discover and load a configuration file', async () => {
		// Resolve the fixture directory from the workspace root
		const fixtureDir = path.resolve(__dirname, '__fixtures__/config');

		await Tempo.bootstrap({ cwd: fixtureDir });

		expect(Tempo.config.timeZone).toBe('Europe/Paris');

		const t = new Tempo('custom-bootstrap-period');
		expect(t.isValid).toBe(true);
		expect(t.format('{h24}:{mi}')).toBe('13:00');
	});

	it('should allow explicitly passing a configFile', async () => {
		const fixtureDir = path.resolve(__dirname, '__fixtures__/config');

		// Pass the explicit file path
		await Tempo.bootstrap({ configFile: path.join(fixtureDir, 'tempo.config.js') });

		expect(Tempo.config.timeZone).toBe('Europe/Paris');

		const t = new Tempo('custom-bootstrap-period');
		expect(t.isValid).toBe(true);
		expect(t.format('{h24}:{mi}')).toBe('13:00');
	});
});
