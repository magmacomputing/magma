import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import { getChineseZodiac as getChineseZodiacFn } from '@magmacomputing/tempo-fns';
import type { Tempo } from '@magmacomputing/tempo';

export interface RegionalVariant {
	animal: string;
	emoji: string;
	character?: string;
	romanized?: string;
}

export interface LunarZodiacVariants {
	cn: RegionalVariant;
	jp: RegionalVariant;
	kr: RegionalVariant;
	vn: RegionalVariant;
}

export interface EasternZodiacScope {
	key: string;
	animal: string;
	emoji: string;
	element: 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
	yinYang: 'Yin' | 'Yang';
	variants: LunarZodiacVariants;
	group: 'lunar-zodiac';
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
	microsecond: number;
	nanosecond: number;
	start: Tempo;
	end: Tempo;
}

/** Regional variant data mapping for East Asian Lunar Zodiac systems */
const VARIANT_MAP: Record<string, LunarZodiacVariants> = {
	Rat: {
		cn: { animal: 'Rat', emoji: '🐀', character: '鼠', romanized: 'Shǔ' },
		jp: { animal: 'Rat', emoji: '🐀', character: '子', romanized: 'Ne' },
		kr: { animal: 'Rat', emoji: '🐀', character: '쥐', romanized: 'Jwi' },
		vn: { animal: 'Rat', emoji: '🐀', character: 'Tý / Chuột' },
	},
	Ox: {
		cn: { animal: 'Ox', emoji: '🐂', character: '牛', romanized: 'Niú' },
		jp: { animal: 'Ox', emoji: '🐂', character: '丑', romanized: 'Ushi' },
		kr: { animal: 'Ox', emoji: '🐂', character: '소', romanized: 'So' },
		vn: { animal: 'Water Buffalo', emoji: '🐃', character: 'Sửu / Trâu' },
	},
	Tiger: {
		cn: { animal: 'Tiger', emoji: '🐅', character: '虎', romanized: 'Hǔ' },
		jp: { animal: 'Tiger', emoji: '🐅', character: '寅', romanized: 'Tora' },
		kr: { animal: 'Tiger', emoji: '🐅', character: '호랑이', romanized: 'Horangi' },
		vn: { animal: 'Tiger', emoji: '🐅', character: 'Dần / Hổ' },
	},
	Rabbit: {
		cn: { animal: 'Rabbit', emoji: '🐇', character: '兔', romanized: 'Tù' },
		jp: { animal: 'Rabbit', emoji: '🐇', character: '卯', romanized: 'Usagi' },
		kr: { animal: 'Rabbit', emoji: '🐇', character: '토끼', romanized: 'Tokki' },
		vn: { animal: 'Cat', emoji: '🐈', character: 'Mão / Mèo' },
	},
	Dragon: {
		cn: { animal: 'Dragon', emoji: '🐉', character: '龙', romanized: 'Lóng' },
		jp: { animal: 'Dragon', emoji: '🐉', character: '辰', romanized: 'Tatsu' },
		kr: { animal: 'Dragon', emoji: '🐉', character: '용', romanized: 'Yong' },
		vn: { animal: 'Dragon', emoji: '🐉', character: 'Thìn / Rồng' },
	},
	Snake: {
		cn: { animal: 'Snake', emoji: '🐍', character: '蛇', romanized: 'Shé' },
		jp: { animal: 'Snake', emoji: '🐍', character: '巳', romanized: 'Mi' },
		kr: { animal: 'Snake', emoji: '🐍', character: '뱀', romanized: 'Baem' },
		vn: { animal: 'Snake', emoji: '🐍', character: 'Tỵ / Rắn' },
	},
	Horse: {
		cn: { animal: 'Horse', emoji: '🐎', character: '马', romanized: 'Mǎ' },
		jp: { animal: 'Horse', emoji: '🐎', character: '午', romanized: 'Uma' },
		kr: { animal: 'Horse', emoji: '🐎', character: '말', romanized: 'Mal' },
		vn: { animal: 'Horse', emoji: '🐎', character: 'Ngọ / Ngựa' },
	},
	Goat: {
		cn: { animal: 'Goat', emoji: '🐐', character: '羊', romanized: 'Yáng' },
		jp: { animal: 'Sheep', emoji: '🐑', character: '未', romanized: 'Hitsuji' },
		kr: { animal: 'Sheep', emoji: '🐑', character: '양', romanized: 'Yang' },
		vn: { animal: 'Goat', emoji: '🐐', character: 'Mùi / Dê' },
	},
	Monkey: {
		cn: { animal: 'Monkey', emoji: '🐒', character: '猴', romanized: 'Hóu' },
		jp: { animal: 'Monkey', emoji: '🐒', character: '申', romanized: 'Saru' },
		kr: { animal: 'Monkey', emoji: '🐒', character: '원숭이', romanized: 'Wonsungi' },
		vn: { animal: 'Monkey', emoji: '🐒', character: 'Thân / Khỉ' },
	},
	Rooster: {
		cn: { animal: 'Rooster', emoji: '🐓', character: '鸡', romanized: 'Jī' },
		jp: { animal: 'Rooster', emoji: '🐓', character: '酉', romanized: 'Tori' },
		kr: { animal: 'Rooster', emoji: '🐓', character: '닭', romanized: 'Dak' },
		vn: { animal: 'Rooster', emoji: '🐓', character: 'Dậu / Gà' },
	},
	Dog: {
		cn: { animal: 'Dog', emoji: '🐕', character: '狗', romanized: 'Gǒu' },
		jp: { animal: 'Dog', emoji: '🐕', character: '戌', romanized: 'Inu' },
		kr: { animal: 'Dog', emoji: '🐕', character: '개', romanized: 'Gae' },
		vn: { animal: 'Dog', emoji: '🐕', character: 'Tuất / Chó' },
	},
	Pig: {
		cn: { animal: 'Pig', emoji: '🐖', character: '猪', romanized: 'Zhū' },
		jp: { animal: 'Wild Boar', emoji: '🐗', character: '亥', romanized: 'Inoshishi' },
		kr: { animal: 'Pig', emoji: '🐖', character: '돼지', romanized: 'Dwaeji' },
		vn: { animal: 'Pig', emoji: '🐖', character: 'Hợi / Heo' },
	},
};

/** Base default emojis for canonical animal names */
const BASE_EMOJI_MAP: Record<string, string> = {
	Rat: '🐀', Ox: '🐂', Tiger: '🐅', Rabbit: '🐇', Dragon: '🐉',
	Snake: '🐍', Horse: '🐎', Goat: '🐐', Monkey: '🐒', Rooster: '🐓',
	Dog: '🐕', Pig: '🐖',
};

/**
 * Resolves complete Lunar Zodiac scope including animal, element, Yin/Yang state, and regional variants.
 *
 * @param t - The source Tempo instance
 * @param anchor - Optional reference time or year override
 * @returns Complete Eastern Zodiac scope with localized emoji, animal names, and temporal boundaries
 * @internal
 */
function getEasternScope(t: Tempo, anchor?: any): EasternZodiacScope {
	const refTempo = anchor ?? t;
	const year = anchor?.year ?? refTempo.yy;
	const res = getChineseZodiacFn(year);

	const animal = res.animal;
	const baseEmoji = BASE_EMOJI_MAP[animal] ?? '🐉';

	const variants = VARIANT_MAP[animal] ?? {
		cn: { animal, emoji: baseEmoji },
		jp: { animal, emoji: baseEmoji },
		kr: { animal, emoji: baseEmoji },
		vn: { animal, emoji: baseEmoji },
	};

	// Determine key string based on optional locale config
	const locale = (refTempo as any).config?.locale ?? (refTempo as any).locale;
	let key = animal;
	let emoji = baseEmoji;

	if (locale) {
		const loc = String(locale).toLowerCase();
		if (loc.startsWith('ja') || loc === 'jp') { key = variants.jp.animal; emoji = variants.jp.emoji; }
		else if (loc.startsWith('vi') || loc === 'vn') { key = variants.vn.animal; emoji = variants.vn.emoji; }
		else if (loc.startsWith('ko') || loc === 'kr') { key = variants.kr.animal; emoji = variants.kr.emoji; }
		else if (loc.startsWith('zh') || loc === 'cn') { key = variants.cn.animal; emoji = variants.cn.emoji; }
	}

	const timeZone = refTempo.tz ?? 'UTC';
	const start = new (t.constructor as any)(`${year}-01-01T00:00:00`, { timeZone });
	const nextYear = year + 1;
	const end = new (t.constructor as any)(`${nextYear}-01-01T00:00:00`, { timeZone });
	const dt = start.toDateTime();

	return {
		key,
		animal,
		emoji,
		element: res.element as EasternZodiacScope['element'],
		yinYang: res.yinYang as EasternZodiacScope['yinYang'],
		variants,
		group: 'lunar-zodiac',
		year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
		start,
		end,
	};
}

/**
 * ## EasternTerm
 * Primary Eastern Lunar Zodiac term definition (`t.term.sign`, `t.term.shengxiao`).
 */
export const EasternTerm = defineTerm({
	key: 'sign',
	scope: 'shengxiao',
	aliases: ['lunarSign', 'eastern'],
	description: 'Eastern Lunar Zodiac cycle and regional variants',
	resolve(this: Tempo, anchor?: any) {
		return [getEasternScope(this, anchor)];
	},
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getEasternScope(this, anchor);
		if (keyOnly === true || keyOnly === undefined) {
			return scopeObj.key;
		}
		return scopeObj;
	},
});

export const LunarSignTerm = EasternTerm;
export const EasternZodiacTerm = EasternTerm;

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		sign: string;
		lunarSign: string;
		eastern: string;
		shengxiao: EasternZodiacScope;
	}
}
