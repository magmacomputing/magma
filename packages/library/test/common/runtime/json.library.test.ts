import { stripJSONC, parseJSONC, isJSON, cleanify, rawJSON, isRawJSON } from '#library/json.library.js';

describe('JSON Library', () => {

	describe('stripJSONC', () => {
		it('should throw TypeError on non-string input', () => {
			expect(() => stripJSONC(123 as any)).toThrow(TypeError);
		});

		it('should strip single-line comments and trailing commas', () => {
			const jsonc = `
			{
				// Project configuration
				"name": "tempo", // inline comment
				"enabled": true,
			}
			`;
			const stripped = stripJSONC(jsonc);
			expect(JSON.parse(stripped)).toEqual({ name: 'tempo', enabled: true });
		});

		it('should strip multi-line block comments', () => {
			const jsonc = `
			{
				/* Multi-line
				   description block */
				"mode": "fallback",
				"tiers": ["fast", "reasoning", /* trailing */]
			}
			`;
			const stripped = stripJSONC(jsonc);
			expect(JSON.parse(stripped)).toEqual({ mode: 'fallback', tiers: ['fast', 'reasoning'] });
		});

		it('should preserve URLs with slashes inside quoted strings', () => {
			const jsonc = `
			{
				// Remote API endpoint
				"url": "https://api.groq.com/openai/v1/models",
				"regex": "/*not-a-comment*/"
			}
			`;
			const stripped = stripJSONC(jsonc);
			expect(JSON.parse(stripped)).toEqual({
				url: 'https://api.groq.com/openai/v1/models',
				regex: '/*not-a-comment*/',
			});
		});

		it('should preserve escaped characters inside strings', () => {
			const jsonc = '{"msg": "Hello \\"world\\" // not a comment"}';
			const stripped = stripJSONC(jsonc);
			expect(JSON.parse(stripped)).toEqual({ msg: 'Hello "world" // not a comment' });
		});

		it('should preserve ,} and ,] within string values while removing actual trailing commas', () => {
			const jsonc = `
			{
				"curly": "pattern,}",
				"bracket": "array,]",
				"escaped": "quoted \\",}\\" and \\",]\\"",
				"items": ["a,]", "b,}",],
			}
			`;
			const stripped = stripJSONC(jsonc);
			expect(JSON.parse(stripped)).toEqual({
				curly: 'pattern,}',
				bracket: 'array,]',
				escaped: 'quoted ",}" and ",]"',
				items: ['a,]', 'b,}'],
			});
		});
	});

	describe('parseJSONC', () => {
		it('should parse clean JSON without comments', () => {
			const json = '{"name": "tempo", "version": 1}';
			expect(parseJSONC(json)).toEqual({ name: 'tempo', version: 1 });
		});

		it('should parse JSONC with comments and trailing commas', () => {
			const jsonc = `
			{
				// Comment
				"active": true,
				"count": 42,
			}
			`;
			expect(parseJSONC(jsonc)).toEqual({ active: true, count: 42 });
		});

		it('should support reviver functions matching JSON.parse signature', () => {
			const jsonc = '{"count": "10"}';
			const parsed = parseJSONC(jsonc, (key, value) => {
				if (key === 'count') return Number(value);
				return value;
			});
			expect(parsed).toEqual({ count: 10 });
		});

		it('should throw on malformed JSON when no fallback or safe option is provided', () => {
			const malformed = '{ bad json';
			expect(() => parseJSONC(malformed)).toThrow(SyntaxError);
		});

		it('should return fallback value on malformed JSON when fallback option is provided', () => {
			const malformed = '{ bad json';
			const fallback = { status: 'fallback' };
			const result = parseJSONC(malformed, { fallback });
			expect(result).toBe(fallback);
		});

		it('should return undefined on malformed JSON when safe option is true', () => {
			const malformed = '{ bad json';
			const result = parseJSONC(malformed, { safe: true });
			expect(result).toBeUndefined();
		});

		it('should support combined reviver and fallback options', () => {
			const valid = '{"count": "20"}';
			const result = parseJSONC(valid, {
				reviver: (key, val) => key === 'count' ? Number(val) : val,
				fallback: { count: 0 },
			});
			expect(result).toEqual({ count: 20 });
		});
	});

	describe('isJSON', () => {
		it('should return true for valid JSON and JSONC', () => {
			expect(isJSON('{"a": 1}')).toBe(true);
			expect(isJSON('{\n// comment\n"a": 1,\n}')).toBe(true);
			expect(isJSON('[1, 2, 3]')).toBe(true);
			expect(isJSON('"hello"')).toBe(true);
			expect(isJSON('123')).toBe(true);
		});

		it('should return false for invalid JSON or non-string inputs', () => {
			expect(isJSON('{ invalid }')).toBe(false);
			expect(isJSON('')).toBe(false);
			expect(isJSON(null as any)).toBe(false);
			expect(isJSON(123 as any)).toBe(false);
		});
	});

	describe('rawJSON & isRawJSON', () => {
		it('should throw TypeError when non-string is passed to rawJSON', () => {
			expect(() => rawJSON(123 as any)).toThrow(TypeError);
		});

		it('should create raw JSON objects that stringify verbatim when supported', () => {
			const raw = rawJSON('12345678901234567890');
			expect(isRawJSON(raw)).toBe(true);

			const payload = { id: raw };
			if (typeof (JSON as any).rawJSON === 'function') {
				expect(JSON.stringify(payload)).toBe('{"id":12345678901234567890}');
			} else {
				expect(JSON.stringify(payload)).toBe('{"id":{"rawJSON":"12345678901234567890"}}');
			}
		});

		it('should correctly identify non-rawJSON values in isRawJSON', () => {
			expect(isRawJSON(null)).toBe(false);
			expect(isRawJSON(undefined)).toBe(false);
			expect(isRawJSON(123)).toBe(false);
			expect(isRawJSON('{"a":1}')).toBe(false);
			expect(isRawJSON({})).toBe(false);
		});
	});

	describe('cleanify', () => {
		it('should strip undefined and function properties from objects', () => {
			const dirty = {
				name: 'tempo',
				fn: () => true,
				undef: undefined,
				nested: {
					count: 5,
					extra: undefined,
				},
			};
			expect(cleanify(dirty)).toEqual({
				name: 'tempo',
				nested: {
					count: 5,
				},
			});
		});

		it('should propagate serialization errors and log only metadata on circular structures', () => {
			const circular: any = {};
			circular.self = circular;
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(() => cleanify(circular)).toThrow(TypeError);
			expect(warnSpy).toHaveBeenCalled();
			const warnCallArg = warnSpy.mock.calls[0][1];
			expect(warnCallArg).not.toBe(circular);
			warnSpy.mockRestore();
		});
	});

});
