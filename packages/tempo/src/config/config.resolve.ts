import { isFunction, isString, isObject } from '#library/assertion.library.js';
import { parseJSONC } from '#library/json.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import type { Options } from '../tempo.type.js';

// Minimal declaration so TS doesn't complain in browser environments without @types/node
declare const process: any;
declare const require: any;

const ctx = getContext();
let nodeReq: ((id: string) => any) | null | undefined = undefined;
let syncCache: Options | null | undefined = undefined;

function isHttpUrl(specifier: string): boolean {
	return /^https?:\/\//i.test(specifier);
}

function isFileUrl(specifier: string): boolean {
	return /^file:\/\//i.test(specifier);
}

/**
 * Safely resolves relative specifiers against a base URL string or directory path.
 */
function resolveSpecifier(specifier: string, baseLocation?: string, pathMod?: any): string {
	if (isHttpUrl(specifier) || isFileUrl(specifier))
		return specifier;

	if (baseLocation && isHttpUrl(baseLocation)) {
		try {
			return new URL(specifier, baseLocation).href;
		} catch {
			return specifier;
		}
	}

	if (baseLocation && pathMod) {
		const baseDir = (baseLocation.endsWith('/') || !pathMod.extname(baseLocation))
			? baseLocation
			: pathMod.dirname(baseLocation);
		return pathMod.resolve(baseDir, specifier);
	}

	return specifier;
}

/**
 * Fetches a JSON/JSONC configuration file over HTTP/HTTPS.
 */
async function fetchRemoteConfig(url: string): Promise<Options | undefined> {
	try {
		const { fetchRequest } = await import('#library/request.library.js');
		const data = await fetchRequest<any>(
			url,
			{ headers: { Accept: 'application/json, text/plain, */*' } },
			{ timeout: 3000, maxBytes: 128 * 1024 }
		);

		if (isObject(data)) return data as Options;
		if (isString(data)) return parseJSONC(data) as Options;
	} catch (err: any) {
		console.warn(`[Tempo] Failed to fetch remote config from ${url}:`, err?.message || err);
	}
	return undefined;
}

/**
 * Merges two Options configurations (parent base + child override).
 */
function mergeConfigs(parent: Options, child: Options): Options {
	const merged: Options = { ...parent, ...child };

	if (parent.registry || child.registry) {
		merged.registry = {
			...parent.registry,
			...child.registry,
			formats: { ...parent.registry?.formats, ...child.registry?.formats },
			locales: { ...parent.registry?.locales, ...child.registry?.locales },
			numbers: { ...parent.registry?.numbers, ...child.registry?.numbers },
		};
	}

	if (parent.planner || child.planner) {
		merged.planner = {
			...parent.planner,
			...child.planner,
		};
	}

	return merged;
}

/**
 * Recursively resolves `"extends"` references in configuration objects.
 */
async function processExtends(
	config: Options,
	baseLocation: string,
	fs?: any,
	path?: any,
	urlMod?: any,
	loadedSet = new Set<string>()
): Promise<Options> {
	if (!config || !config.extends) return config;

	const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];
	const stringExtends = extendsList.filter((item): item is string => typeof item === 'string');
	const nonStringExtends = extendsList.filter(item => typeof item !== 'string');

	if (stringExtends.length === 0) return config;

	let mergedParentConfig: Options = {};

	for (const specifier of stringExtends) {
		const targetUrlOrPath = resolveSpecifier(specifier, baseLocation, path);
		if (loadedSet.has(targetUrlOrPath)) {
			console.warn(`[Tempo] Circular extends detected for config target: ${targetUrlOrPath}`);
			continue;
		}

		const currentDir = path ? path.dirname(baseLocation) : (typeof process !== 'undefined' ? process.cwd() : '');
		const parentConfig = await loadConfigTarget(targetUrlOrPath, currentDir, fs, path, urlMod, loadedSet);
		if (parentConfig)
			mergedParentConfig = mergeConfigs(mergedParentConfig, parentConfig);
	}

	const { extends: _, ...localConfigProps } = config;
	const finalMerged = mergeConfigs(mergedParentConfig, localConfigProps);

	if (nonStringExtends.length > 0 || (mergedParentConfig.extends && Array.isArray(mergedParentConfig.extends))) {
		const parentNonStringExtends = Array.isArray(mergedParentConfig.extends)
			? mergedParentConfig.extends.filter(item => typeof item !== 'string')
			: [];
		finalMerged.extends = [...parentNonStringExtends, ...nonStringExtends];
	}

	return finalMerged;
}

/**
 * Loads a configuration target (file path, file:// URL, or http(s):// URL).
 */
async function loadConfigTarget(
	target: string,
	currentDir: string,
	fs?: any,
	path?: any,
	urlMod?: any,
	loadedSet = new Set<string>()
): Promise<Options | undefined> {
	if (loadedSet.has(target)) return undefined;
	loadedSet.add(target);

	if (isHttpUrl(target)) {
		const fetched = await fetchRemoteConfig(target);
		if (fetched)
			return processExtends(fetched, target, fs, path, urlMod, loadedSet);
		return undefined;
	}

	let localPath = target;
	if (isFileUrl(target)) {
		if (urlMod?.fileURLToPath)
			localPath = urlMod.fileURLToPath(target);
		else
			localPath = target.replace(/^file:\/\//i, '');
	} else if (path && !path.isAbsolute(localPath)) {
		localPath = path.resolve(currentDir, localPath);
	}

	if (fs && fs.existsSync(localPath)) {
		try {
			const ext = path ? path.extname(localPath) : '.json';
			let loaded: Options | undefined = undefined;

			if (ext === '.json' || ext === '.jsonc') {
				const content = await fs.promises.readFile(localPath, 'utf8');
				loaded = parseJSONC(content) as Options;
			} else if (urlMod) {
				const imported = await import(/* @vite-ignore */ urlMod.pathToFileURL(localPath).href);
				loaded = imported.default || imported;
			}

			if (loaded)
				return processExtends(loaded, localPath, fs, path, urlMod, loadedSet);
		} catch (err) {
			console.warn(`[Tempo] Failed to load config file at ${localPath}:`, err);
		}
	}

	return undefined;
}

/**
 * Safely resolves a Node.js require function in CommonJS or ESM environments.
 * Caches the result to avoid repeated resolution attempts.
 *
 * @returns The require function if available, or null if not in a Node.js context
 * @internal
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
		const exts = ['jsonc', 'json'];

		while (currentDir && currentDir !== rootPath) {
			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config.${ext}`);
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
			if (fs.existsSync(pkgJson)) break;

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
 * Supports http(s):// URLs, file:// URLs, and recursive `"extends"` inheritance.
 */
export async function resolveConfig(options?: { cwd?: string, configFile?: string }): Promise<Options | undefined> {
	if (options?.configFile && isHttpUrl(options.configFile))
		return loadConfigTarget(options.configFile, typeof process !== 'undefined' ? process.cwd() : '');

	const ctx = getContext();
	if (ctx.type !== CONTEXT.NodeJS || !isFunction(ctx.global.process?.cwd))
		return undefined;

	try {
		const modFs = 'node:fs';
		const modUrl = 'node:url';
		const modPath = 'node:path';

		const [fs, path, urlMod] = await Promise.all([
			import(/* @vite-ignore */ modFs),
			import(/* @vite-ignore */ modPath),
			import(/* @vite-ignore */ modUrl),
		]);

		let currentDir = options?.cwd || process.cwd();

		if (options?.configFile) {
			const target = isHttpUrl(options.configFile) || isFileUrl(options.configFile)
				? options.configFile
				: path.resolve(currentDir, options.configFile);
			return await loadConfigTarget(target, currentDir, fs, path, urlMod);
		}

		const rootPath = path.parse(currentDir).root;

		while (currentDir && currentDir !== rootPath) {
			const pkgJson = path.join(currentDir, 'package.json');
			const exts = ['.mts', '.ts', '.mjs', '.js', '.jsonc', '.json'];

			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config${ext}`);
				if (fs.existsSync(configPath)) {
					try {
						const loaded = await loadConfigTarget(configPath, currentDir, fs, path, urlMod);
						if (loaded) return loaded;
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
