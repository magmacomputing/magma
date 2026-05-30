import { Tempo } from '#tempo';

describe('Duration EDO Balance and Format', () => {
  test('balance() performs strict mathematical calendar rolling', () => {
    const dur = Tempo.duration({ days: 365 });
    expect(dur.days).toBe(365);
    expect(dur.years).toBe(0);

    const balancedNominal = dur.balance({ nominal: true });
    expect(balancedNominal.years).toBe(1);
    expect(balancedNominal.days).toBe(0);
  });

  test('balance() without nominal requires a relativeTo anchor', () => {
    const dur = Tempo.duration({ days: 365 });
    expect(() => dur.balance()).toThrow(/relativeTo anchor is required/);
  });

  test('until() captures the relativeTo anchor for balance()', () => {
    const t = new Tempo('2024-01-01');
    const dur = t.until(t.add({ days: 366 })); // Exactly 1 year in a leap year
    
    expect(() => dur.balance()).not.toThrow();
  });

  test('format() natively formats multi-unit durations', () => {
    const dur1 = Tempo.duration({ days: 365 });
    expect(dur1.format({ locales: 'en-US' })).toBe('365 days');

    const dur2 = Tempo.duration({ years: 1, days: 5 });
    const fmt2 = dur2.format({ locales: 'en-US' });
    expect(['1 yr, 5 days', '1 year and 5 days']).toContain(fmt2);
  });

  test('format() respects cascading numberFormat config', () => {
    const t = new Tempo('now', { intl: { numberFormat: { unitDisplay: 'short' } } });
    const dur = t.until(t.add({ years: 1 }));
    expect(dur.format({ locales: 'en-US' })).toBe('1 yr');
  });
});
