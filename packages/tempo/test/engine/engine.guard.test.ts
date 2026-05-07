import { createMasterGuard } from '#tempo/engine/engine.guard.js';

describe('engine.guard (Master Guard)', () => {
	it('should permit tokens from the provided word list', () => {
		const guard = createMasterGuard(['apple', 'banana', 'cherry']);
		expect(guard.test('apple')).toBe(true);
		expect(guard.test('banana')).toBe(true);
		expect(guard.test('cherry')).toBe(true);
		expect(guard.test('apple banana')).toBe(true);
	});

	it('should reject unrecognized tokens', () => {
		const guard = createMasterGuard(['apple', 'banana']);
		expect(guard.test('apple grape')).toBe(false);
		expect(guard.test('date')).toBe(false);
	});

	it('should handle greedy longest-token matching', () => {
		const guard = createMasterGuard(['jan', 'january']);
		// Should consume 'january' as one token, not 'jan' + 'uary' (which would fail)
		expect(guard.test('january')).toBe(true);
		expect(guard.test('jan')).toBe(true);
	});

	it('should skip valid bracketed content', () => {
		const guard = createMasterGuard(['apple']);
		// [any content] should be skipped by the bracket matcher
		expect(guard.test('apple [random text]')).toBe(true);
		expect(guard.test('[2026] apple')).toBe(true);
	});

	it('should permit fallback characters (digits and punctuation)', () => {
		const guard = createMasterGuard(['utc']);
		// Digits, hyphens, colons, and dots are usually allowed by Match.guard
		expect(guard.test('2026-05-07 utc 13:00')).toBe(true);
	});

	it('should be case-insensitive', () => {
		const guard = createMasterGuard(['Monday']);
		expect(guard.test('monday')).toBe(true);
		expect(guard.test('MONDAY')).toBe(true);
		expect(guard.test('MonDay')).toBe(true);
	});

	it('should ignore various whitespace characters', () => {
		const guard = createMasterGuard(['token']);
		expect(guard.test('token\n  \t\r  token')).toBe(true);
	});

	it('should handle symbols in the word list', () => {
		const sym = Symbol.for('test.token');
		const guard = createMasterGuard(['apple', sym]);
		expect(guard.test('apple test.token')).toBe(true);
	});

	it('should fail on empty or non-string input', () => {
		const guard = createMasterGuard(['apple']);
		expect(guard.test('')).toBe(false);
		expect(guard.test(null as any)).toBe(false);
		expect(guard.test(123 as any)).toBe(false);
	});
});
