import { Tempo } from '#tempo';
import { ZodiacTerm } from '#tempo/terms';
import { defineTerm } from '#tempo/plugin/term/term.util.js';

const label = 'discovery.getters:';

describe(`${label} static Tempo.terms`, () => {
  beforeEach(() => {
    Tempo.init();
  });

  test('auto-loads CivicTerms (qtr, season, timeOfDay) and excludes CulturalTerms (zodiac, eastern) by default', () => {
    expect(Tempo.terms.qtr).toBeDefined();
    expect(Tempo.terms.season).toBeDefined();
    expect(Tempo.terms.timeOfDay).toBeDefined();
    expect(Tempo.terms.zodiac).toBeUndefined();
    expect(Tempo.terms.shengxiao).toBeUndefined();
  });

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

describe(`${label} instance t.meta.terms`, () => {
  beforeEach(() => { Tempo.init() });

  test('returns available range keys for qtr', () => {
    const t = new Tempo();
    expect(t.meta.terms.qtr).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  test('returns available range keys for zodiac (flattened groups)', () => {
    Tempo.use(ZodiacTerm);
    const t = new Tempo();
    expect(t.meta.terms.zodiac).toContain('Aries');
    expect(t.meta.terms.zodiac).toContain('Pisces');
  });

  test('returns available range keys for timeOfDay (Timeline)', () => {
    const t = new Tempo();
    expect(t.meta.terms.timeOfDay).toContain('Morning');
    expect(t.meta.terms.timeOfDay).toContain('Night');
  });
});

describe(`${label} instance t.meta.ranges`, () => {
  beforeEach(() => { Tempo.init() });

  test('reports current active ranges for fixed date (North-sphere)', () => {
    Tempo.init({ sphere: 'north' });										// Lock to North for deterministic results
    Tempo.use(ZodiacTerm);
    const t = new Tempo('2024-04-15');
    const ranges = t.meta.ranges;

    expect(ranges.qtr).toBe('Q2');
    expect(ranges.quarter).toBe('Q2');

    expect(ranges.zdc).toBe('Aries');
    expect(ranges.zodiac).toBe('Aries');
  });


  test('forces lazy evaluation of terms', () => {
    const t = new Tempo();
    // Initially, the raw delegator target is empty
    // accessing .meta.ranges should fill it
    const summary = t.meta.ranges;
    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });

  test('is frozen, memoized, and invalidates on late-registered Term', () => {
    const t = new Tempo('2024-04-15');
    expect(Object.isFrozen(t.meta)).toBe(true);
    expect(t.meta).toBe(t.meta);
    expect(t.meta.terms).toBe(t.meta.terms);
    expect(t.meta.ranges).toBe(t.meta.ranges);
    expect(t.meta.terms.zodiac).toBeUndefined();
    expect(t.meta.ranges.zodiac).toBeUndefined();

    Tempo.use(ZodiacTerm);
    expect(t.meta.terms.zodiac).toContain('Aries');
    expect(t.meta.ranges.zodiac).toBe('Aries');
  });

  test('includes scope-less terms returning a Range object and preserves undefined when inactive', () => {
    const ActiveScopelessTerm = defineTerm({
      key: 'scopelessActive',
      ranges: [{ key: 'spring', label: 'Spring' }] as any,
      define() {
        return { key: 'spring', label: 'Spring' } as any;
      }
    });
    const InactiveScopelessTerm = defineTerm({
      key: 'scopelessInactive',
      ranges: [{ key: 'none', label: 'None' }] as any,
      define() {
        return undefined;
      }
    });

    Tempo.use(ActiveScopelessTerm);
    Tempo.use(InactiveScopelessTerm);
    const t = new Tempo('2024-04-15');

    expect(t.meta.ranges.scopelessActive).toBe('spring');
    expect(t.meta.ranges.scopelessInactive).toBeUndefined();
  });
});
