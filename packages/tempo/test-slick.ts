import { Tempo } from './src/tempo.class';

const t1 = new Tempo({sphere:'south'});
const t2 = t1.set('#qtr.<');
const t3 = t1.add('#qtr.<');

console.log('t1 (current):', t1.format('YYYY-MM-DD'));
console.log('t2 (set)    :', t2.format('YYYY-MM-DD'));
console.log('t3 (add)    :', t3.format('YYYY-MM-DD'));
