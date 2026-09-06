import { defineConfig } from '@magmacomputing/tempo';

/**
 * Tempo Configuration
 * 
 * This file acts as a centralized configuration for your application.
 * When `Tempo.init()` is called without arguments, it will automatically
 * discover and apply the settings below.
 * 
 * Note: These settings act as overrides to the robust defaults in `support.default.ts`.
 */
export default defineConfig({
	// -------------------------------------------------------------------------
	// -------------------------------------------------------------------------
	// Core Engine Settings
	// -------------------------------------------------------------------------
	/** Defines the default time zone (e.g. 'America/New_York' or 'UTC') */
	// timeZone: 'UTC',

	/** Defines the default locale used when formatting / parsing */
	// locale: 'en-US',

	// -------------------------------------------------------------------------
	// Layouts (Format Presets)
	// -------------------------------------------------------------------------
	layouts: {
		/** Example of a custom layout accessible via now.format('iso_date') */
		// iso_date: '{yyyy}-{mm}-{dd}',
		// time_short: '{hh}:{mi} {mer}'
	},

	// -------------------------------------------------------------------------
	// Configuration Inheritance (URL or local file path)
	// -------------------------------------------------------------------------
	// extends: 'https://company.org/tempo-base.config.jsonc',

	// -------------------------------------------------------------------------
	// Feature Registration (Plugins, Terms, & Namespaces)
	// -------------------------------------------------------------------------
	plugins: [
		// 1. Register executable plugins, namespaces, or terms:
		// FinanceNamespace,
		// AstroTerm,

		// 2. Plugins configured directly via factory closures:
		// ticker({ interval: 1000 }),
	],

	// -------------------------------------------------------------------------
	// Plugin Configuration Options & Defaults
	// -------------------------------------------------------------------------
	// pluginOptions: {
	// 	ai: { mode: 'fallback', timeout: 10000 },
	// 	ticker: { defaultInterval: 1000 }
	// },

	// Note: Providing configuration dictionaries directly inside 'plugins'
	// is supported for backward compatibility, but marked @deprecated in favor of 'pluginOptions'.
});
