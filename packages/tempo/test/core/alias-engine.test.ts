import { AliasEngine } from '#tempo/engine/engine.alias.js';
import { logTempo } from '#tempo/support';

describe('AliasEngine', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});
	it('registers and resolves string and function aliases', () => {
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['foo', 'bar']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('bar');
		engine.registerAliases('per', [['noon', function () { return '12:00'; }]]);
		expect(engine.resolveAlias('per0_0')?.value).toBe('12:00');
		expect(engine.resolveAlias('per0_0')?.isClock).toBe(true);
	});

	it('supports parent/child shadowing and fallback', () => {
		const globalEngine = new AliasEngine();
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine });
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
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const globalEngine = new AliasEngine();
		globalEngine.registerAliases('evt', [['xmas', '25-Dec']]);
		const localEngine = new AliasEngine({ parent: globalEngine });
		localEngine.registerAliases('evt', [['xmas', '24-Dec']]);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'));
	});

	it('warns on local collision', () => {
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['xmas', '25-Dec'], ['xmas', '24-Dec']]);

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'));
	});

	it('registers and resolves batch aliases', () => {
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['foo', 'bar'], ['baz', 'qux']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('bar');
		expect(engine.resolveAlias('evt0_1')?.value).toBe('qux');
	});

	it('clears only events or periods', () => {
		const engine = new AliasEngine();
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
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['xmas( )?eve', '24-Dec'], ['xmas eve', '24-Dec']]);
		// Should treat "xmas eve" and "xmas( )?eve" as same base word
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Collision detected'));
	});

	it('does not warn on non-colliding aliases', () => {
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['xmas', '25-Dec'], ['bday', '20-May']]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('resolves to parent after clear', () => {
		const globalEngine = new AliasEngine();
		globalEngine.registerAliases('evt', [['foo', 'bar']]);
		const localEngine = new AliasEngine({ parent: globalEngine });
		localEngine.registerAliases('evt', [['foo', 'baz']]);
		expect(localEngine.resolveAlias('evt1_0')?.value).toBe('baz');

		localEngine.clear('evt');
		// Should resolve back to parent's alias after clearing local
		expect(localEngine.resolveAlias('evt0_0')?.value).toBe('bar');
	});

	it('handles empty/optional/edge-case aliases', () => {
		const engine = new AliasEngine();
		engine.registerAliases('evt', [['', 'empty'], ['foo', '']]);
		expect(engine.resolveAlias('evt0_0')?.value).toBe('empty');
		expect(engine.resolveAlias('evt0_1')?.value).toBe('');
		expect(engine.resolveAlias('non-existent' as any)).toBeUndefined();
	});

	it('does not falsely warn on distinct non-Latin script aliases', () => {
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const engine = new AliasEngine();
		engine.registerAliases('evt', [
			['أمس', 'yesterday'],
			['اليوم', 'today'],
			['غدًا', 'tomorrow'],
			['今日', 'today'],
			['明日', 'tomorrow'],
		]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('generates patterns matching both NFC and NFD forms for diacritics', () => {
		const engine = new AliasEngine();
		// 'été' in NFC
		const nfcWord = 'été';
		const nfdWord = 'e\u0301te\u0301';
		expect(nfcWord).not.toBe(nfdWord);

		engine.registerAliases('evt', [[nfcWord, 'summer']]);
		const patterns = engine.getPatterns('evt');
		expect(patterns).toBe(`(?<evt0_0>${nfcWord}|${nfdWord})`);
		
		// Ensure regex constructed from pattern matches both NFC and NFD strings
		const regex = new RegExp(patterns!);
		expect(regex.test(nfcWord)).toBe(true);
		expect(regex.test(nfdWord)).toBe(true);
	});

	it('deduplicates NFC and NFD alias registrations with the same target without warning', () => {
		const warnSpy = vi.spyOn(logTempo, 'warn');
		const engine = new AliasEngine();
		const nfcWord = 'été';
		const nfdWord = 'e\u0301te\u0301';

		engine.registerAliases('evt', [
			[nfcWord, 'summer'],
			[nfdWord, 'summer'],
		]);

		expect(warnSpy).not.toHaveBeenCalled();
		const aliases = engine.getAliases('evt');
		expect(aliases).toHaveLength(1);
		expect(aliases[0].name.normalize('NFC')).toBe(nfcWord);
		expect(aliases[0].target).toBe('summer');
	});
});
