import { AliasEngine } from '#tempo/engine/engine.alias.js';
import type { Logify } from '#library/logify.class.js';

// Use a real Logify logger, but spy on console.warn
const logger = {
	warn: (config: any, msg: string) => console.warn(msg, config),
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
 		expect(engine.resolveAlias('evt0_0')?.value).toBe('bar');
		engine.registerAliases('per', [['noon', function () { return '12:00'; }]]);
 		expect(engine.resolveAlias('per0_0')?.value).toBe('12:00');
		expect(engine.resolveAlias('per0_0')?.isClock).toBe(true);
	});

	it('supports parent/child shadowing and fallback', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		// Local should resolve parent's alias before shadowing
		expect(localEngine.resolveAlias('evt0_0')?.value).toBe('bar');
		expect(localEngine.resolveAlias('evt0_0')?.source).toBe('global');
		// After shadowing, local resolves its own, parent still resolves its own
		localEngine.registerAliases('evt', [['foo', 'baz']]);
		expect(localEngine.resolveAlias('evt1_0')?.value).toBe('baz');
		expect(localEngine.resolveAlias('evt1_0')?.source).toBe('local');
		expect(globalEngine.resolveAlias('evt0_0')?.value).toBe('bar');
	});

	it('warns on local/global collision', () => {
		const warnSpy = vi.spyOn(console, 'warn');
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('evt', [['xmas', '25-Dec']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerAliases('evt', [['xmas', '24-Dec']]);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'), undefined);
	});

	it('warns on local collision', () => {
		const warnSpy = vi.spyOn(console, 'warn');
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['xmas', '25-Dec'], ['xmas', '24-Dec']]);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'), undefined);
	});

	it('registers and resolves batch aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar'], ['baz', 'qux']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('bar');
		expect(engine.resolveAlias('evt0_1')?.value).toBe('qux');
	});

	it('clears only events or periods', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['foo', 'bar']]);
		engine.registerAliases('per', [['noon', '12:00']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('bar');
		expect(engine.resolveAlias('per0_0')?.value).toBe('12:00');

		engine.clear('evt');
		// After clearing, the alias key should not resolve
		expect(engine.resolveAlias('evt0_0')).toBeUndefined();
		expect(engine.resolveAlias('per0_0')?.value).toBe('12:00');
		engine.clear('per');
		expect(engine.resolveAlias('per0_0')).toBeUndefined();
	});

	it('handles regex-like collision heuristics', () => {
		const warnSpy = vi.spyOn(console, 'warn');
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['xmas( )?eve', '24-Dec'], ['xmas eve', '24-Dec']]);
		// Should treat "xmas eve" and "xmas( )?eve" as same base word
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'), undefined);
	});

	it('does not warn on non-colliding aliases', () => {
		const warnSpy = vi.spyOn(console, 'warn');
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['xmas', '25-Dec'], ['bday', '20-May']]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('resolves to parent after clear', () => {
		const globalEngine = new AliasEngine({ logger });
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine, logger });
		localEngine.registerAliases('evt', [['foo', 'baz']]);
		expect(localEngine.resolveAlias('evt1_0')?.value).toBe('baz');

		localEngine.clear('evt');
		// Should resolve back to parent's alias after clearing local
		expect(localEngine.resolveAlias('evt0_0')?.value).toBe('bar');
	});

	it('handles empty/optional/edge-case aliases', () => {
		const engine = new AliasEngine({ logger });
		engine.registerAliases('evt', [['', 'empty'], ['foo', '']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('empty');
		expect(engine.resolveAlias('evt0_1')?.value).toBe('');
		expect(engine.resolveAlias('non-existent' as any)).toBeUndefined();
	});
});
