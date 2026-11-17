import { Tempo } from '#tempo';
import { onConfigChange } from '#tempo/support';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the properties`, () => {
    expect(Tempo.properties.toSorted())
      .toEqual(['yy', 'yow', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'fmt', 'woy', 'tz', 'cal', 'locale', 'intl', 'sphere', 'geo', 'ts', 'dow', 'doy', 'dim', 'diy', 'jj', 'mmm', 'mon', 'www', 'wkd', 'term', 'config', 'epoch', 'parse', 'isValid', 'iso', 'era', 'eon', 'zdt'].toSorted())
  })

  test(`${label} de-proxies properties into an array`, () => {
    const jsonArray = (Tempo.properties as any).toJSON();
    expect(Array.isArray(jsonArray)).toBe(true);
    expect(jsonArray.toSorted()).toEqual(Tempo.properties.toSorted());

    // Spread and Array.from also de-proxy cleanly
    expect(Array.isArray([...Tempo.properties])).toBe(true);
    expect(Array.isArray(Array.from(Tempo.properties))).toBe(true);
  })

  test(`${label} get the elements`, () => {
    expect(Tempo.Enum.keys(Tempo.DURATION))
      .toEqual(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'])
  })

  test(`${label} get the durations`, () => {
    expect(Tempo.Enum.keys(Tempo.DURATIONS))
      .toEqual(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'])
  })

  test(`${label} onConfigChange notifies on global Tempo.init and supports unsubscribe`, () => {
    const seen: string[] = [];
    const unsubscribe = onConfigChange((cfg) => {
      if (cfg.locale) seen.push(String(cfg.locale));
    });
    try {
      Tempo.init({ locale: 'fr-FR' });
      new Tempo('2026-10-24', { locale: 'de-DE' }); // local scope must not fire global hook
      expect(seen).toEqual(['fr-FR']);

      unsubscribe();
      Tempo.init({ locale: 'es-ES' });
      expect(seen).toEqual(['fr-FR']);

      const seenAfterThrow: string[] = [];
      const unsubBad = onConfigChange(() => { throw new Error('observer boom'); });
      const unsubGood = onConfigChange((cfg) => {
        if (cfg.locale) seenAfterThrow.push(String(cfg.locale));
      });
      try {
        expect(() => Tempo.init({ locale: 'it-IT' })).not.toThrow();
        expect(seenAfterThrow).toEqual(['it-IT']);
      } finally {
        unsubBad();
        unsubGood();
      }

      let calls = 0;
      let unsubResub = () => {};
      const resubHook = () => {
        calls++;
        unsubResub();
        unsubResub = onConfigChange(resubHook);
      };
      unsubResub = onConfigChange(resubHook);
      try {
        Tempo.init({ locale: 'pt-PT' });
        expect(calls).toBe(1);
      } finally {
        unsubResub();
      }
    } finally {
      unsubscribe();
      Tempo.init({ locale: undefined });
    }
  })

})