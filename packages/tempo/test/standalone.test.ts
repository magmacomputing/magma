import { format } from '#tempo/format';
import { parse } from '#tempo/parse';
import { init, getRuntime } from '#tempo/support';


describe('Tempo: Standalone Utilities', () => {
    let prevState: any;

    beforeAll(() => {
        // Save current state to restore later
        prevState = { ...getRuntime().state?.config };
        // Initialize the standard patterns and layouts for the standalone parser
        // Force UTC for deterministic testing of Instant projection
        init({ timeZone: 'UTC' });
    });

    afterAll(() => {
        // Restore previous state
        init(prevState);
    });

    describe('format()', () => {
        const zdt = Temporal.ZonedDateTime.from('2026-04-22T15:00:00+10:00[Australia/Sydney]');

        it('should format a ZonedDateTime with a string template', () => {
            const res = format(zdt, '{yyyy}-{mm}-{dd}');
            expect(res).toBe('2026-04-22');
        });

        it('should return a number for numeric-only patterns', () => {
            const res = format(zdt, '{yyyy}{mm}{dd}');
            expect(typeof res).toBe('number');
            expect(res).toBe(20260422);
        });

        it('should return a Queriable Proxy when called without a template', () => {
            const res = format(zdt);
            expect(typeof res).toBe('object');
            // 'weekDate' uses {www}, {yyyy}-{mmm}-{dd}
            expect(res.weekDate).toBe('Wed, 2026-Apr-22');
        });

        it('should be enumerable when called without a template', () => {
            const res = format(zdt);
            const keys = Object.keys(res);
            expect(keys).toContain('display');
            expect(keys).toContain('weekDate');
            expect(keys).toContain('logStamp');
        });

        it('should support Temporal.Instant as input', () => {
            const instant = zdt.toInstant();
            // {hh} is 24-hour in Tempo
            const res = format(instant, '{yyyy}-{mm}-{dd} {hh}:{mi}');

            // Check against the same instant projected to the resolved timezone
            // (since init() might adopt the system timezone in some environments)
            const expected = format(instant.toZonedDateTimeISO(Temporal.Now.timeZoneId()), '{yyyy}-{mm}-{dd} {hh}:{mi}');
            expect(res).toBe(expected);
        });

        it('should default to "Now" when called with no arguments', () => {
            const res = format();
            // Numeric return for yearMonthDay
            expect(typeof res.yearMonthDay).toBe('number');
            expect(String(res.yearMonthDay)).toMatch(/^\d{8}$/);
        });
    });

    describe('parse()', () => {
        it('should parse a string to ZonedDateTime', () => {
            const res = parse('2026-04-22');
            expect(res).toBeInstanceOf(Temporal.ZonedDateTime);
            expect(res.toString()).toContain('2026-04-22');
        });

        it('should support Temporal.Instant as input', () => {
            const zdt = Temporal.ZonedDateTime.from('2026-04-22T15:00:00+10:00[Australia/Sydney]');
            const instant = zdt.toInstant();
            const res = parse(instant);
            expect(res).toBeInstanceOf(Temporal.ZonedDateTime);
            expect(res.epochMilliseconds).toBe(instant.epochMilliseconds);
        });

        it('should parse strict ISO strings with offsets', () => {
            const str = '2026-04-22T15:00:00+10:00';
            const res = parse(str);
            expect(res.toString()).toContain('2026-04-22T15:00:00+10:00');
        });
    });
});
