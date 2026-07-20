import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const polyfill = resolve(__dirname, '../tempo/bin/temporal-polyfill.ts');
const spy = resolve(__dirname, '../tempo/test/support/setup.console-spy.ts');

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
		environment: 'node',
		include: ['test/**/*.{test,spec}.ts'],
		setupFiles: [polyfill, spy],
		alias: [
			{ find: /^#library\/(browser|server|common)\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/$1/$2.ts') },
			{ find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
			{ find: /^#tempo\/plugin\.(util|type)\.js$/, replacement: resolve(__dirname, '../tempo/src/plugin/plugin.$1.ts') },
			{ find: /^#tempo\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, '../tempo/src/plugin/extend/plugin.$1.ts') },
			{ find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: resolve(__dirname, '../tempo/src/module/module.$1.ts') },
			{ find: /^#tempo\/core$/, replacement: resolve(__dirname, '../tempo/src/core.index.ts') },
			{ find: /^#tempo\/module$/, replacement: resolve(__dirname, '../tempo/src/module/module.index.ts') },
			{ find: /^#tempo\/support$/, replacement: resolve(__dirname, '../tempo/src/support/support.index.ts') },
			{ find: /^#tempo\/tempo\.class\.js$/, replacement: resolve(__dirname, '../tempo/src/tempo.index.ts') },
			{ find: /^#tempo\/std$/, replacement: resolve(__dirname, '../plugins/.std/src/index.ts') },
			{ find: /^#tempo\/license$/, replacement: resolve(__dirname, '../tempo/src/plugin/license/license.validator.ts') },
			{ find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, '../tempo/src/$1.ts') },
			{ find: /^#tempo\/(.*)$/, replacement: resolve(__dirname, '../tempo/src/$1.ts') },
			{ find: /^#tempo$/, replacement: resolve(__dirname, '../tempo/src/tempo.index.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin-api$/, replacement: resolve(__dirname, '../tempo/src/plugin-api.index.ts') },
			{ find: /^@magmacomputing\/tempo$/, replacement: resolve(__dirname, '../tempo/src/tempo.index.ts') },
			{ find: /^@magmacomputing\/tempo\/(parse|format|mutate|duration)$/, replacement: resolve(__dirname, '../tempo/src/module/module.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: resolve(__dirname, '../tempo/src/plugin/plugin.index.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: resolve(__dirname, '../tempo/src/plugin/$1.ts') },
			{ find: /^@magmacomputing\/tempo\/term$/, replacement: resolve(__dirname, '../tempo/src/plugin/term/term.index.ts') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(__dirname, '../tempo/src/plugin/term/term.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/extend\/(.*)$/, replacement: resolve(__dirname, '../tempo/src/plugin/extend/extend.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/(.*)$/, replacement: resolve(__dirname, '../tempo/src/$1.ts') }
		]
	}
});
