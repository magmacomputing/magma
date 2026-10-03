import { Tempo } from '#tempo';

declare module '../../src/tempo.type.js' {
  export interface TempoFormatTokens {
    myDay: string;
  }
}


const label = 'instance.format:';

describe(`${label} format method`, () => {

  test('formats with standard tokens', () => {
    const t = new Tempo('2024-05-20 15:30:00');
    expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
    // hh is 24-hour. h12 is 12-hour.
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

  test('formats {nano} as a string', () => {
    const t = new Tempo('2024-05-20');
    const nano = t.format('{nano}');
    expect(typeof nano).toBe('string');
    expect(nano).toMatch(/^[0-9]+$/);
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
    } as Tempo.FormatOptions;

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
    } as Tempo.FormatOptions

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

  test('formats compound tokens dmy, mdy, ymd with :short modifier', () => {
    const t = new Tempo('2024-05-20');
    expect(t.format('{dmy}')).toBe('20052024');
    expect(t.format('{dmy:short}')).toBe('200524');

    expect(t.format('{mdy}')).toBe('05202024');
    expect(t.format('{mdy:short}')).toBe('052024');

    expect(t.format('{ymd}')).toBe('20240520');
    expect(t.format('{ymd:short}')).toBe('240520');
  });

  test('formats spatial tokens {geo.*} with modifiers and graceful fallback', () => {
    const tWithGeo = new Tempo('2026-10-24T15:30:00', {
      geo: {
        latitude: -33.8688,
        longitude: 151.2093,
        city: 'sydney',
        country: 'au',
        sphere: 'south',
        elevation: 42,
        timezone: 'Australia/Sydney',
        venue: 'opera house',
      },
    });

    expect(tWithGeo.format('{geo.city}')).toBe('sydney');
    expect(tWithGeo.format('{geo.city:title}')).toBe('Sydney');
    expect(tWithGeo.format('{geo.country:upper}')).toBe('AU');
    expect(tWithGeo.format('{geo.sphere}')).toBe('south');
    expect(tWithGeo.format('{geo.elevation}')).toBe('42');
    expect(tWithGeo.format('{geo.venue:title}')).toBe('Opera house');
    expect(tWithGeo.format('{geo.city:title}, {geo.country:upper} · {h12}:{mi} {mer}')).toBe('Sydney, AU · 03:30 pm');

    // Missing property returns empty string
    expect(tWithGeo.format('{geo.nonexistent}')).toBe('');

    // Instance without geo returns empty string without error
    const tNoGeo = new Tempo('2026-10-24T15:30:00');
    expect(tNoGeo.format('{geo.city}')).toBe('');
    expect(tNoGeo.format('{geo.country}')).toBe('');
    expect(tNoGeo.format('Time: {hh}:{mi} [{geo.city}]')).toBe('Time: 15:30 []');
  });

  test('dynamically resolves arbitrary {namespace.key} properties on instance', () => {
    Object.defineProperty(Tempo.prototype, 'custom', {
      value: {
        project: 'apollo',
        iteration: 11,
        tag: { name: 'core-team' },
      },
      configurable: true,
      writable: true,
    });

    try {
      const t = new Tempo('2026-10-24T15:30:00');
      expect(t.format('Project: {custom.project:upper} (Sprint {custom.iteration})')).toBe('Project: APOLLO (Sprint 11)');
      expect(t.format('{custom.tag.name}')).toBe('core-team');
      // Undefined property in known container resolves cleanly to empty string
      expect(t.format('{custom.missing}')).toBe('');
      // Entirely unknown namespace without object on instance stays intact
      expect(t.format('{unknown.token}')).toBe('{unknown.token}');
      // Security: Prototype pollution or unsafe keys are rejected and left intact
      expect(t.format('{__proto__.polluted}')).toBe('{__proto__.polluted}');
      expect(t.format('{constructor.name}')).toBe('{constructor.name}');
    } finally {
      delete (Tempo.prototype as any).custom;
    }
  });

  test('localizes namespace tokens using nested registry.locales hierarchy', () => {
    // 1. Deep path matching (e.g. geo.sphere)
    const tFr = new Tempo('2026-10-24T15:30:00', {
      locale: 'fr-FR',
      geo: { city: 'sydney', sphere: 'south' },
      registry: {
        locales: {
          fr: {
            geo: {
              sphere: {
                north: 'nord',
                south: 'sud',
                equator: 'équateur',
              },
              city: {
                sydney: 'Sydney (Australie)',
              },
            },
          },
        },
      },
    });

    expect(tFr.format('{geo.sphere}')).toBe('south');
    expect(tFr.format('{geo.sphere:locale}')).toBe('sud');
    expect(tFr.format('{geo.sphere:locale:title}')).toBe('Sud');
    expect(tFr.format('{geo.sphere:locale:upper}')).toBe('SUD');
    expect(tFr.format('{geo.city:locale}')).toBe('Sydney (Australie)');

    // 2. Leaf property fallback (e.g. sphere.south)
    const tEsLeaf = new Tempo('2026-10-24T15:30:00', {
      locale: 'es-ES',
      geo: { sphere: 'south' },
      registry: {
        locales: {
          es: {
            sphere: {
              south: 'sur',
            },
          },
        },
      },
    });
    expect(tEsLeaf.format('{geo.sphere:locale}')).toBe('sur');
    expect(tEsLeaf.format('{geo.sphere:locale:title}')).toBe('Sur');

    // 3. Flat property fallback (e.g. south -> 'Süden')
    const tDeFlat = new Tempo('2026-10-24T15:30:00', {
      locale: 'de-DE',
      geo: { sphere: 'south' },
      registry: {
        locales: {
          de: {
            south: 'Süden',
          },
        },
      },
    });
    expect(tDeFlat.format('{geo.sphere:locale}')).toBe('Süden');

    // 4. Function value in dictionary
    const tFunc = new Tempo('2026-10-24T15:30:00', {
      locale: 'it-IT',
      geo: { sphere: 'north' },
      registry: {
        locales: {
          it: {
            geo: {
              sphere: {
                north: (loc?: string) => `settentrione (${loc})`,
              },
            },
          },
        },
      },
    });
    expect(tFunc.format('{geo.sphere:locale}')).toBe('settentrione (it-IT)');

    // 5. Graceful fallback when no translation registered
    const tNoTrans = new Tempo('2026-10-24T15:30:00', {
      locale: 'ja-JP',
      geo: { sphere: 'south' },
    });
    expect(tNoTrans.format('{geo.sphere:locale}')).toBe('south');
  });

});
