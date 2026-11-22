import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { SignalsPlugin } from './plugin.js';

autoInstall(SignalsPlugin);

export * from './index.js';
export { SignalsPlugin, signalsPlugin, default } from './plugin.js';
