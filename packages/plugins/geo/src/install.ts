import { autoInstall } from 'tempo-kit/plugin/sdk';
import { GeoPlugin } from './index.js';

autoInstall(GeoPlugin);

export * from './index.js';
export { GeoPlugin, geoPlugin, default } from './index.js';
