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
		// Pattern 0 — Bare registration (default options, backward-compatible):
		// FinanceNamespace,
		// AstroTerm,
		// TickerPlugin,

		// Pattern 1 — Factory closure (colocated options, Vite/Rollup style):
		// TickerPlugin({ interval: 1000 }),
		// GeoPlugin({ timeout: 5000 }),

		// Pattern 2 — Tuple syntax (works with any plugin, including third-party):
		// [GeoPlugin, { timeout: 5000 }],
		// [TickerPlugin, { interval: 1000 }],
	],

	// -------------------------------------------------------------------------
	// Plugin Configuration Options & Defaults (Legacy / Shared Fallback)
	// -------------------------------------------------------------------------
	// Use 'pluginOptions' as a fallback for plugins that are registered bare,
	// for lazy-loaded plugins not yet imported, or for enterprise base configs
	// that are shared via 'extends'. Options declared here are lower-priority
	// than colocated call-site options (Pattern 1 / Pattern 2 above).
	// pluginOptions: {
	// 	ai: { mode: 'fallback', timeout: 10000 },
	// 	ticker: { interval: 1000 },
	// },

	// Note: Providing configuration dictionaries directly inside 'plugins'
	// is supported for backward compatibility, but marked @deprecated in favor of 'pluginOptions'.
});
