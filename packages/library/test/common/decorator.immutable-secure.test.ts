import { Immutable, Securable } from '../../src/common/class.library.js';

describe('Class Decorators: Immutable & Secure', () => {
  it('Immutable: should throw on mutation (Object.freeze, strict mode)', () => {
    @Immutable
    class Silent {
      x = 1;
    }
    const s = new Silent();
    expect(() => { (s as any).x = 2; }).toThrow(TypeError);
    expect(s.x).toBe(1);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('Secure: should throw on mutation (Proxy)', () => {
    @Securable
    class Noisy {
      x = 1;
    }
    const n = new Noisy();
    expect(() => { (n as any).x = 2; }).toThrow();
    expect(n.x).toBe(1);
  });

  it('Secure: should throw on property deletion', () => {
    @Securable
    class Noisy {
      x = 1;
    }
    const n = new Noisy();
    expect(() => { delete (n as any).x; }).toThrow();
    expect(n.x).toBe(1);
  });

  it('Immutable: should allow instanceof and preserve prototype', () => {
    @Immutable
    class Silent {}
    const s = new Silent();
    expect(s instanceof Silent).toBe(true);
  });

  it('Secure: should allow instanceof and preserve prototype', () => {
    @Securable
    class Noisy {}
    const n = new Noisy();
    expect(n instanceof Noisy).toBe(true);
  });

  it('Secure: should not break static properties', () => {
    @Securable
    class Noisy { static foo = 42; }
    expect(Noisy.foo).toBe(42);
  });

  it('Immutable: should not break static properties', () => {
    @Immutable
    class Silent { static foo = 42; }
    expect(Silent.foo).toBe(42);
  });
});
