import { Tempo } from '#tempo';

const label = 'static.methods:';
const testKey = '$TempoTest';
const testDiscovery = '$TempoTest';

// Reset to defaults before each test to ensure isolation
beforeEach(() => {
  delete (globalThis as any)[Symbol.for(testDiscovery)];
  Tempo.writeStore(void 0, testKey);
  Tempo.init({ store: testKey, discovery: testDiscovery });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.init()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} init`, () => {

  test('returns the class for chaining', () => {
    const Class = Tempo.init();
    expect(Class).toBe(Tempo);
    expect(Tempo.config.scope).toBe('global');
  })

  test('reset to defaults when called with no args', () => {
    Tempo.init({ pivot: 99 });
    expect(Tempo.parse.pivot).toBe(99);
    Tempo.init();
    expect(Tempo.parse.pivot).toBe(Tempo.default.pivot);		// back to default
  })

  test('applies timeZone abbreviation alias', () => {
    Tempo.init({ timeZone: 'AEST' });
    expect(Tempo.config.timeZone).toBe('Australia/Sydney');
  })

  test('applies timeZone as IANA directly', () => {
    Tempo.init({ timeZone: 'America/New_York' });
    expect(Tempo.config.timeZone).toBe('America/New_York');
  })

  test('infers sphere (north) for a northern timezone', () => {
    Tempo.init({ timeZone: 'America/New_York' });
    expect(Tempo.config.sphere).toBe(Tempo.COMPASS.North);
  })

  test('infers sphere (south) for a southern timezone', () => {
    Tempo.init({ timeZone: 'Australia/Sydney' });
    expect(Tempo.config.sphere).toBe(Tempo.COMPASS.South);
  })

  test('sphere (none) for UTC which does not observe DST', () => {
    Tempo.init({ timeZone: 'UTC' });
    expect(Tempo.config.sphere).toBeUndefined();
  })

  test('applies custom pivot year', () => {
    Tempo.init({ pivot: 50 });
    expect(Tempo.parse.pivot).toBe(50);
  })

  test('monthDay.locales are set after init with a locale', () => {
    Tempo.init({ monthDay: { locales: ['en-PH'] } });
    // locales is an array of strings: ['en-PH', ...]
    expect(Tempo.parse.monthDay.locales).toEqual(expect.arrayContaining(['en-PH']));
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.getSymbol()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} getSymbol`, () => {

  test('returns a Symbol for a new string key', () => {
    const sym = Tempo.getSymbol('myKey');
    expect(typeof sym).toBe('symbol');
  })

  test('returns the same Symbol for the same key (idempotent)', () => {
    const sym1 = Tempo.getSymbol('dupeKey');
    const sym2 = Tempo.getSymbol('dupeKey');
    expect(sym1).toBe(sym2);
  })

  test('returns a unique auto-allocated Symbol when called with no args', () => {
    const sym1 = Tempo.getSymbol();
    const sym2 = Tempo.getSymbol();
    expect(sym1).not.toBe(sym2);
  })

  test('registers and returns an existing Symbol when passed a symbol', () => {
    const original = Symbol('testSym');
    const registered = Tempo.getSymbol(original);
    expect(registered).toBe(original);
  })

  test('handles namespaced keys (uses last segment as description)', () => {
    const sym = Tempo.getSymbol('ns.myToken');
    expect(sym.description).toBe('myToken');
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.regexp()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} regexp`, () => {

  test('returns a RegExp', () => {
    expect(Tempo.regexp('{yy}')).toBeInstanceOf(RegExp);
  })

  test('is anchored (^ and $)', () => {
    const re = Tempo.regexp('{yy}');
    expect(re.source.startsWith('^')).toBe(true);
    expect(re.source.endsWith('$')).toBe(true);
  })

  test('is case-insensitive', () => {
    const re = Tempo.regexp('{yy}');
    expect(re.flags).toContain('i');
  })

  test('expands a simple layout token', () => {
    // {yy} should expand into a 4-digit year pattern
    const re = Tempo.regexp('{yy}');
    expect(re.test('2024')).toBe(true);
    expect(re.test('abcd')).toBe(false);
  })

  test('expands multiple layout tokens', () => {
    const re = Tempo.regexp('{yy}-{mm}-{dd}');
    expect(re.test('2024-05-20')).toBe(true);
    expect(re.test('20240520')).toBe(false);
  })

  test('accepts a custom snippet override', () => {
    const customSnippet = { [Tempo.getSymbol('yy')]: /(\d{2})/ } as any;
    const re = Tempo.regexp('{yy}', customSnippet);
    expect(re).toBeInstanceOf(RegExp);
  })

  test('accepts a RegExp as the layout input', () => {
    const re = Tempo.regexp(/\d{4}-\d{2}-\d{2}/);
    expect(re).toBeInstanceOf(RegExp);
  })

  test('deduplicates named capture groups (replaces with back-references)', () => {
    // a layout that references {sep} twice should not raise a duplicate capture error
    expect(() => Tempo.regexp('{yy}{sep}{mm}{sep}{dd}')).not.toThrow();
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.compare()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} compare`, () => {

  test('returns 0 for equal dates', () => {
    const t1 = new Tempo('2024-06-01');
    const t2 = new Tempo('2024-06-01');
    expect(Tempo.compare(t1, t2)).toEqual(0);							// toEqual treats -0 === 0
  })

  test('returns -1 when t1 < t2', () => {
    const t1 = new Tempo('2024-01-01');
    const t2 = new Tempo('2024-12-31');
    expect(Tempo.compare(t1, t2)).toBe(-1);
  })

  test('returns 1 when t1 > t2', () => {
    const t1 = new Tempo('2024-12-31');
    const t2 = new Tempo('2024-01-01');
    expect(Tempo.compare(t1, t2)).toBe(1);
  })

  test('can be used as a sort comparator', () => {
    const dates = ['2024-03-01', '2024-01-01', '2024-02-01'].map(d => new Tempo(d));
    const sorted = [...dates].sort(Tempo.compare);
    expect(sorted[0].yy).toBe(2024);
    expect(sorted[0].mm).toBe(1);
    expect(sorted[2].mm).toBe(3);
  })

  test('compares against now when t2 is omitted', () => {
    const past = new Tempo('2000-01-01');
    expect(Tempo.compare(past)).toBe(-1);
  })

  test('supports unit granularity (year, month, week, day/date, time, hour..nanosecond)', () => {
    const t1 = new Tempo('2025-07-01T09:15:30.123456789');
    const t2SameDay = new Tempo('2025-07-01T17:45:00.000000000');
    const t3SameMonth = new Tempo('2025-07-20T09:15:30.123456789');
    const t4SameYear = new Tempo('2025-11-05T09:15:30.000000000');

    expect(Tempo.compare(t1, t2SameDay, 'day')).toBe(0);
    expect(Tempo.compare(t1, t2SameDay, 'date')).toBe(0);
    expect(Tempo.compare(t1, t2SameDay, 'dates')).toBe(0);
    expect(Tempo.compare(t1, t2SameDay, 'hour')).toBe(-1);
    expect(Tempo.compare(t1, t3SameMonth, 'day')).toBe(-1);
    expect(Tempo.compare(t1, t3SameMonth, 'month')).toBe(0);
    expect(Tempo.compare(t1, t4SameYear, 'month')).toBe(-1);
    expect(Tempo.compare(t1, t4SameYear, 'year')).toBe(0);

    // 'time' compares wall-clock time regardless of calendar date
    expect(Tempo.compare(t1, t3SameMonth, 'time')).toBe(0);
    expect(Tempo.compare(t1, t3SameMonth, 'times')).toBe(0);
    expect(Tempo.compare(t1, t2SameDay, 'time')).toBe(-1);

    // ISO week across year boundary (2024-12-30 Mon .. 2025-01-05 Sun = 2025-W01)
    expect(Tempo.compare('2024-12-30', '2025-01-02', 'week')).toBe(0);
    expect(Tempo.compare('2024-12-29', '2025-01-02', 'week')).toBe(-1);

    // Plurals and Element shorthand tokens
    const h1 = new Tempo('2025-07-01T09:15:30.123456789');
    const h2 = new Tempo('2025-07-01T09:15:30.123999000');
    expect(Tempo.compare(h1, h2, 'days')).toBe(0);
    expect(Tempo.compare(h1, h2, 'hours')).toBe(0);
    expect(Tempo.compare(h1, h2, 'mi')).toBe(0);
    expect(Tempo.compare(h1, h2, 'ss')).toBe(0);
    expect(Tempo.compare(h1, h2, 'ms')).toBe(0);
    expect(Tempo.compare(h1, h2, 'us')).toBe(-1);
    expect(Tempo.compare(h1, h2, 'ns')).toBe(-1);
  })

  test('inherits target timezone for raw inputs and handles fractional UTC offsets', () => {
    const ny = new Tempo('2025-07-01T22:00:00', { timeZone: 'America/New_York' });
    expect(Tempo.compare(ny, '2025-07-01', 'day')).toBe(0);
    expect(Tempo.compare(ny, '2025-07-02T02:30:00Z', 'hour')).toBe(0);

    const ist1 = new Tempo('2025-07-01T14:15:00', { timeZone: 'Asia/Kolkata' });
    const ist2 = new Tempo('2025-07-01T14:45:00', { timeZone: 'Asia/Kolkata' });
    expect(Tempo.compare(ist1, ist2, 'hour')).toBe(0);
    expect(Tempo.compare(ist1, ist2, 'minute')).toBe(-1);

    // Explicit timeZone: undefined (and supplier returning undefined) should inherit target zone & calendar
    expect(Tempo.compare(ny, { value: '2025-07-01T00:30', timeZone: undefined }, 'day')).toBe(0);
    expect(Tempo.compare(ny, { value: '2025-07-01T22:00', timeZone: () => undefined, calendar: () => undefined }, 'hour')).toBe(0);
    expect(Tempo.compare(ny, { value: '2025-07-01T22:00', timeZone: () => 'UTC' }, 'hour')).toBe(1);

    // Cross-module branded Tempo instance without local private brand should still classify options objects cleanly
    const nyZdt = ny.toDateTime();
    const foreignTempo = {
      [Symbol.for('$LibraryIdentity')]: true,
      isValid: true,
      toDateTime: () => nyZdt,
      epoch: ny.epoch,
    } as unknown as Tempo;
    expect(Tempo.compare(foreignTempo, { value: '2025-07-01T00:30' }, 'day')).toBe(0);
    expect(Tempo.equals(foreignTempo, { value: '2025-07-01T00:30' }, 'day')).toBe(true);
  })

  test('throws TypeError for invalid comparison unit', () => {
    expect(() => Tempo.compare('2025-07-01', '2025-07-01', 'century' as any)).toThrow(TypeError);
    expect(() => Tempo.compare('2025-07-01', '2025-07-01', 123 as any)).toThrow(TypeError);
    expect(() => Tempo.compare('2025-07-01', '2025-07-01', null as any)).toThrow(TypeError);
    expect(() => Tempo.equals('2025-07-01', '2025-07-01', { unit: 'century' } as any)).toThrow(TypeError);
  })

  test('supports explicit timeZone, calendar, and anchor reference frames in CompareOptions', () => {
    // 2026-01-01T23:00Z vs 2026-01-02T02:00+02:00 (= 2026-01-02T00:00Z): asymmetric without a shared frame
    const utcLate = new Tempo('2026-01-01T23:00:00', { timeZone: 'UTC' });
    const plus2Early = new Tempo('2026-01-02T02:00:00', { timeZone: '+02:00' });

    // Explicit UTC frame makes both operands project to UTC (Jan 1 vs Jan 2), guaranteeing antisymmetry
    const utcOpts: Tempo.CompareOptions = { unit: 'day', timeZone: 'UTC', calendar: 'iso8601' };
    expect(Tempo.compare(utcLate, plus2Early, utcOpts)).toBe(-1);
    expect(Tempo.compare(plus2Early, utcLate, utcOpts)).toBe(1);

    // Anchor frame projects both operands into the anchor's timezone & calendar (Jan 2 01:00+02 vs Jan 2 02:00+02 -> equal day)
    const anchorOpts: Tempo.CompareOptions = { unit: 'day', anchor: plus2Early };
    expect(Tempo.compare(utcLate, plus2Early, anchorOpts)).toBe(0);
    expect(Tempo.compare(plus2Early, utcLate, anchorOpts)).toBe(0);

    // Explicit timeZone overrides anchor's timezone while retaining anchor's calendar (and suppliers resolving to undefined fall back to anchor)
    expect(Tempo.compare(utcLate, plus2Early, { unit: 'day', anchor: plus2Early, timeZone: 'UTC' })).toBe(-1);
    expect(Tempo.compare(utcLate, plus2Early, { unit: 'day', anchor: plus2Early, timeZone: () => undefined })).toBe(0);

    // Works for array sorting across mixed zones with deterministic frame
    const mixed = [
      new Tempo('2026-05-11T09:00:00', { timeZone: 'Asia/Tokyo' }),       // May 11 00:00Z (May 10 20:00 EDT)
      new Tempo('2026-05-10T18:00:00', { timeZone: 'America/New_York' }), // May 10 22:00Z (May 10 18:00 EDT)
    ];
    const sortedUtc = [...mixed].sort((a, b) => Tempo.compare(a, b, { unit: 'day', timeZone: 'UTC' }));
    expect(sortedUtc.map(d => d.tz)).toEqual(['America/New_York', 'Asia/Tokyo']);
    const sortedInNy = [...mixed].sort((a, b) => Tempo.compare(a, b, { unit: 'day', anchor: mixed[1] }));
    expect(sortedInNy.every((d, i, arr) => i === 0 || Tempo.compare(arr[i - 1], d, { unit: 'day', anchor: mixed[1] }) <= 0)).toBe(true);

    // Raw strings lacking a timezone inherit explicit CompareOptions timeZone
    expect(Tempo.compare('2026-05-10', mixed[0], { unit: 'day', timeZone: 'America/New_York' })).toBe(0);

    // Date-time property bag with explicit timeZone but no calendar inherits CompareOptions.calendar
    const thai2568 = new Tempo('2025-01-01T00:00:00', { timeZone: 'Asia/Bangkok', calendar: 'buddhist' });
    expect(Tempo.compare(thai2568, { year: 2568, month: 1, day: 1, timeZone: 'Asia/Bangkok' }, { unit: 'day', calendar: 'buddhist' })).toBe(0);

    // Invalid catch-mode anchor and operands must be rejected rather than comparing fallback values
    const invalidAnchor = new Tempo('2024-01-01', { mode: Tempo.enums.MODE.Strict, timeZone: 'Invalid/Zone', catch: true, silent: true });
    expect(() => Tempo.compare(utcLate, plus2Early, { unit: 'day', anchor: invalidAnchor })).toThrow(RangeError);
    expect(() => Tempo.compare(invalidAnchor, utcLate)).toThrow(RangeError);
    expect(() => Tempo.compare(utcLate, invalidAnchor, 'day')).toThrow(RangeError);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.equals() & t.equals()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} equals`, () => {

  test('checks instant equality when unit is omitted (matching Tempo.compare)', () => {
    const ny = new Tempo('2025-07-01T00:00:00', { timeZone: 'America/New_York' });
    const utcSameInstant = new Tempo('2025-07-01T04:00:00', { timeZone: 'UTC' });
    const nyLater = new Tempo('2025-07-01T09:00:00', { timeZone: 'America/New_York' });

    expect(Tempo.equals(ny, utcSameInstant)).toBe(true);
    expect(ny.equals(utcSameInstant)).toBe(true);
    expect(ny.equals(utcSameInstant, {})).toBe(true);
    expect(ny.equals(nyLater)).toBe(false);
    expect(Tempo.equals(ny, nyLater)).toBe(false);
  })

  test('checks unit-level equality via static and instance .equals() (unit string or options)', () => {
    const morning = new Tempo('2025-07-01T09:00:00');
    const evening = new Tempo('2025-07-01T18:30:00');
    const nextWeek = new Tempo('2025-07-08T09:00:00');

    expect(morning.equals(evening, 'day')).toBe(true);
    expect(morning.equals(evening, { unit: 'days' })).toBe(true);
    expect(morning.equals(evening, 'date')).toBe(true);
    expect(morning.equals(evening, 'hour')).toBe(false);
    expect(morning.equals(evening, { unit: 'hour' })).toBe(false);
    expect(morning.equals(nextWeek, 'month')).toBe(true);
    expect(morning.equals(nextWeek, 'week')).toBe(false);
    expect(morning.equals(nextWeek, 'time')).toBe(true);
    expect(Tempo.equals('2025-07-01', evening, 'day')).toBe(true);
    expect(Tempo.equals('2025-07-01', evening, { unit: 'days' })).toBe(true);
    expect(Tempo.compare(morning, evening, { unit: 'day' })).toBe(0);
    expect(Tempo.compare(morning, evening, { unit: 'hour' })).toBe(-1);
  })

  test('returns false for invalid instances in catch mode', () => {
    const valid = new Tempo('2025-07-01');
    const invalid = new Tempo('2024-01-01', { mode: Tempo.enums.MODE.Strict, timeZone: 'Invalid/Zone', catch: true, silent: true });

    expect(invalid.isValid).toBe(false);
    expect(Tempo.equals(invalid, valid)).toBe(false);
    expect(valid.equals(invalid, 'day')).toBe(false);
    expect(invalid.equals(invalid, 'day')).toBe(false);
    expect(Tempo.equals(invalid, '2025-07-01', 'day')).toBe(false);
    expect(Tempo.equals(valid, valid, { unit: 'day', anchor: invalid })).toBe(false);
  })

  test('supports timeZone, calendar, and anchor in EqualOptions via static and instance .equals()', () => {
    const nyLate = new Tempo('2026-05-10T22:00:00', { timeZone: 'America/New_York' }); // May 11 02:00 UTC
    const utcSameDayInNy = new Tempo('2026-05-10T23:00:00', { timeZone: 'UTC' });    // May 10 19:00 EDT

    expect(nyLate.equals(utcSameDayInNy, 'day')).toBe(true);
    expect(nyLate.equals(utcSameDayInNy, { unit: 'day', timeZone: 'UTC', calendar: 'iso8601' })).toBe(false);
    expect(Tempo.equals(nyLate, utcSameDayInNy, { unit: 'day', anchor: nyLate })).toBe(true);
    expect(utcSameDayInNy.equals(nyLate, { unit: 'day', anchor: nyLate })).toBe(true);
  })

  test('supports single-argument unit/options shorthand defaulting comparator to now', () => {
    const now = Tempo.now();
    const past = new Tempo('2000-01-01T00:00:00');
    const utcNow = Tempo.now({ timeZone: 'UTC' });

    expect(now.equals('day')).toBe(true);
    expect(now.equals('week')).toBe(true);
    expect(now.equals('month')).toBe(true);
    expect(now.equals('year')).toBe(true);
    expect(now.equals({ unit: 'week' })).toBe(true);
    expect(utcNow.equals({ unit: 'day', timeZone: 'UTC' })).toBe(true);

    expect(past.equals('year')).toBe(false);
    expect(past.equals('week')).toBe(false);
    expect(past.equals({ unit: 'day' })).toBe(false);

    // Date-like strings and non-unit Options objects still compare against the explicit target / now
    expect(past.equals('2000-01-01T00:00:00')).toBe(true);
    expect(past.equals({ timeZone: 'UTC' })).toBe(false);
  })

  test('supports derived Tempo sandboxes', () => {
    const Sub = Tempo.derive({ timeZone: 'Australia/Sydney' });
    const a = new Sub('2025-07-01T08:00:00');
    const b = new Sub('2025-07-01T20:00:00');

    expect(Sub.compare(a, b, 'day')).toBe(0);
    expect(Sub.equals(a, b, 'day')).toBe(true);
    expect(a.equals(b, 'day')).toBe(true);
    expect(a.equals('2025-07-01', 'day')).toBe(true);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.from()
// Note: @Immutable wraps Tempo in a subclass, so instanceof may not cross
// module-boundary correctly. Verify shape via constructor.name instead.
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} from`, () => {

  test('creates a Tempo-shaped instance from a date string', () => {
    const t = Tempo.from('2024-05-20');
    expect(t.constructor.name).toBe('Tempo');
    expect(t.yy).toBe(2024);
  })

  test('creates a Tempo-shaped instance with options only', () => {
    const t = Tempo.from({ timeZone: 'UTC' });
    expect(t.constructor.name).toBe('Tempo');
    expect(t.config.timeZone).toBe('UTC');
  })

  test('creates a Tempo-shaped instance from a date string with options', () => {
    const t = Tempo.from('2024-05-20', { timeZone: 'UTC' });
    expect(t.constructor.name).toBe('Tempo');
    expect(t.yy).toBe(2024);
    expect(t.config.timeZone).toBe('UTC');
  })

  test('creates a valid Tempo-shaped instance for undefined input', () => {
    const t = Tempo.from(undefined);
    expect(t.constructor.name).toBe('Tempo');
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.now()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} now`, () => {

  test('returns a Tempo instance', () => {
    const now = Tempo.now();
    expect(now).toBeInstanceOf(Tempo);
    expect(now.isValid).toBe(true);
  })

  test('is close to Date.now() in magnitude', () => {
    const now = Tempo.now();
    const nowMs = Date.now();
    expect(Math.abs(now.epoch.ms - nowMs)).toBeLessThan(1000);
  })

  test('advances over time', async () => {
    const first = Tempo.now();
    await new Promise(r => setTimeout(r, 5));
    const second = Tempo.now();
    expect(second.epoch.ns).toBeGreaterThan(first.epoch.ns);
  })

  test('accepts options (e.g. timeZone)', () => {
    const tokyo = Tempo.now({ timeZone: 'Asia/Tokyo' });
    expect(tokyo).toBeInstanceOf(Tempo);
    expect(tokyo.tz).toBe('Asia/Tokyo');
  })

  test('captures call-time timestamp when mode: "defer"', async () => {
    const before = Date.now();
    const t = Tempo.now({ mode: Tempo.enums.MODE.Defer });
    const after = Date.now();
    await new Promise(r => setTimeout(r, 20));
    expect(t.epoch.ms).toBeGreaterThanOrEqual(before);
    expect(t.epoch.ms).toBeLessThanOrEqual(after);
  })

  test('ignores value property passed in options', () => {
    const before = Date.now();
    const t = Tempo.now({ value: '2020-01-01' } as any);
    const after = Date.now();
    expect(t.epoch.ms).toBeGreaterThanOrEqual(before);
    expect(t.epoch.ms).toBeLessThanOrEqual(after);
  })

  test('throws TypeError on non-object options such as legacy unit strings', () => {
    expect(() => (Tempo.now as any)('ms')).toThrow(TypeError);
    expect(() => (Tempo.now as any)('ms')).toThrow(/Expected an options object, but received string/);
    expect(() => (Tempo.now as any)('ns')).toThrow(TypeError);
    expect(() => (Tempo.now as any)(123)).toThrow(TypeError);
    expect(() => (Tempo.now as any)(null)).toThrow(TypeError);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.isTempo
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} isTempo`, () => {
  test('correctly identifies authentic Tempo instances', () => {
    const t = new Tempo();
    expect(Tempo.isTempo(t)).toBe(true);
    expect(Tempo.isTempo(new Tempo('2026-01-01'))).toBe(true);

    const Sandbox = Tempo.derive();
    const s = new Sandbox('2026-01-01');
    expect(Tempo.isTempo(s)).toBe(true);
    expect(Sandbox.isTempo(s)).toBe(true);
    expect(Sandbox.isTempo(t)).toBe(true);
  })

  test('rejects non-Tempo values, primitives, and plain objects', () => {
    expect(Tempo.isTempo(null)).toBe(false);
    expect(Tempo.isTempo(undefined)).toBe(false);
    expect(Tempo.isTempo('2026-01-01')).toBe(false);
    expect(Tempo.isTempo(123456789)).toBe(false);
    expect(Tempo.isTempo({})).toBe(false);
    expect(Tempo.isTempo({ toDateTime: () => {} })).toBe(false);
    expect(Tempo.isTempo(new Date())).toBe(false);
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.epoch & Tempo.instant
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} epoch & instant`, () => {

  test('returns static epoch units', () => {
    expect(typeof Tempo.epoch.ss).toBe('number');
    expect(typeof Tempo.epoch.ms).toBe('number');
    expect(typeof Tempo.epoch.us).toBe('number');
    expect(typeof Tempo.epoch.ns).toBe('bigint');

    const nowMs = Date.now();
    expect(Math.abs(Tempo.epoch.ms - nowMs)).toBeLessThan(1000);
  })

  test('returns native Temporal.Instant via Tempo.instant', () => {
    expect(Tempo.instant).toBeInstanceOf(Temporal.Instant);
    expect(Math.abs(Tempo.instant.epochMilliseconds - Date.now())).toBeLessThan(1000);
  })

})

describe(`${label} now`, () => {
  test('creates a valid Tempo instance representing current time', () => {
    const t = Tempo.now();
    expect(t.isValid).toBe(true);
    expect(Math.abs(t.epoch.ms - Date.now())).toBeLessThan(1000);
  })
})

describe(`${label} readStore / writeStore`, () => {

  test('readStore returns an object (empty when nothing stored)', () => {
    const result = Tempo.readStore();											// Uses testKey from config
    expect(typeof result).toBe('object');
  })

  test('writeStore and readStore round-trip an options object', () => {
    Tempo.writeStore({ pivot: 42 });												// Uses testKey from config
    const result = Tempo.readStore();
    expect(result?.pivot).toBe(42);
    Tempo.writeStore(void 0);															// clean up (uses testKey)
  })

})
