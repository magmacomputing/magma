import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '#tempo/config/config.resolve.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '__fixtures__/config');

describe('Hardened Local Config Resolution and Extends', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test('should reject remote HTTP(S) configFile with warning and return undefined', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const config = await resolveConfig({ configFile: 'https://example.com/tempo.config.jsonc' });
		expect(config).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote HTTP(S) configFile is not supported: https://example.com/tempo.config.jsonc')
		);
	});

	test('should reject localhost HTTP configFile with warning and return undefined', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const config = await resolveConfig({ configFile: 'http://localhost:8080/tempo.config.json' });
		expect(config).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote HTTP(S) configFile is not supported: http://localhost:8080/tempo.config.json')
		);
	});

	test('should reject file: URLs with non-empty hostname other than localhost with warning and return undefined', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const config = await resolveConfig({ configFile: 'file://host/share/tempo.config.js' });
		expect(config).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote file URL with host is not supported: file://host/share/tempo.config.js')
		);
	});

	test('should recursively resolve "extends" from local static JSONC base config', async () => {
		const childConfigPath = path.join(fixturesDir, 'child.jsonc');
		const config = await resolveConfig({ configFile: childConfigPath });

		expect(config).toBeDefined();
		// Inherited from base.jsonc
		expect(config?.timeZone).toBe('UTC');
		expect(config?.registry?.formats?.custom).toBe('{yyyy}-{mm}-{dd}');
		// Overridden by child.jsonc
		expect(config?.locale).toBe('en-AU');
	});

	test('should protect against circular extends loops in local files and emit warning', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const circularPath = path.join(fixturesDir, 'circular-a.jsonc');
		const config = await resolveConfig({ configFile: circularPath });

		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect(config?.locale).toBe('fr-FR');
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Circular extends detected'));
	});

	test('should safely ignore remote HTTP extends with a warning without making network calls', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const remoteExtendsPath = path.join(fixturesDir, 'remote-extends.jsonc');
		const config = await resolveConfig({ configFile: remoteExtendsPath });

		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Asia/Tokyo');
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote HTTP(S) config extends is not supported, skipping: https://example.com/remote.jsonc')
		);
	});

	test('should reject non-JSON extends targets with a warning to prevent arbitrary code execution', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const nonJsonExtendsPath = path.join(fixturesDir, 'non-json-extends.jsonc');
		const config = await resolveConfig({ configFile: nonJsonExtendsPath });

		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Asia/Tokyo');
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Config extends only supports static .json and .jsonc data files, skipping:')
		);
	});

	test('should load top-level local JS config file', async () => {
		const jsConfigPath = path.join(fixturesDir, 'tempo.config.js');
		const config = await resolveConfig({ configFile: jsConfigPath });

		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Europe/Paris');
	});
});
