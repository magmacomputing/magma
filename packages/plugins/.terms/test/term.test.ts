import { Tempo } from '#tempo';

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
})
