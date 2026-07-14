import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Options } from 'tsup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.resolve(process.cwd(), 'package.json');
let pkgName = 'unknown';
if (fs.existsSync(pkgPath)) {
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	if (pkg.name) {
		const shortName = pkg.name.split('/').pop() || 'unknown';
		// Convert 'tempo-plugin-astro' to 'astro' to avoid invalid JavaScript identifiers (hyphens)
		pkgName = shortName.replace('tempo-plugin-', '');
	}
}

export const sharedConfig: Options = {
	format: ['esm', 'iife'],
	globalName: `Magma.plugins.${pkgName}`,
	noExternal: [/^@magmacomputing\/tempo\/(plugin|plugin-api)$/],
	outExtension({ format }) {
		return {
			js: format === 'iife' ? '.global.min.js' : '.js'
		};
	},
	esbuildOptions(options, context) {
		if (context.format === 'iife') {
			options.minify = true;
		}
	},
	clean: true,
	esbuildPlugins: [
		{
			name: 'auto-inject-version',
			setup(build) {
				build.onResolve({ filter: /^@magmacomputing\/tempo\/(plugin|plugin-api)$/ }, (args) => {
					// Prevent infinite loop: if the importer is our virtual module, let standard resolution (or license-alias) handle it
					// Make it external here so it doesn't actually get bundled despite our noExternal override.
					if (args.namespace === 'auto-inject-version') return { path: args.path, external: true };
					return { path: args.path, namespace: 'auto-inject-version', pluginData: { originalPath: args.path } };
				});

				build.onLoad({ filter: /.*/, namespace: 'auto-inject-version' }, (args) => {
					const pkgPath = path.resolve(process.cwd(), 'package.json');
					let version = 'unknown';
					if (fs.existsSync(pkgPath)) {
						const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
						version = pkg.version || 'unknown';
					}

					const isApi = args.pluginData.originalPath === '@magmacomputing/tempo/plugin-api';

					let contents = `export * from '${args.pluginData.originalPath}';\n`;

					if (isApi) {
						contents += `import { definePlugin as originalPlugin, defineTerm as originalTerm } from '${args.pluginData.originalPath}';\n`;
						contents += `export const definePlugin = (config) => originalPlugin({ version: "${version}", ...config });\n`;
						contents += `export const defineTerm = (config) => originalTerm({ version: "${version}", ...config });\n`;
					} else {
						contents += `import { definePlugin as originalPlugin } from '${args.pluginData.originalPath}';\n`;
						contents += `export const definePlugin = (config) => originalPlugin({ version: "${version}", ...config });\n`;
					}

					return {
						contents,
						loader: 'js',
						resolveDir: process.cwd()
					};
				});
			}
		},
		{
			name: 'iife-globals',
			setup(build) {
				// Only intercept for IIFE builds!
				if (build.initialOptions?.format !== 'iife') return;

				const globals: Record<string, string> = {
					'@js-temporal/polyfill': 'Temporal',
					'@magmacomputing/tempo': 'Magma.Tempo',
					'@magmacomputing/tempo/plugin-api': 'Magma.pluginApi'
				};

				build.onResolve({ filter: /^(?:@js-temporal\/polyfill|@magmacomputing\/tempo.*)$/ }, args => {
					return { path: args.path, namespace: 'iife-globals' };
				});

				build.onLoad({ filter: /.*/, namespace: 'iife-globals' }, args => {
					const globalVar = globals[args.path] || globals[args.path.replace(/\/.*/, '')];
					return {
						contents: `module.exports = window.${globalVar};`,
						loader: 'js'
					};
				});
			}
		},
		{
			name: 'license-alias',
			setup(build) {
				build.onResolve({ filter: /^@magmacomputing\/tempo\/(plugin|plugin-api)$/ }, (args) => {
					if (args.importer.includes('internal/license/src/plugin.api.ts')) return;

					// Dynamically check the local package.json to determine if this is a Premium plugin
					const pkgPath = path.resolve(process.cwd(), 'package.json');
					if (fs.existsSync(pkgPath)) {
						const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
						const pricing = pkg?.tempo?.pricing;

						// If the package explicitly declares the 'community' pricing tier, skip the license wrapper
						if (pricing === 'community')
							return; // Community plugin, do not apply license wrapper
					}

					return { path: path.resolve(__dirname, 'internal/license/src/plugin.api.ts') };
				});
			}
		}
	]
}
