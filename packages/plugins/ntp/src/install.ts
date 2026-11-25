import { autoInstall } from 'tempo-kit/plugin/sdk';
import { NtpPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(NtpPlugin);

export * from './index.js';
export { NtpPlugin, default } from './index.js';
