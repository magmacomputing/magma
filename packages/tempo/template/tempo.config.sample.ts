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
	// Plugins
	// -------------------------------------------------------------------------
	plugins: [
		// Import and instantiate your plugins here
		// TickerPlugin({ interval: 1000 })
	]
});
