import { Temporal } from '@js-temporal/polyfill';

Object.assign(globalThis, { Temporal });

// console.log('✅ Temporal Polyfill Loaded:', Temporal.Now.instant().toString());