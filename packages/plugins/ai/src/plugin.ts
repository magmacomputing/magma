import { definePlugin, deepFreeze, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import { isObject } from '@magmacomputing/library/primitives/assertion.library.js';
import { initAI, resetAI, getAiRateLimits, getAiProviderRateLimits, getAiConfig } from './core/init.js';
import { listProviderModels } from './core/models.js';
import { parseAI } from './functions/parse.js';
import { formatAI } from './functions/format.js';
import { extractAI } from './functions/extract.js';
import { recurrenceAI } from './functions/recurrence.js';
import { scheduleAI } from './functions/schedule.js';
import { diffAI } from './functions/diff.js';
import { contextAI } from './functions/context.js';
import type { AiConfig, TempoAiNamespace } from './types/index.js';

/**
 * ## AiPlugin
 * Extends the Tempo engine with LLM-powered natural language temporal reasoning,
 * mounting the cohesive `Tempo.ai` static namespace.
 */
export const AiPlugin: TempoPlugin<AiConfig> = definePlugin({
	name: 'ai',
	install(this: any, TempoClass: any, options?: AiConfig) {
		const installedClass = TempoClass || this;

		// Merge class-level plugin options if configured
		const classOpts = installedClass.config?.pluginOptions?.ai ?? installedClass.config?.plugins?.ai;
		const effectiveOptions = {
			...(isObject(classOpts) ? classOpts : {}),
			...(isObject(options) ? options : {}),
		};

		if (isObject(effectiveOptions) && Object.keys(effectiveOptions).length > 0) {
			initAI(effectiveOptions);
		}

		if (!Object.hasOwn(installedClass, 'ai')) {
			const aiNamespace: TempoAiNamespace = {
				init: initAI,
				reset: resetAI,
				parse: parseAI,
				schedule: scheduleAI,
				format: formatAI,
				extract: extractAI,
				diff: diffAI,
				recurrence: recurrenceAI,
				context: contextAI,
				models: listProviderModels,
				get config(): Readonly<AiConfig> {
					return getAiConfig();
				},
				get rateLimits(): ReturnType<typeof getAiRateLimits> {
					return getAiRateLimits();
				},
				get providerRateLimits(): typeof getAiProviderRateLimits {
					return getAiProviderRateLimits;
				},
			};

			Object.defineProperty(installedClass, 'ai', {
				value: deepFreeze(aiNamespace),
				writable: false,
				configurable: false,
				enumerable: false,
			});
		}
	},
});

export const aiPlugin = AiPlugin;
export default AiPlugin;

// Auto-register side-effect when Tempo is globally available
if (typeof globalThis !== 'undefined' && (globalThis as any).Tempo?.use) {
	try {
		(globalThis as any).Tempo.use(AiPlugin);
	} catch {
		// Ignore if already registered
	}
}
