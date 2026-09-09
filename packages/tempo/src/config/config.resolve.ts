import { isFunction, isString, isObject, isSafeKey } from '#library/assertion.library.js';
import { parseJSONC } from '#library/json.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import type { Options } from '../tempo.type.js';

// Minimal declaration so TS doesn't complain in browser environments without @types/node
declare const process: any;
declare const require: any;

const ctx = getContext();
let nodeReq: ((id: string) => any) | null | undefined = undefined;
let syncCache: Options | null | undefined = undefined;

/**
 * Checks whether a specifier string is an http or https URL.
 */
function isHttpUrl(specifier: string): boolean {
	return /^https?:\/\//i.test(specifier);
}

/**
 * Checks whether a specifier string is a file:// URL.
 */
function isFileUrl(specifier: string): boolean {
	return /^file:\/\//i.test(specifier);
}

/**
 * Resolves a relative specifier against an HTTP URL or filesystem location.
 *
 * @param specifier - The URL or path to resolve.
 * @param baseLocation - The base URL or filesystem location.
 * @returns The resolved specifier, or the original specifier when no applicable base is provided or URL resolution fails.
 */
function resolveSpecifier(specifier: string, baseLocation?: string, pathMod?: any): string {
	if (isHttpUrl(specifier) || isFileUrl(specifier))
		return specifier;

	if (baseLocation && pathMod) {
		const baseDir = (baseLocation.endsWith('/') || !pathMod.extname(baseLocation))
			? baseLocation
			: pathMod.dirname(baseLocation);
		return pathMod.resolve(baseDir, specifier);
	}

	return specifier;
}

const MAX_EXTENDS_DEPTH = 10;
const MAX_EXTENDS_BUDGET = 25;

interface ExtendsBudget {
	remaining: number;
	warned?: boolean;
}

/**
 * Determines whether the configuration inheritance target budget is exhausted.
 *
 * @param budget - The remaining inheritance target budget and warning state
 * @returns `true` if no inheritance targets remain, `false` otherwise
 */
function checkAndWarnBudget(budget: ExtendsBudget): boolean {
	if (budget.remaining <= 0) {
		if (!budget.warned) {
			budget.warned = true;
			console.warn(`[Tempo] Maximum config extends target budget reached (${MAX_EXTENDS_BUDGET}). Skipping further extends resolution.`);
		}
		return true;
	}
	return false;
}


/**
 * Merges parent and child configuration options, with child values taking precedence.
 *
 * Nested registry, planner, and plugin option objects are combined, while plugin arrays
 * are concatenated.
 *
 * @param parent - The base configuration
 * @param child - The configuration whose values override the parent
 * @returns The combined configuration
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

	if (parent.pluginOptions || child.pluginOptions) {
		const parentOpts = isObject(parent.pluginOptions) ? parent.pluginOptions : {};
		const childOpts = isObject(child.pluginOptions) ? child.pluginOptions : {};
		const allKeys = new Set([...Object.keys(parentOpts), ...Object.keys(childOpts)]);
		const mergedPluginOpts: Record<string, any> = {};
		for (const key of allKeys) {
			if (!isSafeKey(key)) continue;
			const pVal = (parentOpts as any)[key];
			const cVal = (childOpts as any)[key];
			if (isObject(pVal) || isObject(cVal)) {
				mergedPluginOpts[key] = {
					...(isObject(pVal) ? pVal : {}),
					...(isObject(cVal) ? cVal : {}),
				};
			} else {
				mergedPluginOpts[key] = cVal !== undefined ? cVal : pVal;
			}
		}
		merged.pluginOptions = mergedPluginOpts;
	}

	if (parent.plugins || child.plugins) {
		const parentPlugins = parent.plugins;
		const childPlugins = child.plugins;
		if (Array.isArray(parentPlugins) || Array.isArray(childPlugins)) {
			const pList = Array.isArray(parentPlugins) ? parentPlugins : (parentPlugins ? [parentPlugins] : []);
			const cList = Array.isArray(childPlugins) ? childPlugins : (childPlugins ? [childPlugins] : []);
			merged.plugins = [...pList, ...cList];
		}
	}

	return merged;
}

/**
 * Resolves inherited configuration entries and combines them with local options.
 *
 * Parent configurations are processed recursively and merged before local properties. Circular references, excessive inheritance depth, and exhausted target budgets are skipped.
 *
 * @param baseLocation - The path or URL used to resolve relative `extends` entries
 * @returns The configuration with inherited options merged into its local properties
 */
async function processExtends(
	config: Options,
	baseLocation: string,
	fs?: any,
	path?: any,
	urlMod?: any,
	loadedSet = new Set<string>(),
	depth = 0,
	budget: ExtendsBudget = { remaining: MAX_EXTENDS_BUDGET },
): Promise<Options> {
	if (!config || !config.extends) return config;

	if (depth >= MAX_EXTENDS_DEPTH) {
		console.warn(`[Tempo] Maximum config extends depth limit reached (${MAX_EXTENDS_DEPTH}). Skipping further extends resolution.`);
		return config;
	}

	if (checkAndWarnBudget(budget))
		return config;

	const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];
	const stringExtends = extendsList.filter(isString);

	if (stringExtends.length === 0) return config;

	let mergedParentConfig: Options = {};

	for (const specifier of stringExtends) {
		if (checkAndWarnBudget(budget))
			break;

		if (isHttpUrl(specifier)) {
			console.warn(`[Tempo] Remote HTTP(S) config extends is not supported, skipping: ${specifier}`);
			continue;
		}

		const targetUrlOrPath = resolveSpecifier(specifier, baseLocation, path);

		if (loadedSet.has(targetUrlOrPath)) {
			console.warn(`[Tempo] Circular extends detected for config target: ${targetUrlOrPath}`);
			continue;
		}

		const currentDir = path ? path.dirname(baseLocation) : (typeof process !== 'undefined' ? process.cwd() : '');
		const branchLoadedSet = new Set(loadedSet);
		const parentConfig = await resolveExtendsTarget(targetUrlOrPath, currentDir, fs, path, urlMod, branchLoadedSet, depth + 1, budget);
		if (parentConfig)
			mergedParentConfig = mergeConfigs(mergedParentConfig, parentConfig);
	}

	const { extends: _, ...localConfigProps } = config;
	return mergeConfigs(mergedParentConfig, localConfigProps);
}

/**
 * Allowed file extensions for top-level Tempo configuration files.
 */
const ALLOWED_CONFIG_EXTENSIONS = new Set(['.json', '.jsonc', '.js', '.mjs', '.cjs', '.ts', '.mts']);

/**
 * Resolves a local path from a file URL or relative path, ensuring non-remote security.
 */
function resolveLocalConfigPath(target: string, currentDir: string, path?: any, urlMod?: any): string | undefined {
	if (isFileUrl(target)) {
		try {
			const parsed = new URL(target);
			if (parsed.hostname && parsed.hostname !== 'localhost') {
				console.warn(`[Tempo] Remote file URL with host is not supported: ${target}`);
				return undefined;
			}
		} catch {
			console.warn(`[Tempo] Invalid file URL config target: ${target}`);
			return undefined;
		}

		if (urlMod?.fileURLToPath)
			return urlMod.fileURLToPath(target);
		return target.replace(/^file:\/\//i, '');
	}

	if (path && !path.isAbsolute(target)) {
		return path.resolve(currentDir, target);
	}

	return target;
}

/**
 * Strictly loads and resolves a static inherited configuration target for `extends`.
 * Config extends only supports static .json and .jsonc data files, NEVER dynamic modules.
 */
async function resolveExtendsTarget(
	target: string,
	currentDir: string,
	fs?: any,
	path?: any,
	urlMod?: any,
	loadedSet = new Set<string>(),
	depth = 1,
	budget: ExtendsBudget = { remaining: MAX_EXTENDS_BUDGET },
): Promise<Options | undefined> {
	if (loadedSet.has(target)) return undefined;

	if (isHttpUrl(target)) {
		console.warn(`[Tempo] Remote HTTP(S) config target is not supported: ${target}`);
		return undefined;
	}

	if (checkAndWarnBudget(budget)) return undefined;
	budget.remaining--;

	loadedSet.add(target);

	const localPath = resolveLocalConfigPath(target, currentDir, path, urlMod);
	if (!localPath) return undefined;

	if (fs && fs.existsSync(localPath)) {
		try {
			const ext = path ? path.extname(localPath) : '.json';
			if (ext !== '.json' && ext !== '.jsonc') {
				console.warn(`[Tempo] Config extends only supports static .json and .jsonc data files, skipping: ${localPath}`);
				return undefined;
			}

			const content = await fs.promises.readFile(localPath, 'utf8');
			const loaded = parseJSONC(content) as Options;
			if (loaded)
				return processExtends(loaded, localPath, fs, path, urlMod, loadedSet, depth, budget);
		} catch (err) {
			console.warn(`[Tempo] Failed to load config file at ${localPath}:`, err);
		}
	}

	return undefined;
}

/**
 * Loads a top-level configuration file discovered in the project or passed via `options.configFile`.
 * Only permits explicitly supported configuration extensions.
 */
async function loadTopLevelConfig(
	target: string,
	currentDir: string,
	fs?: any,
	path?: any,
	urlMod?: any,
): Promise<Options | undefined> {
	if (isHttpUrl(target)) {
		console.warn(`[Tempo] Remote HTTP(S) config target is not supported: ${target}`);
		return undefined;
	}

	const localPath = resolveLocalConfigPath(target, currentDir, path, urlMod);
	if (!localPath) return undefined;

	if (fs && fs.existsSync(localPath)) {
		try {
			const ext = path ? path.extname(localPath) : '.json';
			if (!ALLOWED_CONFIG_EXTENSIONS.has(ext)) {
				console.warn(`[Tempo] Unsupported configuration file format, skipping: ${localPath}`);
				return undefined;
			}

			let loaded: Options | undefined = undefined;
			if (ext === '.json' || ext === '.jsonc') {
				const content = await fs.promises.readFile(localPath, 'utf8');
				loaded = parseJSONC(content) as Options;
			} else if (urlMod) {
				const imported = await import(/* @vite-ignore */ urlMod.pathToFileURL(localPath).href);
				loaded = imported.default || imported;
			}

			if (loaded)
				return processExtends(loaded, localPath, fs, path, urlMod, new Set([target]), 0);
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
 * Discovers and synchronously loads a local Tempo configuration file.
 *
 * @param options - Optional discovery settings.
 * @param options.cwd - Directory from which to begin discovery.
 * @param options.configFile - Explicit path to a JSON or JSONC configuration file.
 * @returns The loaded configuration, or `undefined` when no supported configuration is found or the environment cannot perform synchronous discovery.
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
 * Discovers and loads a Tempo configuration from an explicit target or the surrounding project directories.
 *
 * @param options - Optional working directory and configuration target.
 * @returns The loaded configuration, or `undefined` when no configuration is found or the environment cannot load one.
 */
export async function resolveConfig(options?: { cwd?: string, configFile?: string }): Promise<Options | undefined> {
	if (options?.configFile) {
		if (isHttpUrl(options.configFile)) {
			console.warn(`[Tempo] Remote HTTP(S) configFile is not supported: ${options.configFile}`);
			return undefined;
		}
		if (isFileUrl(options.configFile)) {
			try {
				const parsed = new URL(options.configFile);
				if (parsed.hostname && parsed.hostname !== 'localhost') {
					console.warn(`[Tempo] Remote file URL with host is not supported: ${options.configFile}`);
					return undefined;
				}
			} catch {
				console.warn(`[Tempo] Invalid file URL configFile: ${options.configFile}`);
				return undefined;
			}
		}
	}

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
			const target = isFileUrl(options.configFile)
				? options.configFile
				: path.resolve(currentDir, options.configFile);
			return await loadTopLevelConfig(target, currentDir, fs, path, urlMod);
		}

		const rootPath = path.parse(currentDir).root;

		while (currentDir && currentDir !== rootPath) {
			const pkgJson = path.join(currentDir, 'package.json');
			const exts = ['.mts', '.ts', '.mjs', '.js', '.jsonc', '.json'];

			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config${ext}`);
				if (fs.existsSync(configPath)) {
					try {
						const loaded = await loadTopLevelConfig(configPath, currentDir, fs, path, urlMod);
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
