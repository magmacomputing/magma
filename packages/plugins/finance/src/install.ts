import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { FinanceNamespace } from './index.js';

autoInstall(FinanceNamespace);

export * from './index.js';
