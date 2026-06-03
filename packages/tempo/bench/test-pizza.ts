import { Tempo } from '../src/tempo.class.js';
const t = new Tempo('🍕', { catch: true });
console.log('Valid:', t.isValid);
console.log('Errored:', (t as any).$errored); // Wait, errored is private
console.log('ISO:', t.iso);
