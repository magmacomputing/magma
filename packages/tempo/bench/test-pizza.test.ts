import { Tempo } from '../src/tempo.class.js';
it('tests pizza', () => {
    const t = new Tempo('🍕', { catch: true });
    console.log('Valid:', t.isValid);
});
