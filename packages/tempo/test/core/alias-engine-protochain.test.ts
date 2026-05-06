import { AliasEngine } from '#tempo/engine/engine.alias.js';
import { Logify } from '#library/logify.class.js';
import { vi } from 'vitest';

describe('AliasEngine prototype chain (Global → Sandbox → Instance)', () => {
  const logger = {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    trace: vi.fn()
  } as unknown as Logify;

  // Simulate a global state
  const globalShape = {} as { aliasEngine: AliasEngine };
  globalShape.aliasEngine = new AliasEngine({ logger });
  globalShape.aliasEngine.registerAliases('evt', [ ['globalEvt', 'globalValue'] ]);

  // Simulate a sandbox state inheriting from global
  const sandboxShape = Object.create(globalShape);
  sandboxShape.aliasEngine = new AliasEngine({ parent: globalShape.aliasEngine, logger });
  sandboxShape.aliasEngine.registerAliases('evt', [ ['sandboxEvt', 'sandboxValue'] ]);

  // Simulate a local/instance state inheriting from sandbox
  const localShape = Object.create(sandboxShape);
  localShape.aliasEngine = new AliasEngine({ parent: sandboxShape.aliasEngine, logger });
  localShape.aliasEngine.registerAliases('evt', [ ['localEvt', 'localValue'] ]);

  it('resolves local, sandbox, and global aliases in correct order', () => {
    // Local should resolve its own
    expect(localShape.aliasEngine.resolveAlias('evt2_0')?.value).toBe('localValue');
    // Local should resolve sandbox
    expect(localShape.aliasEngine.resolveAlias('evt1_0')?.value).toBe('sandboxValue');
    // Local should resolve global
    expect(localShape.aliasEngine.resolveAlias('evt0_0')?.value).toBe('globalValue');
    // Sandbox should not see local
    expect(sandboxShape.aliasEngine.resolveAlias('evt2_0')).toBeUndefined();
    // Sandbox should resolve its own and global
    expect(sandboxShape.aliasEngine.resolveAlias('evt1_0')?.value).toBe('sandboxValue');
    expect(sandboxShape.aliasEngine.resolveAlias('evt0_0')?.value).toBe('globalValue');
    // Global should only resolve its own
    expect(globalShape.aliasEngine.resolveAlias('evt0_0')?.value).toBe('globalValue');
    expect(globalShape.aliasEngine.resolveAlias('evt1_0')).toBeUndefined();
    expect(globalShape.aliasEngine.resolveAlias('evt2_0')).toBeUndefined();
  });

  it('collision detection traverses the prototype chain', () => {
    (logger.warn as any).mockClear();

    // Register a colliding alias in local
    localShape.aliasEngine.registerAliases('evt', [ ['globalEvt', 'localShadow'] ]);

    // Should warn about collision with global
    expect(logger.warn).toHaveBeenCalled();
    expect((logger.warn as any).mock.calls[0][1]).toMatch(/Collision detected/i);

    expect(localShape.aliasEngine.resolveAlias('evt2_1')?.value).toBe('localShadow');
    expect(globalShape.aliasEngine.resolveAlias('evt0_0')?.value).toBe('globalValue');

    (logger.warn as any).mockReset();
  });
});
