import { describe, it, expect } from 'vitest';
import { Tempo } from './src/tempo.class.js';

describe('Slick shorthand behavior', () => {
    it('should behave correctly with set and add', () => {
        const t1 = new Tempo('2026-05-15', {sphere:'south'});
        const t2 = t1.set('#qtr.<');
        const t3 = t1.add('#qtr.<');
        
        console.log('t1 (current):', t1.format('YYYY-MM-DD'));
        console.log('t2 (set)    :', t2.format('YYYY-MM-DD'));
        console.log('t3 (add)    :', t3.format('YYYY-MM-DD'));
    });
});
