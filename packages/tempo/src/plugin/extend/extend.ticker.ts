import { Tempo } from '../../tempo.class.js';
import { logWarn, TempoError } from '#tempo/support';
import type { TempoPlugin } from '../plugin.util.js';

const errorMessage = '[Tempo#ticker] The Ticker has been extracted to a premium plugin in v3.x. ' +
	'Please install "@magmacomputing/tempo-plugin-ticker" and register it via Tempo.extend(TickerModule). ' +
	'Visit https://registry.magmacomputing.com.au for your free license key.';

// 1. Warn gracefully on import so the developer knows the path is deprecated
logWarn(errorMessage);

// 2. Attach a throwing stub to the Tempo class so usage fails loudly
(Tempo as any).ticker = function (...args: any[]) {
	throw new TempoError(errorMessage);
};

/**
 * @deprecated The TickerModule has been extracted to a premium plugin in v3.x.
 * Please install \`@magmacomputing/tempo-plugin-ticker\` and register it via \`Tempo.extend(TickerModule)\`.
 * Visit https://registry.magmacomputing.com.au to obtain a free license key.
 */
export const TickerModule: TempoPlugin = {
	name: 'Ticker',
	install(TempoRef: any) {
		// 3. Throw a fatal error if they actually try to register the module
		throw new TempoError(errorMessage);
	}
};
