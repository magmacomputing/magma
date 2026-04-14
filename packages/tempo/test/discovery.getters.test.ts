import { Tempo } from '#tempo';

const label = 'discovery.getters:';

describe(`${label} static Tempo.terms`, () => {
  beforeEach(() => { Tempo.init() });

  test('supports key-based lookup (e.g. qtr)', () => {
    expect(Tempo.terms.qtr).toBeDefined();
    expect(Tempo.terms.qtr.key).toBe('qtr');
  });

  test('supports scope-based lookup (e.g. quarter)', () => {
    expect(Tempo.terms.quarter).toBeDefined();
    expect(Tempo.terms.quarter.key).toBe('qtr');
  });

  test('iteration is sanitized (no define/resolve)', () => {
    Tempo.terms.forEach((t: any) => {
      expect(t.define).toBeUndefined();
      expect(t.resolve).toBeUndefined();
    });
  });

  test('lookup is sanitized (no define/resolve)', () => {
    const qtr: any = Tempo.terms.qtr;
    expect(qtr.define).toBeUndefined();
    expect(qtr.resolve).toBeUndefined();
  });
});

describe(`${label} instance t.terms`, () => {
  beforeEach(() => { Tempo.init() });

  test('returns available range keys for qtr', () => {
    const t = new Tempo();
    expect(t.terms.qtr).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  test('returns available range keys for zodiac (flattened groups)', () => {
    const t = new Tempo();
    expect(t.terms.zodiac).toContain('Aries');
    expect(t.terms.zodiac).toContain('Pisces');
  });

  test('returns available range keys for period (Timeline)', () => {
    const t = new Tempo();
    expect(t.terms.period).toContain('morning');
    expect(t.terms.period).toContain('night');
  });
});

describe(`${label} instance t.ranges`, () => {
  beforeEach(() => { Tempo.init() });

  test('reports current active ranges for fixed date (North-sphere)', () => {
    Tempo.init({ sphere: 'north' });										// Lock to North for deterministic results
    const t = new Tempo('2024-04-15');
    const ranges = t.ranges;

    expect(ranges.qtr).toBe('Q2');
    expect(ranges.quarter).toBe('Q2');

    expect(ranges.zdc).toBe('Aries');
    expect(ranges.zodiac).toBe('Aries');
  });


  test('forces lazy evaluation of terms', () => {
    const t = new Tempo();
    // Initially, the raw delegator target is empty
    // accessing .ranges should fill it
    const summary = t.ranges;
    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });
});
