import { Temporal } from '@js-temporal/polyfill';

// Ensure Temporal exists on globalThis before any library module evaluates
if (typeof (globalThis as any).Temporal === 'undefined') {
  Object.defineProperty(globalThis, 'Temporal', {
    value: Temporal,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
