import { Tempo } from '#tempo';

describe('instance.since relative formatting', () => {
    beforeAll(() => {
        Tempo.init({ timeZone: 'UTC', locale: 'en-US' });
    });

    test('supports relativeStyle: "long" via options', () => {
        const t1 = new Tempo('2024-01-01T12:00:00');
        const t2 = new Tempo('2024-01-01T14:30:00');

        // default is narrow: "2h ago" (or similar depending on environment)
        // long should be: "2 hours ago"
        const res = t2.since(t1, { unit: 'hours', rtfStyle: 'long' });
        expect(res).toMatch(/2 hours ago/i);
    });

    test('supports rtfStyle: "short" via options', () => {
        const t1 = new Tempo('2024-01-01T12:00:00');
        const t2 = new Tempo('2024-01-01T14:30:00');

        const res = t2.since(t1, { unit: 'hours', rtfStyle: 'short' });
        expect(res).toMatch(/2 hrs?\. ago/i);
    });

    test('supports custom Intl.RelativeTimeFormat instance', () => {
        const t1 = new Tempo('2024-01-01T12:00:00');
        const t2 = new Tempo('2024-01-01T14:30:00');

        const rtf = new Intl.RelativeTimeFormat('fr', { style: 'long' });
        const res = t2.since(t1, { unit: 'hours', rtfFormat: rtf });
        
        // French long for 2 hours ago: "il y a 2 heures"
        expect(res).toMatch(/il y a 2 heures/i);
    });

    test('inherits rtfStyle from instance configuration', () => {
        const t1 = new Tempo('2024-01-01T12:00:00');
        const t = new Tempo('2024-01-01T14:30:00', { rtfStyle: 'long' });

        const res = t.since(t1, 'hours');
        expect(res).toMatch(/2 hours ago/i);
    });

    test('inherits rtfFormat from instance configuration', () => {
        const t1 = new Tempo('2024-01-01T12:00:00');
        const rtf = new Intl.RelativeTimeFormat('fr', { style: 'long' });
        const t = new Tempo('2024-01-01T14:30:00', { rtfFormat: rtf });

        const res = t.since(t1, 'hours');
        expect(res).toMatch(/il y a 2 heures/i);
    });
});
