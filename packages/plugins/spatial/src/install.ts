import { autoInstall } from 'tempo-kit/plugin/sdk';
import { SpatialPlugin } from './index.js';

autoInstall(SpatialPlugin);

export * from './index.js';
export { SpatialPlugin, spatialPlugin, default } from './index.js';
