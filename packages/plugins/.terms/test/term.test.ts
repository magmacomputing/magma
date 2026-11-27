import { Tempo } from '#tempo';
import { defineTerm } from '#tempo/plugin/sdk';

const label = 'term:';

/**
 * Test the Tempo term plugins
 */
describe(`${label}`, () => {
  beforeEach(() => {
    Tempo.init();
  });

  test(`${label} check for the {quarter} plugin`, () => {
    const qtr = Tempo.terms.find(({ key }: any) => key === 'qtr');

    expect(qtr)
      .toBeDefined()
  })

  test(`${label} check the term contains {quarter}`, () => {
    const tempo = new Tempo('01-Jan', { sphere: 'south' });
    const quarter = tempo.term.quarter;										  // evaluate {quarter} on tempo.term
    const qtr = tempo.term.qtr;														  // evaluate {qtr} on tempo.term  

    const keys = [];
    for (const key in tempo.term) keys.push(key);

    expect(keys).toContain('quarter')
    expect(keys).toContain('qtr')
    // QuarterTerm is strictly aligned to ISO calendar quarters (Q1 on Jan 1 globally)
    expect(qtr).toBe('Q1')
    expect(quarter.key).toBe('Q1')
    expect(quarter.span.start).toBeInstanceOf(Tempo)
  })

  test(`${label} check the {daily} term`, () => {
    const tempo = new Tempo('1pm');
    const tod = tempo.term.tod;													    // evaluate {tod} on tempo.term

    expect(tod)
      .toBe('Midday')
  })

  test(`${label} shares boundary instances across same-range queries and lazily evaluates span metrics`, () => {
    const t1 = new Tempo('2026-01-10', { timeZone: 'UTC' });
    const t2 = new Tempo('2026-01-11', { timeZone: 'UTC' });

    const s1 = t1.term.quarter.span;
    const s2 = t2.term.quarter.span;

    expect(s1.start).toBe(s2.start);
    expect(s1.end).toBe(s2.end);

    for (const prop of ['total', 'elapsed', 'remaining', 'progress'] as const) {
      expect(typeof Object.getOwnPropertyDescriptor(s1, prop)?.get).toBe('function');
    }

    expect(s1.total).toBe(s1.total);
    expect(s1.elapsed).toBe(s1.elapsed);
    expect(s1.remaining).toBe(s1.remaining);
    expect(s1.progress).toBe(s1.progress);
    expect(s1.progress).toBeLessThan(s2.progress);

    const t3 = new Tempo('2026-01-10', { timeZone: 'America/New_York' });
    expect(t3.term.quarter.span.start).not.toBe(s1.start);

    Tempo.use({ options: { locale: 'de-DE' } });
    const t3b = new Tempo('2026-01-10', { timeZone: 'UTC' });
    expect(t3b.term.quarter.span.start).not.toBe(s1.start);
    expect(t3b.term.quarter.span.start.locale).toBe('de-DE');

    Tempo.init({ locale: 'fr-FR' });
    const t4 = new Tempo('2026-01-10', { timeZone: 'UTC' });
    expect(t4.term.quarter.span.start).not.toBe(s1.start);
    expect(t4.term.quarter.span.start.locale).toBe('fr-FR');
  })

  test(`${label} isolates host-registered terms from other sandboxes`, () => {
    const SandboxA = Tempo.extend();
    const SandboxB = Tempo.extend();

    SandboxA.use(defineTerm({ key: 'alphaTerm', define: () => 'A' }));
    SandboxB.use(defineTerm({ key: 'betaTerm', define: () => 'B' }));

    const a = new SandboxA('2026-01-10');
    const b = new SandboxB('2026-01-10');

    expect((a.term as any).alphaTerm).toBe('A');
    expect((a.term as any).betaTerm).toBeUndefined();
    expect((b.term as any).betaTerm).toBe('B');
    expect((b.term as any).alphaTerm).toBeUndefined();

    // Enumeration and strict mode discovery must also stay scoped to the host registry
    Object.keys(a.term);
    expect((a.term as any).betaTerm).toBeUndefined();

    const aStrict = new SandboxA('2026-01-10', { mode: 'strict' });
    expect((aStrict.term as any).alphaTerm).toBe('A');
    expect((aStrict.term as any).betaTerm).toBeUndefined();
  })
})
