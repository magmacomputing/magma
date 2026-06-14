import { Tempo } from '#tempo';

describe('locale formatting', () => {
    it('translates tokens based on locale', () => {
        const t = new Tempo('2026-10-24', { locale: 'fr-FR' });
        expect(t.format('{mon:locale}')).toBe('octobre');
    });
});
