import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';

import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

const polyfill = resolve(__dirname, './bin/temporal-polyfill.ts');
const ciPrefilterSetup = resolve(__dirname, './test/support/ci.prefilter.setup.ts');
const consoleSpySetup = resolve(__dirname, './test/support/setup.console-spy.ts');

const licensePremium = process.env.TEMPO_LICENSE_PATH ? resolve(process.env.TEMPO_LICENSE_PATH) : undefined;
const licenseDefault = resolve(__dirname, './src/plugin/license/license.validator.ts');

const foundTsconfigPath = (() => {
	if (!licensePremium) return '';
	let dir = dirname(licensePremium);
	while (dir !== resolve(dir, '..')) {
		const p = resolve(dir, 'tsconfig.json');
		if (fs.existsSync(p)) return p;
		dir = resolve(dir, '..');
	}
	return '';
})();

const isPremiumAvailable = Boolean(
	licensePremium &&
	fs.existsSync(licensePremium) &&
	fs.existsSync(foundTsconfigPath)
);

export default defineConfig({
	esbuild: false,
	oxc: false,
	plugins: [
		swc.vite({
			jsc: {
				target: 'es2022',
				parser: { syntax: 'typescript', decorators: true },
				transform: { decoratorVersion: '2023-11' },
			},
		}),
	],
	test: {
		globals: true,
		pool: 'forks',
		maxWorkers: 2,
		slowTestThreshold: 2_000,
		include: ['test/**/*.{test,spec}.ts'],
		exclude: [
			'**/node_modules/**',
			'**/test/**/*.core.test.ts',
			'**/test/**/*.lazy.test.ts',
			'**/test/browser/**'
		],
		setupFiles: process.env.TEMPO_PREFILTER_CI === 'true'
			? [polyfill, consoleSpySetup, ciPrefilterSetup]
			: [polyfill, consoleSpySetup],
	},
	resolve: {
		alias: isDist ? [
			{ find: /^#tempo\/license$/, replacement: resolve(__dirname, './dist/plugin/license/license.validator.js') },
			{ find: /^#tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
			{ find: /^#tempo\/term$/, replacement: resolve(__dirname, './dist/plugin/term/term.index.js') },
			{ find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: resolve(__dirname, './dist/module/module.$1.js') },
			{ find: /^#tempo\/module$/, replacement: resolve(__dirname, './dist/module/module.index.js') },
			{ find: /^#tempo\/support$/, replacement: resolve(__dirname, './dist/support/support.index.js') },
			{ find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.js') },
			{ find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/plugin.$1.js') },
			{ find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/extend/$1.js') },
			{ find: /^#tempo\/engine\/(.*)\.js$/, replacement: resolve(__dirname, './dist/engine/$1.js') },
			{ find: /^#tempo\/module\/(.*)\.js$/, replacement: resolve(__dirname, './dist/module/$1.js') },
			{ find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/term/$1.js') },
			{ find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './dist/$1.js') },
			{ find: /^#tempo$/, replacement: resolve(__dirname, './dist/tempo.index.js') },
			{ find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/dist/common/$1.js') },
			{ find: /^#library$/, replacement: resolve(__dirname, '../library/dist/common.index.js') },
			{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: resolve(__dirname, './dist/plugin/plugin.index.js') },
			{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: resolve(__dirname, './dist/plugin/$1.js') },
			{ find: /^@magmacomputing\/tempo\/term$/, replacement: resolve(__dirname, './dist/plugin/term/term.index.js') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(__dirname, './dist/plugin/term/term.$1.js') },
			{ find: /^@magmacomputing\/tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
			{ find: /^@magmacomputing\/tempo\/library$/, replacement: resolve(__dirname, './dist/library.index.js') },
		] : [
			{ find: /^#tempo\/license$/, replacement: isPremiumAvailable ? (licensePremium as string) : licenseDefault },
			// Also alias the relative path used by the dynamic import in tempo.class.ts, so vi.mock('#tempo/license') intercepts it
			{ find: resolve(__dirname, './src/plugin/license/license.validator.ts'), replacement: isPremiumAvailable ? (licensePremium as string) : licenseDefault },
			{ find: resolve(__dirname, './src/plugin/license/license.validator.js'), replacement: isPremiumAvailable ? (licensePremium as string) : licenseDefault },
			{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: resolve(__dirname, './src/plugin/plugin.index.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: resolve(__dirname, './src/plugin/$1.ts') },
			{ find: /^@magmacomputing\/tempo\/term$/, replacement: resolve(__dirname, './src/plugin/term/term.index.ts') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(__dirname, './src/plugin/term/term.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
			{ find: /^@magmacomputing\/tempo\/library$/, replacement: resolve(__dirname, './src/library.index.ts') },
			{ find: /^#tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
			{ find: /^#tempo\/term$/, replacement: resolve(__dirname, './src/plugin/term/term.index.ts') },
			{ find: /^#tempo\/term\/(.*)$/, replacement: resolve(__dirname, './src/plugin/term/$1') },
			{ find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: resolve(__dirname, './src/module/module.$1.ts') },
			{ find: /^#tempo\/module$/, replacement: resolve(__dirname, './src/module/module.index.ts') },
			{ find: /^#tempo\/support$/, replacement: resolve(__dirname, './src/support/support.index.ts') },
			{ find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.ts') },
			{ find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/plugin.$1.ts') },
			{ find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/extend/$1.ts') },
			{ find: /^#tempo\/engine\/(.*)\.js$/, replacement: resolve(__dirname, './src/engine/$1.ts') },
			{ find: /^#tempo\/module\/(.*)\.js$/, replacement: resolve(__dirname, './src/module/$1.ts') },
			{ find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/term/$1.ts') },
			{ find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
			{ find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
			{ find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
			{ find: /^#library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
		]
	}
});
