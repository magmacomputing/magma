import { Tempo } from '#tempo';

const label = 'instance.result:';

describe(`${label} parse result accumulation`, () => {

  test('initial parse records one result', () => {
    const t = new Tempo('20-May');
    expect(t.parse.result.length).toBe(1);
    expect(t.parse.result[0].value).toBe('20-May');
  });

  test('multiple .set() calls accumulate results', () => {
    const t1 = new Tempo('2024-05-20');
    const t2 = t1.set({ time: '10:00' });
    const t3 = t2.set({ period: 'afternoon' });
    const len1 = t1.parse.result.length;
    const len2 = t2.parse.result.length;
    const len3 = t3.parse.result.length;
    expect(len3).toBeGreaterThan(len2);
    expect(len2).toBeGreaterThan(len1);
    expect(len3).toBeGreaterThanOrEqual(5);
  });

  test('mixed .add() and .set() calls preserve history', () => {
    const t = new Tempo('20-May')
      .add({ day: 1 })
      .set({ period: 'noon' });

    expect(t.parse.result.length).toBeGreaterThanOrEqual(2);
  });

  test('nested parsing (Event/Period) records detailed matches', () => {
    const t = new Tempo('xmas');
    // For 'xmas', #conform calls #parseEvent, which calls #result
    expect(t.parse.result.some(r => r.type === 'Event')).toBe(true);
  });

  test('parse records the anchor used for the operation and individual matches', () => {
    const anchor = new Tempo('2024-01-01').toDateTime();
    const t = new Tempo('next Monday', { anchor });
    expect(t.parse.anchor).toBeDefined();
    expect(t.parse.anchor?.equals(anchor)).toBe(true);
    expect(t.parse.result[0].anchor).toBeDefined();
    expect(t.parse.result[0].anchor?.equals(anchor)).toBe(true);
  });

  test('deep resolution (xmas at noon) records 5 distinct matches', () => {
    const t = new Tempo('xmas at noon');
    // 1. dtm (xmas noon)
    // 2. Event (xmas -> 25 Dec)
    // 3. date (25 Dec)
    // 4. Period (noon -> 12:00)
    // 5. time (12:00)
    expect(t.parse.result.length).toBe(5);
    expect(t.parse.result[0].match).toBe('dateTime');
    expect(t.parse.result[1].type).toBe('Event');
    expect(t.parse.result[3].type).toBe('Period');
  });

});
