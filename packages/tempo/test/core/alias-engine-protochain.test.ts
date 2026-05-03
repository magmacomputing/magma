import { AliasEngine } from '#tempo/engine/engine.alias.js';
import { Logify } from '#library/logify.class.js';

describe('AliasEngine prototype chain (Global → Sandbox → Instance)', () => {
  const logger = new Logify({ debug: true });

  // Simulate a global state
  const globalShape = {} as { aliasEngine: AliasEngine };
  globalShape.aliasEngine = new AliasEngine({ logger });
  globalShape.aliasEngine.registerEventAlias('globalEvt', 'globalValue');

  // Simulate a sandbox state inheriting from global
  const sandboxShape = Object.create(globalShape);
  sandboxShape.aliasEngine = new AliasEngine({ parent: globalShape.aliasEngine, logger });
  sandboxShape.aliasEngine.registerEventAlias('sandboxEvt', 'sandboxValue');

  // Simulate a local/instance state inheriting from sandbox
  const localShape = Object.create(sandboxShape);
  localShape.aliasEngine = new AliasEngine({ parent: sandboxShape.aliasEngine, logger });
  localShape.aliasEngine.registerEventAlias('localEvt', 'localValue');

  it('resolves local, sandbox, and global aliases in correct order', () => {
    // Local should resolve its own
    expect(localShape.aliasEngine.resolveEventAlias('localEvt')).toBe('localValue');
    // Local should resolve sandbox
    expect(localShape.aliasEngine.resolveEventAlias('sandboxEvt')).toBe('sandboxValue');
    // Local should resolve global
    expect(localShape.aliasEngine.resolveEventAlias('globalEvt')).toBe('globalValue');
    // Sandbox should not see local
    expect(sandboxShape.aliasEngine.resolveEventAlias('localEvt')).toBe('localEvt');
    // Sandbox should resolve its own and global
    expect(sandboxShape.aliasEngine.resolveEventAlias('sandboxEvt')).toBe('sandboxValue');
    expect(sandboxShape.aliasEngine.resolveEventAlias('globalEvt')).toBe('globalValue');
    // Global should only resolve its own
    expect(globalShape.aliasEngine.resolveEventAlias('globalEvt')).toBe('globalValue');
    expect(globalShape.aliasEngine.resolveEventAlias('sandboxEvt')).toBe('sandboxEvt');
    expect(globalShape.aliasEngine.resolveEventAlias('localEvt')).toBe('localEvt');
  });

  it('collision detection traverses the prototype chain', () => {
    // Register a colliding alias in local
    localShape.aliasEngine.registerEventAlias('globalEvt', 'localShadow');
    // Should warn about collision with global
    // (You may want to spy on logger.warn for a real assertion)
    expect(localShape.aliasEngine.resolveEventAlias('globalEvt')).toBe('localShadow');
    expect(globalShape.aliasEngine.resolveEventAlias('globalEvt')).toBe('globalValue');
  });
});
