import { Tempo } from '#tempo';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the properties`, () => {
    expect(Tempo.properties.toSorted())
      .toEqual(['yy', 'yw', 'yow', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'fmt', 'wy', 'woy', 'tz', 'cal', 'locale', 'intl', 'sphere', 'geo', 'ts', 'dow', 'doy', 'dim', 'jj', 'mmm', 'mon', 'www', 'wkd', 'nano', 'term', 'terms', 'config', 'epoch', 'parse', 'ranges', 'isValid', 'iso', 'era', 'eon', 'zdt'].toSorted())
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