import { Tempo } from '#tempo';

const label = 'static.getters:';

// Reset to defaults before each test to ensure isolation
beforeEach(() => { Tempo.init() });

// ─────────────────────────────────────────────────────────────────────────────
// Enum Getters – return frozen Enumify objects with known keys/values
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} WEEKDAY / WEEKDAYS`, () => {
  test('WEEKDAY has 7 short-form entries (1-based)', () => {
    expect(Tempo.Enum.keys(Tempo.WEEKDAY).length).toBe(7);
    expect(Tempo.WEEKDAY.Mon).toBe(1);
    expect(Tempo.WEEKDAY.Sun).toBe(7);
    expect(Tempo.Enum.keys(Tempo.WEEKDAY)).not.toContain('All');
  })

  test('WEEKDAYS has 7 long-form entries (1-based)', () => {
    expect(Tempo.Enum.keys(Tempo.WEEKDAYS).length).toBe(7);
    expect(Tempo.WEEKDAYS.Monday).toBe(1);
    expect(Tempo.WEEKDAYS.Sunday).toBe(7);
    expect(Tempo.Enum.keys(Tempo.WEEKDAYS)).not.toContain('Everyday');
  })

  test('WEEKDAY keys are abbreviations (3 chars)', () => {
    Tempo.Enum.keys(Tempo.WEEKDAY).forEach((k: any) => expect(k.length).toBeLessThanOrEqual(3));
  })

  test('WEEKDAYS keys are full names', () => {
    expect(Tempo.Enum.keys(Tempo.WEEKDAYS)).toContain('Monday');
  })

})

describe(`${label} MONTH / MONTHS`, () => {

  test('MONTH has 12 short-form entries (1-based)', () => {
    expect(Tempo.Enum.keys(Tempo.MONTH).length).toBe(12);
    expect(Tempo.MONTH.Jan).toBe(1);
    expect(Tempo.MONTH.Dec).toBe(12);
    expect(Tempo.Enum.keys(Tempo.MONTH)).not.toContain('All');
  })

  test('MONTHS has 12 long-form entries (1-based)', () => {
    expect(Tempo.Enum.keys(Tempo.MONTHS).length).toBe(12);
    expect(Tempo.MONTHS.January).toBe(1);
    expect(Tempo.MONTHS.December).toBe(12);
    expect(Tempo.Enum.keys(Tempo.MONTHS)).not.toContain('Every');
  })

  test('MONTH includes expected abbreviation', () => {
    expect(Tempo.Enum.keys(Tempo.MONTH)).toContain('Jan');
  })

  test('MONTHS includes expected full name', () => {
    expect(Tempo.Enum.keys(Tempo.MONTHS)).toContain('January');
  })

})

describe(`${label} DURATION / DURATIONS`, () => {

  test('DURATION has 10 singular time unit keys', () => {
    expect(Tempo.Enum.keys(Tempo.DURATION).length).toBe(10);
  })

  test('DURATIONS has 10 plural time unit keys', () => {
    expect(Tempo.Enum.keys(Tempo.DURATIONS).length).toBe(10);
  })

  test('DURATION includes "year"', () => {
    expect(Tempo.Enum.keys(Tempo.DURATION)).toContain('year');
  })

  test('DURATIONS includes "years"', () => {
    expect(Tempo.Enum.keys(Tempo.DURATIONS)).toContain('years');
  })

  test('DURATION values are numbers (seconds)', () => {
    Tempo.Enum.keys(Tempo.DURATION).forEach((k: any) => expect(typeof (Tempo.DURATION as any)[k]).toBe('number'));
  })

  test('year in DURATIONS is larger than month', () => {
    expect(Tempo.DURATIONS['years']).toBeGreaterThan(Tempo.DURATIONS['months']);
  })
})

describe(`${label} SEASON`, () => {

  test('SEASON is defined', () => {
    expect(Tempo.SEASON).toBeDefined();
  })

  test('SEASON has quarterly entries', () => {
    expect(Tempo.Enum.keys(Tempo.SEASON).length).toBeGreaterThan(0);
  })

})

describe(`${label} COMPASS`, () => {

  test('COMPASS has North, South, East, West', () => {
    const keys = Tempo.Enum.keys(Tempo.COMPASS);
    expect(keys).toContain('North');
    expect(keys).toContain('South');
    expect(keys).toContain('East');
    expect(keys).toContain('West');
  })

  test('COMPASS values are lowercase strings', () => {
    Tempo.Enum.keys(Tempo.COMPASS).forEach((k: string) => {
      const val = String((Tempo.COMPASS as any)[k]);
      expect(typeof val).toBe('string');
      expect(val).toBe(val.toLowerCase());
    })
  })

})

describe(`${label} enums`, () => {

  test('enums exposes live registry enumerations', () => {
    expect(Tempo.enums).toBeDefined();
    expect(Tempo.enums.WEEKDAY).toBe(Tempo.WEEKDAY);
    expect(Tempo.enums.MONTH).toBe(Tempo.MONTH);
    expect(Tempo.enums.SEASON).toBe(Tempo.SEASON);
    expect(Tempo.enums.COMPASS).toBe(Tempo.COMPASS);
    expect(Tempo.enums.ELEMENT).toBeDefined();
    expect(Tempo.enums.FORMAT).toBeDefined();
    expect(Tempo.enums.ORDINAL).toBeDefined();
    expect(Tempo.enums.NUMBER).toBeDefined();
    expect(Tempo.enums.TIMEZONE).toBeDefined();
    expect(Tempo.enums.MODE).toBeDefined();
    expect(Tempo.enums.CACHE).toBeDefined();
  })

})

describe(`${label} ELEMENT (via Tempo.enums)`, () => {

  test('ELEMENT keys has entries for standard datetime units', () => {
    expect(Tempo.Enum.keys(Tempo.enums.ELEMENT)).toContain('yy');
    expect(Tempo.Enum.keys(Tempo.enums.ELEMENT)).toContain('mm');
    expect(Tempo.Enum.keys(Tempo.enums.ELEMENT)).toContain('dd');
  })

  test('ELEMENT values has entries for standard datetime units', () => {
    expect(Tempo.Enum.values(Tempo.enums.ELEMENT)).toContain('year');
    expect(Tempo.Enum.values(Tempo.enums.ELEMENT)).toContain('month');
    expect(Tempo.Enum.values(Tempo.enums.ELEMENT)).toContain('day');
  })

})

describe(`${label} FORMAT (via Tempo.enums)`, () => {

  test('FORMAT is defined and has named format strings', () => {
    expect(Tempo.enums.FORMAT).toBeDefined();
    expect(Tempo.Enum.keys(Tempo.enums.FORMAT).length).toBeGreaterThan(0);
  })

  test('FORMAT values are strings', () => {
    Tempo.Enum.keys(Tempo.enums.FORMAT).forEach((k: string) => {
      expect(typeof (Tempo.enums.FORMAT as any)[k]).toBe('string');
    })
  })

})

describe(`${label} LIMIT (via Tempo.enums)`, () => {

  test('LIMIT is defined', () => {
    expect(Tempo.enums.LIMIT).toBeDefined();
  })

  test('LIMIT has at least one boundary date', () => {
    expect(Object.keys(Tempo.enums.LIMIT).length).toBeGreaterThan(0);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Structural Getters
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} terms`, () => {

  test('terms is an array', () => {
    expect(Array.isArray(Tempo.terms)).toBe(true);
  })

  test('terms contains objects with at least a name', () => {
    Tempo.terms.forEach((t: any) => expect(typeof t.key).toBe('string'));
  })

  test('terms does not expose internal functions', () => {
    Tempo.terms.forEach((t: any) => {
      expect((t as any).define).toBeUndefined();
      expect((t as any).resolve).toBeUndefined();
    });
  })

})

describe(`${label} properties`, () => {

  test('properties is an array of strings', () => {
    expect(Array.isArray(Tempo.properties)).toBe(true);
    Tempo.properties.forEach((p: string) => expect(typeof p).toBe('string'));
  })

  test('properties includes core instance getters', () => {
    expect(Tempo.properties).toContain('yy');
    expect(Tempo.properties).toContain('mm');
    expect(Tempo.properties).toContain('dd');
    expect(Tempo.properties).toContain('tz');
    expect(Tempo.properties).toContain('cal');
    expect(Tempo.properties).toContain('locale');
    expect(Tempo.properties).toContain('sphere');
  })

  test('properties does not include Symbol keys', () => {
    Tempo.properties.forEach((p: string) => expect(typeof p).not.toBe('symbol'));
  })

})

describe(`${label} instance context getters`, () => {

  test('resolves default context values on instance', () => {
    const t = new Tempo('2026-08-15T12:00:00Z');
    expect(typeof t.tz).toBe('string');
    expect(typeof t.cal).toBe('string');
    expect(t.locale).toBeDefined();
    expect(t.sphere).toBe(Tempo.config.sphere);
  })

  test('resolves custom context options on instance', () => {
    const t = new Tempo('2026-08-15T12:00:00', {
      timeZone: 'Australia/Sydney',
      calendar: 'iso8601',
      locale: 'en-AU',
      sphere: 'south',
    });
    expect(t.tz).toBe('Australia/Sydney');
    expect(t.cal).toBe('iso8601');
    expect(t.locale).toBe('en-AU');
    expect(t.sphere).toBe('south');
  })

})

describe(`${label} config`, () => {

  test('config returns an object', () => {
    expect(typeof Tempo.config).toBe('object');
  })

  test('config has scope "global"', () => {
    expect(Tempo.config.scope).toBe('global');
  })

  test('config has a timeZone string', () => {
    expect(typeof Tempo.config.timeZone).toBe('string');
  })

  test('config is a frozen shallow copy (not the live object)', () => {
    const cfg = Tempo.config;
    expect(Object.isFrozen(cfg)).toBe(true);
  })

  test('config changes are reflected after Tempo.init()', () => {
    Tempo.init({ pivot: 33 });
    expect(Tempo.parse.pivot).toBe(33);
  })

})

describe(`${label} default`, () => {

  test('default returns an object', () => {
    expect(typeof Tempo.default).toBe('object');
  })

  test('default is frozen', () => {
    expect(Object.isFrozen(Tempo.default)).toBe(true);
  })

  test('default has a pivot', () => {
    expect(typeof Tempo.default.pivot).toBe('number');
  })

})

describe(`${label} parse`, () => {

  test('parse returns an object', () => {
    expect(typeof Tempo.parse).toBe('object');
  })

  test('parse has snippet, layout, event, period sub-objects', () => {
    expect(Tempo.parse.snippet).toBeDefined();
    expect(Tempo.parse.layout).toBeDefined();
    expect(Tempo.parse.event).toBeDefined();
    expect(Tempo.parse.period).toBeDefined();
  })

  test('parse.snippet is a frozen copy', () => {
    expect(Object.isFrozen(Tempo.parse)).toBe(true);
  })

  test('parse updates after Tempo.init() with new snippet', () => {
    Tempo.init({ registry: { snippets: { mySnip: 'myVal' } } });
    const sym = Tempo.getSymbol('mySnip');
    expect(Tempo.parse.snippet[sym]).toBeInstanceOf(RegExp);
  })

  test('parse.monthDay.locales is an array', () => {
    expect(Array.isArray(Tempo.parse.monthDay.locales)).toBe(true);
  })

})
