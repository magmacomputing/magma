import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { NtpPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(NtpPlugin);

export * from './index.js';
export { NtpPlugin, default } from './index.js';
