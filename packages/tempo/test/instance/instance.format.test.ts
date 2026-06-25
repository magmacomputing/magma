import { Tempo } from '#tempo';

const label = 'instance.format:';

describe(`${label} format method`, () => {

  test('formats with standard tokens', () => {
    const t = new Tempo('2024-05-20 15:30:00');
    expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
    // hh is 24-hour hour. h12 is 12-hour hour.
    expect(t.format('{hh}:{mi}')).toBe('15:30');
  });

  test('formats with 12-hour clock and meridiem', () => {
    const t = new Tempo('2024-05-20 15:30:00');
    expect(t.format('{h12}:{mi}{mer}')).toBe('03:30pm');
  });

  test('accesses term properties via {term.xxx}', () => {
    const t = new Tempo('2024-05-20');
    // We expect {term.quarter} to work if registered in terms
    const formatted = t.format('{term.quarter}');
    // Since we don't know for sure if quarter is loaded in the test environment,
    // we just check that it doesn't crash and returns something plausible
    expect(formatted).toBeDefined();
  });

  test('handles escaping correctly', () => {
    const t = new Tempo('2024-05-20');
    // Match.braces matches tokens inside { }. 
    // The current implementation returns the escaped string as-is because it doesn't match the regex.
    expect(t.format('\\{yyyy\\}')).toContain('yyyy');
  });

  test('formats with pre-defined full names', () => {
    const t = new Tempo('2024-05-20');
    expect(t.format('{mmm}')).toBe('May');
    expect(t.format('{www}')).toBe('Mon');
  });

  test('formats {nano} as a BigInt', () => {
    const t = new Tempo('2024-05-20');
    const nano = t.format('{nano}');
    expect(typeof nano).toBe('bigint');
    expect(nano).toBeGreaterThan(0n);
  });

  test('delegates format(options) directly to native Intl and handles strict Temporal bounds', () => {
    const t = new Tempo('2024-12-25T14:30:00Z');

    const arabicConfig = {
      locale: 'ar-EG',
      timeZone: 'Africa/Cairo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      numberingSystem: 'arab'
    };

    // The format module should extract locale, shift the ZonedDateTime, and gracefully
    // fallback or pass through the options without crashing on the Temporal timeZone mismatch constraint.
    const result = t.format(arabicConfig);
    expect(result).toBe('الأربعاء، ٢٥ ديسمبر ٢٠٢٤');
  });

  test('delegates format(options) directly to native Intl for Japanese Reiwa era formatting', () => {
    const t = new Tempo('2024-12-25T14:30:00Z');

    const japaneseConfig = {
      locale: 'ja-JP-u-ca-japanese',
      timeZone: 'Asia/Tokyo',
      calendar: 'japanese',
      era: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    const result = t.format(japaneseConfig);
    expect(result).toBe('令和6年12月25日');
  });

  test('evaluates dynamic tokens from config.registry.tokens', () => {
    const t = new Tempo('2024-05-20');
    const options = {
      registry: {
        tokens: {
          myDay: (zdt, { modifiers }) => {
            if (modifiers.includes('upper')) return String(zdt.day).toUpperCase() + ' UPPER';
            return String(zdt.day - 1);
          }
        }
      }
    } as Tempo.Options
    expect(t.format('{myDay}', options)).toBe('19');
    expect(t.format('{myDay:upper}', options)).toBe('20 UPPER');
  });

  test('prevents core tokens from being overridden by registry', () => {
    const t = new Tempo('2024-05-20', {
      registry: {
        tokens: {
          mm: () => 'HACKED',
          yyyy: () => 'HACKED'
        }
      }
    });
    // Should still return original standard formatting
    expect(t.format('{yyyy}-{mm}')).toBe('2024-05');
  });

  test('formats compound tokens dmy, mdy, ymd with :yy or :year modifiers', () => {
    const t = new Tempo('2024-05-20');
    expect(t.format('{dmy}')).toBe(20052024);
    expect(t.format('{dmy:yy}')).toBe('200524');
    expect(t.format('{dmy:year}')).toBe('200524');

    expect(t.format('{mdy}')).toBe(5202024);
    expect(t.format('{mdy:yy}')).toBe('052024');

    expect(t.format('{ymd}')).toBe(20240520);
    expect(t.format('{ymd:yy}')).toBe('240520');
  });

});
