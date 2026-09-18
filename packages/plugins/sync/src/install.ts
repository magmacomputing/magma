import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { SyncPlugin } from './index.js';

autoInstall(SyncPlugin);

export * from './index.js';
