import { Tempo } from '#tempo';
import { format } from '#tempo/format';
describe('debug', () => {
  it('debug', () => {
    const t = new Tempo('2026-10-24T10:30:00');
    console.log("h12:upper:mi -> ", t.format('{h12:upper}:{mi}'));
  });
});
