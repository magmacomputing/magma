import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { TickerPlugin } from './index.js';

// Auto-register TickerPlugin onto Tempo upon side-effect import
autoInstall(TickerPlugin);

export * from './index.js';
export { TickerPlugin, default } from './index.js';
