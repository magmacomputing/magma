import { Tempo } from '#tempo';

const label = 'instance.set:';

describe(`${label} set method`, () => {

  test('throws on unknown #term', () => {
    const t = new Tempo();
    expect(() => t.set({ '#unknown': 1 })).toThrow('Unknown Term identifier');
  });

  test('sets atomic units correctly', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.set({ year: 2025, month: 12, day: 25 });
    expect(t2.yy).toBe(2025);
    expect(t2.mm).toBe(12);
    expect(t2.dd).toBe(25);
  });

  test('sets via parsing string (e.g. period)', () => {
    const t = new Tempo('2024-05-20 08:00');
    const t2 = t.set({ event: 'afternoon' });							  // afternoon -> 15:00 usually
    expect(t2.hh).toBe(15);
  });

  test('sets via parsing time string', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.set({ time: '10:30pm' });
    expect(t2.hh).toBe(22);
    expect(t2.mi).toBe(30);
  });

  test('accumulates parse results from .set() calls', () => {
    const t = new Tempo('20-May');
    expect(t.parse.result.length).toBe(1);

    const t2 = t.set({ period: 'afternoon' });
    expect(t2.parse.result.length).toBeGreaterThanOrEqual(2);
    expect(t2.parse.result.some(r => r.type === 'Period')).toBe(true);
  });

  test('startOf/midOf/endOf shorthand via set', () => {
    const t = new Tempo('2024-05-20 12:34:56');
    const start = t.set({ start: 'day' });
    expect(start.hh).toBe(0);
    expect(start.mi).toBe(0);

    const end = t.set({ end: 'month' });
    expect(end.dd).toBe(31);
    expect(end.hh).toBe(23);
  });

  describe('Relative Events', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-05-20 12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('today/tomorrow/yesterday events via set', () => {
      const t = new Tempo('2024-05-15 12:34:56');
      
      const todayObserved = t.set('today');
      expect(todayObserved.yy).toBe(2024);
      expect(todayObserved.mm).toBe(5);
      expect(todayObserved.dd).toBe(20); // 'today' is always the system-date
      expect(todayObserved.hh).toBe(12); // preserved time from t

      const tomorrow = t.set('tomorrow');
      expect(tomorrow.yy).toBe(2024);
      expect(tomorrow.mm).toBe(5);
      expect(tomorrow.dd).toBe(16); // 'tomorrow' is relative to the instance
      expect(tomorrow.hh).toBe(12); // preserved time from t

      const yesterday = t.set('yesterday');
      expect(yesterday.yy).toBe(2024);
      expect(yesterday.mm).toBe(5);
      expect(yesterday.dd).toBe(14); // 'yesterday' is relative to the instance
      expect(yesterday.hh).toBe(12); // preserved time from t
    });
  });

});
