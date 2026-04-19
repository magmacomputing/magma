// Batteries Included: Register standard modules
// (This is already handled by tempo.index.js)
import { Tempo } from './tempo.index.js';

// NOTE: This file is referenced by Rollup during the build process to create the production-ready browser bundle.

// Attach directly to the window for the global bundle
if (typeof window !== 'undefined') {
  (window as any).Tempo = Tempo;
}

export default Tempo;
