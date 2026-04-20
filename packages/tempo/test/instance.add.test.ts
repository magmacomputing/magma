import { Tempo } from '#tempo';

const label = 'instance.add:';

describe(`${label} add method`, () => {

  test('adds years correctly', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.add({ year: 1 });
    expect(t2.yy).toBe(2025);
    expect(t2.mm).toBe(5);
    expect(t2.dd).toBe(20);
  });

  test('adds months correctly', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.add({ month: 3 });
    expect(t2.mm).toBe(8);
    expect(t2.dd).toBe(20);
  });

  test('adds days correctly', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.add({ day: 10 });
    expect(t2.dd).toBe(30);
  });

  test('handles multiple units in one call', () => {
    const t = new Tempo('2024-01-01');
    const t2 = t.add({ year: 1, month: 1, day: 1 });
    expect(t2.yy).toBe(2025);
    expect(t2.mm).toBe(2);
    expect(t2.dd).toBe(2);
  });

  test('preserves previously collected parse results', () => {
    const t = new Tempo('20-May');
    const history1 = t.parse.result.length;
    const t2 = t.add({ day: 1 });
    const history2 = t2.parse.result.length;

    expect(history2).toBeGreaterThan(history1);
    // Verify the mutation was recorded (it appears as a Mutation in the history)
    expect(t2.parse.result.some(r => r.type === 'Mutation')).toBe(true);
    expect(t2.parse.result[0].match).toBeDefined();
  });

  test('returns a new immutable instance (does not mutate original)', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.add({ day: 1 });
    expect(t.dd).toBe(20);
    expect(t2.dd).toBe(21);
    expect(Object.isFrozen(t2)).toBe(true);
  });

});
