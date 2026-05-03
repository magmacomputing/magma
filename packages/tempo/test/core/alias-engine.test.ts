import { AliasEngine } from '#tempo/engine/engine.alias.js';
import { Logify } from '#library/logify.class.js';

// Simple logger mock
const logger = new Logify({ debug: true });
// const logger = {
//   warn: vi.fn(),
// };

beforeEach(() => {
	// logger.warn.mockClear();
});

describe('AliasEngine', () => {
	it('registers and resolves string and function aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEventAlias('foo', 'bar');
		expect(engine.resolveEventAlias('foo')).toBe('bar');
		engine.registerPeriodAlias('noon', function () { return '12:00'; });
		expect(engine.resolvePeriodAlias('noon')).toBe('12:00');
	});

	it('supports parent/child shadowing and fallback', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerEventAlias('foo', 'bar');
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		expect(localEngine.resolveEventAlias('foo')).toBe('bar');
		localEngine.registerEventAlias('foo', 'baz');
		expect(localEngine.resolveEventAlias('foo')).toBe('baz');
		expect(globalEngine.resolveEventAlias('foo')).toBe('bar');
	});

	it('warns on local/global collision', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerPeriodAlias('noon', '12:00');
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerPeriodAlias('noon', '11:00');
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('noon'));
	});

	it('warns on local collision', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEventAlias('foo', 'bar');
		engine.registerEventAlias('foo', 'baz');
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('foo'));
	});

	it('registers and resolves batch aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEvents([
			['a', '1'],
			['b', '2'],
		]);
		expect(engine.resolveEventAlias('a')).toBe('1');
		expect(engine.resolveEventAlias('b')).toBe('2');
	});

	it('clears only events or periods', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEventAlias('foo', 'bar');
		engine.registerPeriodAlias('noon', '12:00');
		engine.clear('event');
		expect(engine.resolveEventAlias('foo')).toBe('foo');
		expect(engine.resolvePeriodAlias('noon')).toBe('12:00');
		engine.clear('period');
		expect(engine.resolvePeriodAlias('noon')).toBe('noon');
	});

	it('handles regex-like collision heuristics', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerPeriodAlias('noon', '12:00');
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerPeriodAlias('([after[ -]?])?noon', '11:00');

		// This should warn, even if not a perfect regex match
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('noon'));
	});

	it('does not warn on non-colliding aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEventAlias('foo', 'bar');
		engine.registerEventAlias('baz', 'qux');
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('resolves to parent after clear', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerEventAlias('foo', 'bar');
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerEventAlias('foo', 'baz');
		expect(localEngine.resolveEventAlias('foo')).toBe('baz');
		localEngine.clear('event');
		expect(localEngine.resolveEventAlias('foo')).toBe('bar');
	});

	it('handles empty/optional/edge-case aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerEventAlias('', 'empty');
		expect(engine.resolveEventAlias('')).toBe('empty');
		engine.registerEventAlias('?', 'question');
		expect(engine.resolveEventAlias('?')).toBe('question');
	});
});
