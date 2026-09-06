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
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
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
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Circular extends detected'));
	});

	test('should return undefined and log warning on network error or 404', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(requestLib, 'fetchRequest').mockRejectedValue(new Error('Network error'));

		const config = await resolveConfig({ configFile: 'https://invalid.domain/missing.jsonc' });
		expect(config).toBeUndefined();
		expect(warnSpy).toHaveBeenCalled();
	});

	test('should parse commented JSONC served with application/json Content-Type', async () => {
		const jsoncWithComments = `
		{
			// Server returns application/json Content-Type header
			"timeZone": "Asia/Tokyo",
			"locale": "ja-JP",
		}
		`;

		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn().mockResolvedValue(new Response(jsoncWithComments, {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}));

		try {
			const config = await resolveConfig({ configFile: 'https://api.internal.org/tempo.config.jsonc' });
			expect(config).toBeDefined();
			expect(config?.timeZone).toBe('Asia/Tokyo');
			expect(config?.locale).toBe('ja-JP');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('should allow sibling branches to independently load shared base configs', async () => {
		const rootConfig = `{ "extends": ["https://company.org/b.jsonc", "https://company.org/c.jsonc"] }`;
		const configB = `{ "extends": "https://company.org/shared-base.jsonc", "timeZone": "Asia/Tokyo" }`;
		const configC = `{ "extends": "https://company.org/shared-base.jsonc", "locale": "ja-JP" }`;
		const sharedBase = `{ "debug": 2 }`;

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const strUrl = String(url);
			if (strUrl === 'https://company.org/root.jsonc') return rootConfig;
			if (strUrl === 'https://company.org/b.jsonc') return configB;
			if (strUrl === 'https://company.org/c.jsonc') return configC;
			if (strUrl === 'https://company.org/shared-base.jsonc') return sharedBase;
			throw new Error(`404: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/root.jsonc' });
		expect(config).toBeDefined();
		expect(config?.debug).toBe(2);
		expect(config?.timeZone).toBe('Asia/Tokyo');
		expect(config?.locale).toBe('ja-JP');
	});

	test('should enforce max extends depth limit and emit warning', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const num = parseInt(String(url).match(/(\d+)/)?.[1] || '0', 10);
			return JSON.stringify({ extends: `https://company.org/level-${num + 1}.jsonc`, [`level_${num}`]: true });
		});

		const config = await resolveConfig({ configFile: 'https://company.org/level-0.jsonc' });
		expect(config).toBeDefined();
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Maximum config extends depth limit reached'));
	});

	test('should retain and merge parent plugins when resolving cascading config', async () => {
		const parentConfig = { plugins: { ai: { timeout: 3000 } }, timeZone: 'UTC' };

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			if (String(url) === 'https://company.org/parent.jsonc') return JSON.stringify(parentConfig);
			throw new Error('404');
		});

		const config = await resolveConfig({ configFile: 'https://company.org/parent.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect((config?.plugins as any)?.ai?.timeout).toBe(3000);
	});

	test('should retain and merge parent pluginOptions when resolving cascading config', async () => {
		const parentConfig = { pluginOptions: { ai: { timeout: 3000, model: 'gpt-4' } }, timeZone: 'UTC' };
		const childConfig = { extends: 'https://company.org/parent.jsonc', pluginOptions: { ai: { timeout: 5000 } } };

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			if (String(url) === 'https://company.org/parent.jsonc') return JSON.stringify(parentConfig);
			if (String(url) === 'https://company.org/child.jsonc') return JSON.stringify(childConfig);
			throw new Error('404');
		});

		const config = await resolveConfig({ configFile: 'https://company.org/child.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect((config?.pluginOptions as any)?.ai?.timeout).toBe(5000);
		expect((config?.pluginOptions as any)?.ai?.model).toBe('gpt-4');
	});

	test('should enforce inherited-target budget across sibling extends branches and emit warning', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const loadedTargets: string[] = [];

		const siblingUrls = Array.from({ length: 30 }, (_, i) => `https://company.org/sibling-${i}.jsonc`);
		const rootConfig = { extends: siblingUrls, timeZone: 'UTC' };

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const strUrl = String(url);
			if (strUrl === 'https://company.org/root.jsonc') return JSON.stringify(rootConfig);
			loadedTargets.push(strUrl);
			const idx = siblingUrls.indexOf(strUrl);
			return JSON.stringify({ [`sibling_${idx}`]: true });
		});

		const config = await resolveConfig({ configFile: 'https://company.org/root.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		// Initial root is depth 0, 25 inherited targets are loaded, 26th is stopped
		expect(loadedTargets.length).toBe(25);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Maximum config extends target budget reached'));
	});

	test('should share inherited-target budget across sibling branches with recursive extends', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const loadedTargets: string[] = [];

		const branchAExtends = Array.from({ length: 15 }, (_, i) => `https://company.org/a-${i}.jsonc`);
		const branchBExtends = Array.from({ length: 15 }, (_, i) => `https://company.org/b-${i}.jsonc`);

		const rootConfig = {
			extends: ['https://company.org/branch-a.jsonc', 'https://company.org/branch-b.jsonc'],
			locale: 'en-US',
		};

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const strUrl = String(url);
			if (strUrl === 'https://company.org/root.jsonc') return JSON.stringify(rootConfig);
			loadedTargets.push(strUrl);

			if (strUrl === 'https://company.org/branch-a.jsonc') {
				return JSON.stringify({ extends: branchAExtends, branchA: true });
			}
			if (strUrl === 'https://company.org/branch-b.jsonc') {
				return JSON.stringify({ extends: branchBExtends, branchB: true });
			}
			return JSON.stringify({ item: strUrl });
		});

		const config = await resolveConfig({ configFile: 'https://company.org/root.jsonc' });
		expect(config).toBeDefined();
		expect(config?.locale).toBe('en-US');
		// branch-a (1) + branchAExtends (15) + branch-b (1) + branchBExtends (8 loaded before budget 25 exhausted) = 25
		expect(loadedTargets.length).toBe(25);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Maximum config extends target budget reached'));
	});

	test('should reject non-HTTP(S) extends targets such as file:// when base config is remote', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const remoteConfig = {
			extends: 'file:///etc/passwd',
			timeZone: 'Asia/Tokyo',
		};

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			if (String(url) === 'https://company.org/malicious.jsonc') {
				return JSON.stringify(remoteConfig);
			}
			throw new Error(`Unexpected request: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/malicious.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Asia/Tokyo');
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote configuration cannot extend non-HTTP(S) target: file:///etc/passwd'),
		);
	});

	test('should reject non-HTTP(S) extends targets in cascading remote configurations', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const rootRemoteConfig = {
			extends: 'https://company.org/child.jsonc',
			timeZone: 'UTC',
		};
		const childRemoteConfig = {
			extends: ['file:///home/user/.ssh/id_rsa', 'https://company.org/safe-base.jsonc'],
			locale: 'en-US',
		};
		const safeBaseConfig = {
			debug: 1,
		};

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const str = String(url);
			if (str === 'https://company.org/root.jsonc') return JSON.stringify(rootRemoteConfig);
			if (str === 'https://company.org/child.jsonc') return JSON.stringify(childRemoteConfig);
			if (str === 'https://company.org/safe-base.jsonc') return JSON.stringify(safeBaseConfig);
			throw new Error(`404: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/root.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect(config?.locale).toBe('en-US');
		expect(config?.debug).toBe(1);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Tempo] Remote configuration cannot extend non-HTTP(S) target: file:///home/user/.ssh/id_rsa'),
		);
	});

	test('should resolve relative HTTP(S) extends within remote configuration without warning', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const parentConfig = { timeZone: 'UTC', locale: 'en-GB' };
		const childConfig = { extends: './parent.jsonc', locale: 'en-US' };

		vi.spyOn(requestLib, 'fetchRequest').mockImplementation(async (url) => {
			const str = String(url);
			if (str === 'https://company.org/configs/child.jsonc') return JSON.stringify(childConfig);
			if (str === 'https://company.org/configs/parent.jsonc') return JSON.stringify(parentConfig);
			throw new Error(`404: ${url}`);
		});

		const config = await resolveConfig({ configFile: 'https://company.org/configs/child.jsonc' });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('UTC');
		expect(config?.locale).toBe('en-US');
		expect(warnSpy).not.toHaveBeenCalled();
	});

	test('should preserve local and file:// inheritance behavior when root configuration is local', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const fixtureFileUrl = new URL('./__fixtures__/config/tempo.config.js', import.meta.url).href;
		const config = await resolveConfig({ configFile: fixtureFileUrl });
		expect(config).toBeDefined();
		expect(config?.timeZone).toBe('Europe/Paris');
		expect(warnSpy).not.toHaveBeenCalled();
	});
});
