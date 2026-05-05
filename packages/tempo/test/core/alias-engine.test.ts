import { AliasEngine } from '#tempo/engine/engine.alias.js';
import type { Logify } from '#library/logify.class.js';

// Use a real Logify logger, but spy on console.warn
const logger = {
	warn: (...args: any[]) => console.warn(...args),
	debug: () => { },
	error: () => { },
	log: () => { },
	info: () => { },
	trace: () => { },
} as unknown as Logify;

describe('AliasEngine', () => {
	it('registers and resolves string and function aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar']]);
 		expect(engine.resolveAlias('evt0_0')).toBe('bar');
		engine.registerAliases('per', [['noon', function () { return '12:00'; }]]);
 		expect(engine.resolveAlias('per0_0')).toBe('12:00');
	});

	it('supports parent/child shadowing and fallback', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		// Local should resolve parent's alias before shadowing
		expect(localEngine.resolveAlias('evt0_0')).toBe('bar');
		// After shadowing, local resolves its own, parent still resolves its own
		localEngine.registerAliases('evt', [['foo', 'baz']]);
		expect(localEngine.resolveAlias('evt1_0')).toBe('baz');
		expect(globalEngine.resolveAlias('evt0_0')).toBe('bar');
	});

	it('warns on local/global collision', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('per', [['noon', '12:00']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerAliases('per', [['noon', '11:00']]);
		const warnCall = (console.warn as any).mock.calls[0];
		expect(warnCall[1]).toContain('noon');
	});

	it('warns on local collision', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar']]);
		engine.registerAliases('evt', [['foo', 'baz']]);
		const warnCall = (console.warn as any).mock.calls[0];
		expect(warnCall[1]).toContain('foo');
	});

	it('registers and resolves batch aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [
			['a', '1'],
			['b', '2'],
		]);
 		expect(engine.resolveAlias('evt0_0')).toBe('1');
 		expect(engine.resolveAlias('evt0_1')).toBe('2');
	});

	it('clears only events or periods', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar']]);
		engine.registerAliases('per', [['noon', '12:00']]);
		engine.clear('evt');
		// After clearing, the alias key should not resolve to the value, but to the key itself
		expect(engine.resolveAlias('evt0_0')).toBe('evt0_0');
		expect(engine.resolveAlias('per0_0')).toBe('12:00');
		engine.clear('per');
		expect(engine.resolveAlias('per0_0')).toBe('per0_0');
	});

	it('handles regex-like collision heuristics', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('per', [['noon', '12:00']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerAliases('per', [['([after[ -]?])?noon', '11:00']]);

		// This should warn, even if not a perfect regex match
		const warnCall = (console.warn as any).mock.calls[0];
		expect(warnCall[1]).toContain('noon');
	});

	it('does not warn on non-colliding aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar']]);
		engine.registerAliases('evt', [['baz', 'qux']]);
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('resolves to parent after clear', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerAliases('evt', [['foo', 'baz']]);
		expect(localEngine.resolveAlias('evt1_0')).toBe('baz');

		let globalAliases = globalEngine.getAliases('evt');
		let localAliases = localEngine.getAliases('evt');
		expect(localAliases[0].target).toBe('baz');

		localEngine.clear('evt');
		globalAliases = globalEngine.getAliases('evt');
		localAliases = localEngine.getAliases('evt');
		expect(globalAliases[0].target).toBe('bar');
		expect(localAliases.length).toBe(0);
		// After clearing, local should fallback to parent, but since the key is unique per depth, fallback is not automatic
		// expect(localEngine.resolveAlias('evt1_0')).toBe('baz');
		expect(localEngine.resolveAlias('evt0_0')).toBe('bar');
	});

	it('handles empty/optional/edge-case aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['', 'empty']]);
 		expect(engine.resolveAlias('evt0_0')).toBe('empty');
		engine.registerAliases('evt', [['?', 'question']]);
 		expect(engine.resolveAlias('evt0_1')).toBe('question');
	});
});
