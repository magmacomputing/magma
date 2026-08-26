import { isFunction } from '#library/assertion.library.js';
import { parseJSONC } from '#library/json.library.js';
import { when } from '#library/coercion.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import type { Options } from '../tempo.type.js';

// Minimal declaration so TS doesn't complain in browser environments without @types/node
declare const process: any;
declare const require: any;

const ctx = getContext();
let nodeReq: ((id: string) => any) | null | undefined = undefined;
let syncCache: Options | null | undefined = undefined;

/**
 * Safely resolves a Node.js require function in CommonJS or ESM environments.
 */
function getRequireSync() {
	if (nodeReq !== undefined) return nodeReq;

	if (ctx.type !== CONTEXT.NodeJS || !isFunction(ctx.global.process?.cwd))
		return nodeReq = null;

	try {
		const globalReq = isFunction(ctx.global.require)
			? ctx.global.require
			: (isFunction(ctx.global.process?.mainModule?.require)
				? ctx.global.process.mainModule.require
				: null);
		if (globalReq) {
			const url = (import.meta as any)?.url;
			const createReq = globalReq('node:module')?.createRequire;
			return nodeReq = (createReq && url) ? createReq(url) : globalReq;
		}

		let reqFn: any = null;
		try {
			if (typeof require !== 'undefined' && isFunction(require)) reqFn = require;
			else if (isFunction(ctx.global.process?.mainModule?.require)) reqFn = ctx.global.process.mainModule.require;
		} catch { }

		if (reqFn) {
			const url = (import.meta as any)?.url;
			const createReq = reqFn('node:module')?.createRequire;
			return nodeReq = (createReq && url) ? createReq(url) : reqFn;
		}
	} catch { }

	return nodeReq = null;
}

/**
 * Synchronously discovers and loads a `tempo.config.jsonc` or `tempo.config.json` file
 * by traversing upwards from process.cwd() until a package.json is found.
 * Results are cached in process memory for maximum performance.
 */
export function resolveConfigSync(options?: { cwd?: string, configFile?: string }): Options | undefined {
	if (syncCache !== undefined && !options)
		return syncCache || undefined;

	if (ctx.type !== CONTEXT.NodeJS || !isFunction(ctx.global.process?.cwd)) {
		if (!options) syncCache = null;
		return undefined;
	}

	try {
		const req = getRequireSync();
		if (!req) {
			if (!options) syncCache = null;
			return undefined;
		}

		const modFs = 'node:fs';
		const modPath = 'node:path';
		const fs = req(modFs);
		const path = req(modPath);

		let currentDir = options?.cwd || process.cwd();

		if (options?.configFile) {
			const explicitPath = path.resolve(currentDir, options.configFile);
			if (fs.existsSync(explicitPath)) {
				const ext = path.extname(explicitPath);
				if (ext === '.json' || ext === '.jsonc') {
					const content = fs.readFileSync(explicitPath, 'utf8');
					const parsed = parseJSONC(content) as Options;
					if (!options) syncCache = parsed;
					return parsed;
				}
			}
			if (!options) syncCache = null;
			return undefined;
		}

		const rootPath = path.parse(currentDir).root;
		const exts = ['.jsonc', '.json'];

		while (currentDir && currentDir !== rootPath) {
			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config${ext}`);
				if (fs.existsSync(configPath)) {
					try {
						const content = fs.readFileSync(configPath, 'utf8');
						const parsed = parseJSONC(content) as Options;
						if (!options) syncCache = parsed;
						return parsed;
					} catch (err) {
						console.warn(`[Tempo] Found config file at ${configPath} but failed to parse JSONC:`, err);
					}
				}
			}

			const pkgJson = path.join(currentDir, 'package.json');
			if (fs.existsSync(pkgJson)) {
				break;
			}

			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) break;
			currentDir = parentDir;
		}
	} catch {
		// Environment doesn't support Node fs/path, skip discovery
	}

	if (!options) syncCache = null;
	return undefined;
}

/**
 * Asynchronously discovers and loads a `tempo.config.*` file by traversing upwards
 * from the current working directory until a package.json is found.
 */
export async function resolveConfig(options?: { cwd?: string, configFile?: string }): Promise<Options | undefined> {
	const ctx = getContext();
	if (ctx.type !== CONTEXT.NodeJS || !isFunction(ctx.global.process?.cwd))
		return undefined;

	try {
		const modFs = 'node:fs';
		const modUrl = 'node:url';
		const modPath = 'node:path';

		const [fs, path] = await Promise.all([
			import(/* @vite-ignore */ modFs),
			import(/* @vite-ignore */ modPath),
		]);

		let currentDir = options?.cwd || process.cwd();

		const loadFile = async (configPath: string, ext: string) => {
			if (ext === '.json' || ext === '.jsonc') {
				const content = await fs.promises.readFile(configPath, 'utf8');
				return parseJSONC(content) as Options;
			} else {
				const { pathToFileURL } = await import(/* @vite-ignore */ modUrl);
				const imported = await import(/* @vite-ignore */ pathToFileURL(configPath).href);
				return imported.default || imported;
			}
		};

		if (options?.configFile) {
			const explicitPath = path.resolve(currentDir, options.configFile);
			if (fs.existsSync(explicitPath)) {
				try {
					return await loadFile(explicitPath, path.extname(explicitPath));
				} catch (err) {
					console.warn(`[Tempo] Failed to load explicit config file at ${explicitPath}:`, err);
					return undefined;
				}
			} else {
				console.warn(`[Tempo] Explicit config file not found at ${explicitPath}`);
				return undefined;
			}
		}

		const rootPath = path.parse(currentDir).root;

		while (currentDir && currentDir !== rootPath) {
			const pkgJson = path.join(currentDir, 'package.json');
			const exts = ['.mts', '.ts', '.mjs', '.js', '.jsonc', '.json'];

			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config${ext}`);
				if (fs.existsSync(configPath)) {
					try {
						return await loadFile(configPath, ext);
					} catch (err) {
						console.warn(`[Tempo] Found config file at ${configPath} but failed to load it:`, err);
						continue;
					}
				}
			}

			if (fs.existsSync(pkgJson))
				break;

			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) break;
			currentDir = parentDir;
		}
	} catch {
		// Environment doesn't support Node fs/path, skip discovery
	}

	return undefined;
}
