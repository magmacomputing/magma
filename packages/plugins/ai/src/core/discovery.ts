import { getContext, CONTEXT, isObject, isPlainObject, isString, isArray, isMap, isDefined, isFunction, asText } from '@magmacomputing/tempo/library';
import type { AsyncEvaluable } from '@magmacomputing/tempo/library';
import { Tempo } from '@magmacomputing/tempo';

import { DEFAULT_PROVIDERS } from './config.js';
import type { AiConfig, AiProvider } from '../types/index.js';

/**
 * Checks if the current execution context is a server-side JavaScript runtime (Node.js, Deno, Bun).
 */
export function isServerRuntime(): boolean {
	const { type } = getContext();
	return type === CONTEXT.NodeJS || type === CONTEXT.Deno;
}

/**
 * Checks if the current execution context is a browser environment.
 */
export function isBrowserRuntime(): boolean {
	const { type } = getContext();
	return type === CONTEXT.Browser;
}

/**
 * Safely accesses the runtime environment variables without crashing non-server runtimes.
 */
export function getRuntimeEnv(): Record<string, string | undefined> {
	if (!isServerRuntime())
		return {};
	try {
		if (isDefined(process?.env))
			return process.env as Record<string, string | undefined>;
	} catch { }
	return {};
}

function getEnvValue(env: Record<string, string | undefined>, name: string): string | undefined {
	if (env[name] !== undefined) return env[name];
	const upper = name.toUpperCase();
	if (env[upper] !== undefined) return env[upper];
	const lower = name.toLowerCase();
	if (env[lower] !== undefined) return env[lower];
	const match = Object.keys(env).find(k => k.toLowerCase() === lower);
	return match ? env[match] : undefined;
}

/**
 * Interpolates environment variable expressions (${VAR_NAME}, ${env:VAR_NAME}, and $env:VAR_NAME)
 * in a string, substituting missing variables with an empty string.
 */
export function interpolateEnvValue(value: string, env: Record<string, string | undefined> = getRuntimeEnv()): string {
	return value.replace(/(?:\$\{(?:env:)?([A-Z0-9_]+)\}|\$env:([A-Z0-9_]+))/gi, (_, g1, g2) => {
		const varName = g1 || g2;
		return getEnvValue(env, varName) ?? '';
	});
}

/**
 * Recursively traverses and interpolates environment variable expressions in strings, arrays, Maps, and plain objects.
 * Preserves class instances (such as CacheAdapters), functions, and primitives without mutation.
 */
export function interpolateEnv<T>(obj: T, env: Record<string, string | undefined> = getRuntimeEnv()): T {
	if (isString(obj))
		return interpolateEnvValue(obj, env) as unknown as T;

	if (isArray(obj))
		return obj.map(item => interpolateEnv(item, env)) as unknown as T;

	if (isMap(obj) && Object.getPrototypeOf(obj) === Map.prototype) {
		const result = new Map();
		for (const [key, val] of obj.entries())
			result.set(key, interpolateEnv(val, env));

		return result as unknown as T;
	}

	if (isPlainObject(obj)) {
		const result: Record<string, any> = {};
		for (const [key, val] of Object.entries(obj as object))
			result[key] = interpolateEnv(val, env);

		return result as T;
	}

	return obj;
}

/**
 * Well-known AI provider environment variable mappings.
 */
export const WELL_KNOWN_ENV_MAP: Record<string, string[]> = {
	groq: ['GROQ_API_KEY'],
	openai: ['OPENAI_API_KEY'],
	gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
	mistral: ['MISTRAL_API_KEY'],
};

/**
 * Resolves an API key for a provider, falling back to well-known environment variables if not provided.
 *
 * @param id - The provider identifier (e.g. 'groq', 'openai')
 * @param explicitKey - Optional explicit API key or dynamic supplier
 * @param env - The environment variables map to inspect
 * @returns The resolved API key string or supplier, or undefined if not found
 */
export function resolveProviderApiKey(
	id: string,
	explicitKey?: AsyncEvaluable<string>,
	env: Record<string, string | undefined> = getRuntimeEnv()
): AsyncEvaluable<string> | undefined {
	if (isFunction(explicitKey)) return explicitKey;
	const key = asText(explicitKey);
	if (key) return key;

	const normalizedId = asText(id)?.toLowerCase() ?? '';
	const envVars = WELL_KNOWN_ENV_MAP[normalizedId];
	if (!envVars) return undefined;

	for (const envVar of envVars) {
		const val = asText(env[envVar]);
		if (val) return val;
	}
	return undefined;
}

/**
 * Scans the active environment variables for well-known provider tokens and constructs
 * matching AiProvider configurations using built-in defaults.
 */
export function scanWellKnownEnvProviders(env: Record<string, string | undefined> = getRuntimeEnv()): AiProvider[] {
	const providers: AiProvider[] = [];

	for (const [providerId, envVars] of Object.entries(WELL_KNOWN_ENV_MAP)) {
		for (const envVar of envVars) {
			const key = asText(env[envVar]);
			if (key) {
				const defaultTemplate = DEFAULT_PROVIDERS[providerId];
				providers.push({
					...(defaultTemplate || {}),
					id: providerId,
					key,
				});
				break;
			}
		}
	}

	return providers;
}

/**
 * Inspects active Tempo runtime state and static class configuration for AI plugin settings.
 */
export function getActiveTempoConfigAi(): AiConfig | undefined {
	try {
		const rt = (globalThis as any)[Symbol.for('magmacomputing/tempo/runtime')];
		const stateConfig = rt?.state?.config;
		if (stateConfig?.plugins?.ai)
			return stateConfig.plugins.ai;
		if (stateConfig?.ai)
			return stateConfig.ai;

		const tempoClassConfig = rt?.modules?.['Tempo']?.config || (Tempo as any)?.config;
		if (tempoClassConfig?.plugins?.ai)
			return tempoClassConfig.plugins.ai;
		if (tempoClassConfig?.ai)
			return tempoClassConfig.ai;
	} catch { }
	return undefined;
}

/**
 * Dynamically resolves AI configuration from tempo.config.* files on disk if running in server environments.
 */
export async function resolveTempoConfigFileAi(): Promise<AiConfig | undefined> {
	if (!isServerRuntime())
		return undefined;
	try {
		const { resolveConfig } = await import('@magmacomputing/tempo/config');
		const resolved = await resolveConfig();
		if (resolved?.plugins && isObject(resolved.plugins) && (resolved.plugins as any).ai)
			return (resolved.plugins as any).ai as AiConfig;
		if ((resolved as any)?.ai)
			return (resolved as any).ai as AiConfig;
	} catch { }
	return undefined;
}

/**
 * Resolves full AI configuration through layered auto-discovery:
 * 1. Active Tempo in-memory configuration (`Tempo.config.plugins.ai`)
 * 2. Filesystem configuration (`tempo.config.*` via `resolveConfig()`)
 * 3. Caller explicit configuration overrides
 * 4. Recursive environment variable template string interpolation (`${VAR_NAME}`, `$env:VAR_NAME`)
 * 5. Environment variable token scanning for well-known provider keys (`GROQ_API_KEY`, etc.)
 */
export async function resolveAutoDiscoveredConfig(explicitConfig?: AiConfig): Promise<AiConfig> {
	const env = getRuntimeEnv();

	// 1. Active in-memory Tempo.config
	let activeConfig = getActiveTempoConfigAi();

	// 2. If no in-memory AI config, resolve from filesystem if in server runtime
	if (!activeConfig)
		activeConfig = await resolveTempoConfigFileAi();

	// Merge with any explicit caller-supplied configuration
	const mergedConfig: AiConfig = {
		...(activeConfig || {}),
		...(explicitConfig || {}),
	};

	// 3. Interpolate environment variables in configuration strings
	const interpolated = interpolateEnv(mergedConfig, env);

	// 4. If no providers defined in configuration, scan environment for well-known keys
	if (!interpolated.providers || interpolated.providers.length === 0) {
		const envProviders = scanWellKnownEnvProviders(env);
		if (envProviders.length > 0)
			interpolated.providers = envProviders;
	} else {
		// Resolve any missing keys for explicitly configured providers
		interpolated.providers = interpolated.providers.map(p => {
			const resolvedKey = resolveProviderApiKey(p.id ?? '', p.key, env);
			return resolvedKey ? { ...p, key: resolvedKey } : p;
		});
	}

	return interpolated;
}
