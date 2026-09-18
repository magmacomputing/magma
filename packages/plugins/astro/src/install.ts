import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { AstroPlugin } from './index.js';

// Auto-register AstroPlugin onto Tempo upon side-effect import
autoInstall(AstroPlugin);

export * from './index.js';
export { AstroPlugin, default } from './index.js';
