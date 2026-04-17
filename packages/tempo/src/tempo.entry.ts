import { Tempo } from './tempo.index.js';

// Batteries Included: Register standard modules
// (This is already handled by tempo.index.js)

// Attach directly to the window for the global bundle
if (typeof window !== 'undefined') {
  (window as any).Tempo = Tempo;
}

export default Tempo;
