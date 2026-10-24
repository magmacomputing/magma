/**
 * Fasti consulares (509 BCE – 541 CE) subpath module.
 *
 * Importing this module:
 * 1. Registers the complete 1,050-year Fasti consulares catalog into the consular registry.
 * 2. Auto-installs `RomanPlugin` onto Tempo (batteries-included single import).
 *
 * @example
 * ```ts
 * import '@magmacomputing/tempo-plugin-roman/consuls';
 * import { Tempo } from '@magmacomputing/tempo';
 *
 * console.log(new Tempo('-000043-03-15').consuls); // "C. Julio Caesare V, M. Antonio coss."
 * ```
 */
import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { RomanPlugin } from './index.js';
import { CONSULS, CONSULS_SOURCE_REVISION } from './consuls.data.js';
import { registerConsuls } from './consul-engine.js';

// Auto-register full Fasti consulares into the active consular registry on import
registerConsuls(CONSULS);

// Auto-install RomanPlugin onto Tempo so only a single import is required
autoInstall(RomanPlugin);

export * from './index.js';
export { RomanPlugin, default } from './index.js';
export { CONSULS, CONSULS as FASTI_CONSULARES, CONSULS_SOURCE_REVISION };
export {
	registerConsuls,
	getConsulCatalog,
	resetConsulCatalog,
	getConsulsByYear,
	formatConsuls,
	toAblativeConsulName,
	findConsulYears,
	LANDMARK_CONSULS,
} from './consul-engine.js';
