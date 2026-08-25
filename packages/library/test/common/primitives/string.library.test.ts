import { makeTemplate, sprintf, trimAll, randomString } from '#library/string.library.js';

describe('String Library', () => {
	describe('makeTemplate', () => {
		it('should substitute simple placeholders', () => {
			const template = 'Hello ${name}!';
			const data = { name: 'World' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hello World!');
		});

		it('should substitute multiple placeholders', () => {
			const template = '${greeting}, ${name}!';
			const data = { greeting: 'Hi', name: 'Alice' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hi, Alice!');
		});

		it('should handle missing keys gracefully', () => {
			const template = 'Hello ${name}${unknown}!';
			const data = { name: 'World' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hello World!');
		});

		it('should be safe from code execution', () => {
			const template = 'Hello ${console.log("hacked")}';
			const data = {};
			const result = makeTemplate(template)(data);
			// It should just return "Hello " (or "Hello undefined" depending on implementation)
			// Our implementation returns empty string for undefined.
			expect(result).toBe('Hello ');
		});

		it('should handle templateString as non-string (coerce to string)', () => {
			const template = 12345;
			const result = makeTemplate(template as any)({});
			expect(result).toBe('12345');
		});
	});

	describe('sprintf', () => {
		it('should substitute multi-digit parameter markers like ${10} when 11 or more arguments are passed', () => {
			const args = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
			const format = '%s %s %s %s %s %s %s %s %s %s %s %s';
			const result = sprintf(format, ...args);
			expect(result).toBe('zero one two three four five six seven eight nine ten eleven');

			const explicitMarkerResult = sprintf('${10} and ${0}', ...args);
			expect(explicitMarkerResult).toBe('ten and zero, one, two, three, four, five, six, seven, eight, nine, eleven');

			const allExplicitResult = sprintf('${0} - ${10}', 'arg0', 'arg1', 'arg2', 'arg3', 'arg4', 'arg5', 'arg6', 'arg7', 'arg8', 'arg9', 'arg10');
			expect(allExplicitResult).toBe('arg0 - arg10, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9');
		});
	});

	describe('trimAll', () => {
		it('should preserve literal "undefined" when pat is absent', () => {
			expect(trimAll('undefined text')).toBe('undefined text');
			expect(trimAll('  undefined \t value \n ')).toBe('undefined value');
			expect(trimAll('foo undefined bar', /foo/)).toBe('undefined bar');
		});
	});

	describe('randomString', () => {
		it('should generate string exceeding 65,536 bytes without throwing', () => {
			const res = randomString(70000);
			expect(res.length).toBe(70000);
		});
	});
});
