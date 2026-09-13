import { Tempo } from '#tempo';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the properties`, () => {
    // Note: 'ww', 'day', and 'eraYear' are @deprecated and will be removed in the next breaking change (v5.0.0).
    // They are preserved in Tempo.properties throughout v4.x for backward compatibility.
    expect(Tempo.properties.toSorted())
      .toEqual(['yy', 'yw', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'fmt', 'ww', 'wy', 'tz', 'cal', 'locale', 'sphere', 'geo', 'ts', 'dow', 'doy', 'mmm', 'mon', 'www', 'wkd', 'day', 'nano', 'term', 'terms', 'config', 'epoch', 'parse', 'ranges', 'isValid', 'iso', 'era', 'eraYear', 'eon', 'zdt'].toSorted())
  })

  test(`${label} get the elements`, () => {
    expect(Tempo.DURATION.keys())
      .toEqual(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'])
  })

  test(`${label} get the durations`, () => {
    expect(Tempo.DURATIONS.keys())
      .toEqual(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'])
  })

})