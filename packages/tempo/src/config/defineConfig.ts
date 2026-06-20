import type { Options } from '../tempo.type.js';

/**
 * Identity function to provide TypeScript autocomplete for Tempo configurations.
 */
export function defineConfig(config: Options): Options {
	return config;
}
