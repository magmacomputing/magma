import { resolveConfig } from '#tempo/config/config.resolve.js';
import * as requestLib from '#library/request.library.js';

describe('Remote and Cascading Config Resolution', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test('should fetch and parse remote JSONC config from https URL', async () => {
		const mockJsonc = `
		{
			// Corporate base config
			"timeZone": "Asia/Tokyo",
			"locale": "ja-JP"
		}
		`;

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			if (String(url) === 'https://config.internal.org/tempo.config.jsonc') {
				return mockJsonc;
			}
			throw new Error('Not found');
		});

		const config = await resolveConfig({ configFile: 'https://config.internal.org/tempo.config.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Asia/Tokyo');
		expect(config?.locale).toBe('ja-JP');
	});

	test('should handle localhost HTTP URLs', async () => {
		const mockJson = JSON.stringify({ timeZone: 'Europe/London', debug: 1 });

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			if (String(url) === 'http://localhost:8080/tempo.config.json') {
				return mockJson;
			}
			throw new Error('Not found');
		});

		const config = await resolveConfig({ configFile: 'http://localhost:8080/tempo.config.json' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Europe/London');
		expect(config?.debug).toBe(1);
	});

	test('should recursively resolve "extends" from remote base config', async () => {
		const baseRemoteConfig = `
		{
			"timeZone": "UTC",
			"locale": "en-US",
			"registry": {
				"formats": { "custom": "{yyyy}-{mm}-{dd}" }
			}
		}
		`;

		const childRemoteConfig = `
		{
			"extends": "https://company.org/base.jsonc",
			"locale": "en-AU"
		}
		`;

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const strUrl = String(url);
			if (strUrl === 'https://company.org/child.jsonc') return childRemoteConfig;
			if (strUrl === 'https://company.org/base.jsonc') return baseRemoteConfig;
			throw new Error(`404: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/child.jsonc' });
		expect(config).toBeDefined();
		// Inherited from base
		expect(config?.timeZone).toBe('UTC');
		expect(config?.registry?.formats?.custom).toBe('{yyyy}-{mm}-{dd}');
		// Overridden by child
		expect(config?.locale).toBe('en-AU');
	});

	test('should protect against circular extends loops', async () => {
		const configA = `{ "extends": "https://company.org/b.jsonc", "timeZone": "UTC" }`;
		const configB = `{ "extends": "https://company.org/a.jsonc", "locale": "fr-FR" }`;

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const strUrl = String(url);
			if (strUrl === 'https://company.org/a.jsonc') return configA;
			if (strUrl === 'https://company.org/b.jsonc') return configB;
			throw new Error(`404: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/a.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect(config?.locale).toBe('fr-FR');
	});

	test('should return undefined and log warning on network error or 404', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(requestLib, 'fetchRequest').mockRejectedValue(new Error('Network error'));

		const config = await resolveConfig({ configFile: 'https://invalid.domain/missing.jsonc' });
		expect(config).toBeUndefined();
		expect(warnSpy).toHaveBeenCalled();
	});
});
