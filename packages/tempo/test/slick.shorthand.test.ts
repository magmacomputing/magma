import { Tempo } from '#tempo';

describe('Slick Shorthand Resolution', () => {
  beforeEach(() => {
    Tempo.init({ timeZone: 'UTC', sphere: 'north' });
  });

  it('move to next specific quarter (#qtr.>q2)', () => {
    const t = new Tempo('2024-04-15');										  // In Q2 2024 (inherits global 'north' lock)
    const nextQ2 = t.set('#qtr.>q2');

    expect(nextQ2.yy).toBe(2025);
    expect(nextQ2.mm).toBe(4);
    expect(nextQ2.dd).toBe(1);
    expect(nextQ2.ranges.qtr).toBe('Q2');
  });

  test('inclusive current quarter (#qtr.>=q2)', () => {
    const t = new Tempo('2024-04-15');                      // Already in Q2 2024
    const res = t.set('#qtr.>=q2');
    expect(res.yy).toBe(2024);                              // Should stay in current year
    expect(res.mm).toBe(4);
    expect(res.dd).toBe(1);
  });

  test('move to previous quarter (#qtr.<q2)', () => {
    const t = new Tempo('2024-04-15'); // In Q2 2024
    const prevQ2 = t.set('#qtr.<q2');
    expect(prevQ2.yy).toBe(2023);
    expect(prevQ2.mm).toBe(4);
  });

  test('handle repeat counts (#qtr.2q2)', () => {
    const t = new Tempo('2024-04-15');
    const q2_2 = t.set('#qtr.2q2');                         // finding the 2nd occurrence
    // '2q2' without mod is an inclusive search:
    // 1st match: Current Q2 2024 (since we are in it)
    // 2nd match: Next Q2 2025
    expect(q2_2.yy).toBe(2025);
  });

  test('slick zodiac resolution (#zodiac.>=Aries)', () => {
    const t = new Tempo('2024-04-15');                      // Aries started Mar 21
    const res = t.set('#zodiac.>=Aries');
    expect(res.yy).toBe(2024);
    expect(res.mm).toBe(3);
    expect(res.dd).toBe(21);
  });

  test('slick until() returns correct duration', () => {
    const t = new Tempo('2024-04-15');
    const dlo = t.until('#qtr.>q2');                        // Duration to next Q2 (approx 1 year away)
    expect(dlo.years).toBe(0);                              // in Temporal, until() usually gives months/days if years not requested?
    // Wait, let's check the absolute duration or just the ISO
    expect(dlo.iso).toContain('P');													// check for valid ISO duration
    expect(dlo.iso).toContain('11M');												// approx 11 months

    // Test the new "Anonymous Shorter" syntax (#qtr.>)
    const anon = t.until('#qtr.>');                         // Duration to START of the very next quarter
    expect(anon.months).toBe(2);                            // Apr 15 -> July 1 is 2 months (and 16 days)
    expect(anon.days).toBe(16);

    // Test the "Year-Wrap" boundary (#qtr.>)
    const dec25 = new Tempo('2024-12-25');
    const wrap = dec25.until('#qtr.>');                     // Should wrap to Jan 1st of next year
    expect(wrap.days).toBe(7);                              // Dec 25 -> Jan 1 is exactly 7 days
  });
});
