import { Tempo } from '#tempo';
import { ZodiacTerm } from '@tempo-kit/plugin-cultural';

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

describe(`${label} static Tempo.terms.keys & instance t.term`, () => {
  beforeEach(() => { Tempo.init() });

  test('exposes available range keys on Tempo.terms.<key>.keys and t.term.<scope>.keys', () => {
    const t = new Tempo('2024-04-15');
    expect(Tempo.terms.qtr.keys).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(t.term.quarter.keys).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(t.term.timeOfDay.keys).toContain('Morning');
    expect(t.term.timeOfDay.keys).toContain('Night');
  });

  test('exposes active term values and range keys after Tempo.use()', () => {
    Tempo.init({ sphere: 'north' });
    Tempo.use(ZodiacTerm);
    const t = new Tempo('2024-04-15');

    expect(t.term.qtr).toBe('Q2');
    expect(t.term.quarter.key).toBe('Q2');
    expect(t.term.zdc).toBe('Aries');
    expect(t.term.zodiac.key).toBe('Aries');
    expect(t.term.zodiac.keys).toContain('Aries');
    expect(t.term.zodiac.keys).toContain('Pisces');
  });
});
