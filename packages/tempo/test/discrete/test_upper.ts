import { Tempo } from '#tempo';
const t = new Tempo('2026-10-24T15:30:00');
console.log("h12:upper -> ", t.format('{h12:upper}:{mi}'));
