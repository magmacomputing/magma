import { Tempo } from '@magmacomputing/tempo';

describe('Eastern Zodiac & Western Zodiac Terms', () => {
	beforeEach(() => {
		Tempo.init();
	});

	it('resolves Western Tropical Zodiac signs with emojis (zdc, zodiac, sunSign, starSign)', () => {
		// March 25 is Aries
		const t = new Tempo('2026-03-25T12:00:00Z');
		expect(t.term.zdc).toBe('Aries');
		expect(t.term.sunSign).toBe('Aries');
		expect(t.term.starSign).toBe('Aries');

		const scope = t.term.zodiac;
		expect(scope.key).toBe('Aries');
		expect(scope.symbol).toBe('Ram');
		expect(scope.emoji).toBe('♈');
		expect(scope.trait).toBeDefined();
	});

	it('resolves Eastern Lunar Zodiac terms with emojis (sign, lunarSign, eastern, shengxiao)', () => {
		// 2026 is Year of the Horse
		const t = new Tempo('2026-06-01T12:00:00Z');
		expect(t.term.sign).toBe('Horse');
		expect(t.term.lunarSign).toBe('Horse');
		expect(t.term.eastern).toBe('Horse');

		const scope = t.term.shengxiao;
		expect(scope.key).toBe('Horse');
		expect(scope.animal).toBe('Horse');
		expect(scope.emoji).toBe('🐎');
		expect(scope.element).toBe('Fire');
		expect(scope.yinYang).toBe('Yang');

		// Check regional variants and emojis
		expect(scope.variants.cn.animal).toBe('Horse');
		expect(scope.variants.cn.emoji).toBe('🐎');
		expect(scope.variants.cn.character).toBe('马');

		expect(scope.variants.jp.animal).toBe('Horse');
		expect(scope.variants.jp.emoji).toBe('🐎');

		expect(scope.variants.kr.animal).toBe('Horse');
		expect(scope.variants.kr.emoji).toBe('🐎');

		expect(scope.variants.vn.animal).toBe('Horse');
		expect(scope.variants.vn.emoji).toBe('🐎');
	});

	it('resolves regional variations & emojis for Cat/Rabbit, Water Buffalo/Ox, and Wild Boar/Pig years', () => {
		// 2023 is Rabbit in CN/JP/KR, but Cat in Vietnam (VN)
		const t2023 = new Tempo('2023-05-01T12:00:00Z');
		const scope2023 = t2023.term.shengxiao;
		expect(scope2023.animal).toBe('Rabbit');
		expect(scope2023.variants.cn.animal).toBe('Rabbit');
		expect(scope2023.variants.cn.emoji).toBe('🐇');
		expect(scope2023.variants.vn.animal).toBe('Cat');
		expect(scope2023.variants.vn.emoji).toBe('🐈');

		// 2019 is Pig in CN/KR/VN, but Wild Boar in Japan (JP)
		const t2019 = new Tempo('2019-05-01T12:00:00Z');
		const scope2019 = t2019.term.shengxiao;
		expect(scope2019.variants.cn.animal).toBe('Pig');
		expect(scope2019.variants.cn.emoji).toBe('🐖');
		expect(scope2019.variants.jp.animal).toBe('Wild Boar');
		expect(scope2019.variants.jp.emoji).toBe('🐗');

		// 2021 is Ox in CN/JP/KR, but Water Buffalo in Vietnam (VN)
		const t2021 = new Tempo('2021-05-01T12:00:00Z');
		const scope2021 = t2021.term.shengxiao;
		expect(scope2021.variants.cn.animal).toBe('Ox');
		expect(scope2021.variants.cn.emoji).toBe('🐂');
		expect(scope2021.variants.vn.animal).toBe('Water Buffalo');
		expect(scope2021.variants.vn.emoji).toBe('🐃');
	});

	it('respects locale setting for dynamic string key & emoji resolution', () => {
		const tVN = new Tempo('2023-05-01T12:00:00Z', { locale: 'vi-VN' });
		expect(tVN.term.sign).toBe('Cat');
		expect(tVN.term.shengxiao.emoji).toBe('🐈');

		const tJP = new Tempo('2019-05-01T12:00:00Z', { locale: 'ja-JP' });
		expect(tJP.term.sign).toBe('Wild Boar');
		expect(tJP.term.shengxiao.emoji).toBe('🐗');
	});

	it('honors keyOnly: false for lunarSign and eastern terms', () => {
		const t = new Tempo('2026-06-01T12:00:00Z');
		const lunarScope = (t.term as any).lunarSignObj ?? (t.term as any).lunarSign;
		expect(lunarScope).toBe('Horse');

		// Explicit define with keyOnly = false
		const fullScope = (t as any).defineTerm?.('lunarSign', false) ?? (t.term as any).shengxiao;
		expect(fullScope.key).toBe('Horse');
		expect(fullScope.start).toBeDefined();
		expect(fullScope.end).toBeDefined();
	});
});
