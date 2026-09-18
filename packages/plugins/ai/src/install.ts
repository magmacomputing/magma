import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { AiPlugin } from './plugin.js';

autoInstall(AiPlugin);

export * from './index.js';
export { AiPlugin, aiPlugin, default } from './plugin.js';
