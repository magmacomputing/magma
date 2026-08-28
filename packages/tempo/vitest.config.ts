import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

const polyfill = resolve(__dirname, './bin/temporal-polyfill.ts');
const consoleSpySetup = resolve(__dirname, './test/support/setup.console-spy.ts');

export default defineConfig({
	esbuild: false,
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
			'**/test/browser/**'
		],
		setupFiles: [polyfill, consoleSpySetup],
	},
	resolve: {
		alias: isDist ? [
			{ find: /^#tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
			{ find: /^#tempo\/config\/(.*)\.js$/, replacement: resolve(__dirname, './dist/config/$1.js') },
			{ find: /^#tempo\/config$/, replacement: resolve(__dirname, './dist/config/config.index.js') },
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
			{ find: /^#tempo\/std$/, replacement: resolve(__dirname, './dist/term/index.js') },
			{ find: /^#tempo$/, replacement: resolve(__dirname, './dist/tempo.index.js') },
			{ find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: resolve(__dirname, '../library/dist/common/$1/$2.js') },
			{ find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: resolve(__dirname, '../library/dist/common/primitives/$1.library.js') },
			{ find: /^#library\/(boundary|decorator|enumerate|evaluation|function|international|json|logger|pledge|proxy|reflection|request|scopedset|serialize|storage|utility)\.(library|class)\.js$/, replacement: resolve(__dirname, '../library/dist/common/runtime/$1.$2.js') },
			{ find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: resolve(__dirname, '../library/dist/common/scheduling/$1.library.js') },
			{ find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: resolve(__dirname, '../library/dist/common/security/$1.library.js') },
			{ find: /^#library\/temporal\.polyfill\.js$/, replacement: resolve(__dirname, '../library/dist/common/temporal/temporal.polyfill.js') },
			{ find: /^#library$/, replacement: resolve(__dirname, '../library/dist/common.index.js') },
			{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: resolve(__dirname, './dist/plugin/plugin.index.js') },
			{ find: /^@magmacomputing\/tempo\/plugin\/sdk$/, replacement: resolve(__dirname, './dist/plugin/plugin.sdk.js') },
			{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: resolve(__dirname, './dist/plugin/$1.js') },
			{ find: /^@magmacomputing\/tempo\/term$/, replacement: resolve(__dirname, './dist/plugin/term/term.index.js') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(__dirname, './dist/plugin/term/term.$1.js') },
			{ find: /^@magmacomputing\/tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
			{ find: /^@magmacomputing\/tempo\/config$/, replacement: resolve(__dirname, './dist/config/config.index.js') },
			{ find: /^@magmacomputing\/tempo\/library$/, replacement: resolve(__dirname, './dist/library.index.js') },
			{ find: /^@magmacomputing\/tempo$/, replacement: resolve(__dirname, './dist/tempo.index.js') },
		] : [
			{ find: /^@magmacomputing\/tempo\/plugin-api$/, replacement: resolve(__dirname, './src/plugin/plugin.sdk.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin$/, replacement: resolve(__dirname, './src/plugin/plugin.index.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin\/sdk$/, replacement: resolve(__dirname, './src/plugin/plugin.sdk.ts') },
			{ find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: resolve(__dirname, './src/plugin/$1.ts') },
			{ find: /^@magmacomputing\/tempo\/term$/, replacement: resolve(__dirname, './src/plugin/term/term.index.ts') },
			{ find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: resolve(__dirname, './src/plugin/term/term.$1.ts') },
			{ find: /^@magmacomputing\/tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
			{ find: /^@magmacomputing\/tempo\/config$/, replacement: resolve(__dirname, './src/config/config.index.ts') },
			{ find: /^@magmacomputing\/tempo\/library$/, replacement: resolve(__dirname, './src/library.index.ts') },
			{ find: /^@magmacomputing\/tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
			{ find: /^#tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
			{ find: /^#tempo\/config\/(.*)\.js$/, replacement: resolve(__dirname, './src/config/$1.ts') },
			{ find: /^#tempo\/config$/, replacement: resolve(__dirname, './src/config/config.index.ts') },
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
			{ find: /^#tempo\/std$/, replacement: resolve(__dirname, '../plugins/.std/src/index.ts') },
			{ find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
			{ find: /^@magmacomputing\/tempo-fns$/, replacement: resolve(__dirname, '../functions/src/index.ts') },
			{ find: /^@magmacomputing\/tempo-fns\/(.*)$/, replacement: resolve(__dirname, '../functions/src/$1.ts') },
			{ find: /^@magmacomputing\/library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
			{ find: /^@magmacomputing\/library\/(primitives|temporal|security|scheduling|runtime)\/(.*?)(\.js)?$/, replacement: resolve(__dirname, '../library/src/common/$1/$2.ts') },
			{ find: /^@magmacomputing\/library\/(.*)$/, replacement: resolve(__dirname, '../library/src/$1.ts') },
			{ find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1/$2.ts') },
			{ find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: resolve(__dirname, '../library/src/common/primitives/$1.library.ts') },
			{ find: /^#library\/(boundary|decorator|enumerate|evaluation|function|international|json|logger|pledge|proxy|reflection|request|scopedset|serialize|storage|utility)\.(library|class)\.js$/, replacement: resolve(__dirname, '../library/src/common/runtime/$1.$2.ts') },
			{ find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: resolve(__dirname, '../library/src/common/scheduling/$1.library.ts') },
			{ find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: resolve(__dirname, '../library/src/common/security/$1.library.ts') },
			{ find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: resolve(__dirname, '../library/src/common/temporal/$1.library.ts') },
			{ find: /^#library\/temporal\.polyfill\.js$/, replacement: resolve(__dirname, '../library/src/common/temporal/temporal.polyfill.ts') },
			{ find: /^#library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
		]
	}
});
