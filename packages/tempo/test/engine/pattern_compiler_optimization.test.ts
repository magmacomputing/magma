import { $Internal, TempoRuntime, init } from '#tempo/support';
import { PatternCompiler } from '../../src/engine/engine.pattern.js';
import { getSymbol } from '../../src/support/support.util.js';

describe('PatternCompiler Optimization and Safety', () => {
	let state: any;
	let compiler: PatternCompiler;

	beforeEach(() => {
		const runtime = TempoRuntime.createScoped();
		state = init({}, false);
		runtime.state = state;
		compiler = new PatternCompiler({ state });
	});

	test('should expand nested placeholders correctly using the hoisted BRACES_REGEX', () => {
		// Define some snippets in the state
		state.parse.snippet[getSymbol('a')] = { source: 'A{b}' };
		state.parse.snippet[getSymbol('b')] = { source: 'B{c}' };
		state.parse.snippet[getSymbol('c')] = { source: 'C' };

		const result = compiler.compileRegExp('{a}');
		expect(result.source).toBe('^(ABC)$');
	});

	test('should handle circular references by hitting recursion limit', () => {
		// Circular reference: a -> b -> a
		state.parse.snippet[getSymbol('a')] = { source: 'A{b}' };
		state.parse.snippet[getSymbol('b')] = { source: 'B{a}' };

		// This should hit the recursion limit (d > 10) and return the partially expanded string
		const result = compiler.compileRegExp('{a}');
		// Expanding {a} -> A{b} -> AB{a} -> ABA{b} ... 
		expect(result.source).toContain('ABABAB');
	});

	test('should handle multiple occurrences of placeholders in a single string', () => {
		state.parse.snippet[getSymbol('x')] = { source: 'X' };

		const result = compiler.compileRegExp('{x}-{x}-{x}');
		expect(result.source).toBe('^(X-X-X)$');
	});
});
