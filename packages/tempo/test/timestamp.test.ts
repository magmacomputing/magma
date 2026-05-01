import { Tempo } from '#tempo';

describe('Tempo Millisecond Timestamp', () => {
    test('new Tempo(ms) should resolve correctly', () => {
        const ms = 1714521600000; // May 1, 2024 UTC
        const t = new Tempo(ms);

        expect(t.yy).toBe(2024);
        expect(t.mm).toBe(5);
        expect(t.dd).toBe(1);
    });

    test('new Tempo(s) with ss config should resolve correctly', () => {
        const s = 1714521600; // May 1, 2024 UTC in seconds
        const t = new Tempo(s, { timeStamp: 'ss' });
        
        expect(t.yy).toBe(2024);
        expect(t.mm).toBe(5);
        expect(t.dd).toBe(1);
    });
});
