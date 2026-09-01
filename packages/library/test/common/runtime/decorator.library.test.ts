import { Immutable, Mutable, Securable, StringTag, Singleton } from '#library/decorator.library.js';

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

describe('Class Decorators: StringTag', () => {
  it('should set Symbol.toStringTag to class name when used without arguments', () => {
    @StringTag
    class Widget {}

    const w = new Widget();
    expect(Object.prototype.toString.call(w)).toBe('[object Widget]');
    expect((w as any)[Symbol.toStringTag]).toBe('Widget');
  });

  it('should set Symbol.toStringTag to custom tag when string parameter provided', () => {
    @StringTag('CustomWidget')
    class Widget {}

    const w = new Widget();
    expect(Object.prototype.toString.call(w)).toBe('[object CustomWidget]');
    expect((w as any)[Symbol.toStringTag]).toBe('CustomWidget');
  });

  it('should not overwrite existing Symbol.toStringTag on prototype', () => {
    @StringTag('IgnoredTag')
    class PretaggedWidget {
      get [Symbol.toStringTag]() {
        return 'OriginalTag';
      }
    }

    const pw = new PretaggedWidget();
    expect(Object.prototype.toString.call(pw)).toBe('[object OriginalTag]');
    expect((pw as any)[Symbol.toStringTag]).toBe('OriginalTag');
  });

  it('should support decorator stacking with @Immutable', () => {
    @Immutable
    @StringTag('FrozenWidget')
    class StackedWidget {}

    const sw = new StackedWidget();
    expect(Object.prototype.toString.call(sw)).toBe('[object FrozenWidget]');
    expect(Object.isFrozen(sw)).toBe(true);
  });
});

describe('Class Decorators: Singleton', () => {
  it('should return identical instance on subsequent instantiations (@Singleton without parentheses)', () => {
    @Singleton
    class ConfigStore {
      public apiKey = 'secret_123';
    }

    const a = new ConfigStore();
    const b = new ConfigStore();
    expect(a).toBe(b);
    expect(a.apiKey).toBe('secret_123');
    expect((ConfigStore as any).instance).toBe(a);
  });

  it('should support @Singleton with options/parentheses', () => {
    @Singleton()
    class AppRegistry {
      public count = 0;
    }

    const first = new AppRegistry();
    first.count = 42;
    const second = new AppRegistry();
    expect(second).toBe(first);
    expect(second.count).toBe(42);
    expect((AppRegistry as any).instance).toBe(first);
  });

  it('should preserve instanceof checks and static members', () => {
    @Singleton
    class Service {
      static version = '1.0.0';
    }

    const s = new Service();
    expect(s instanceof Service).toBe(true);
    expect(Service.version).toBe('1.0.0');
  });

  it('should enforce argument matching unless allowArgMismatch is true', () => {
    @Singleton
    class ParamStore {
      constructor(public id: string) {}
    }

    const p1 = new ParamStore('alpha');
    expect(() => new ParamStore('beta')).toThrow(/Argument mismatch/);
    expect(new ParamStore('alpha')).toBe(p1);

    @Singleton({ allowArgMismatch: true })
    class PermissiveStore {
      constructor(public id: string) {}
    }

    const m1 = new PermissiveStore('alpha');
    const m2 = new PermissiveStore('beta');
    expect(m2).toBe(m1);
    expect(m2.id).toBe('alpha');
  });

  it('should detect argument mismatch when initial construction has zero arguments', () => {
    @Singleton
    class ZeroArgStore {
      constructor(public id?: string) {}
    }

    const z1 = new ZeroArgStore();
    expect(() => new ZeroArgStore('extra')).toThrow(/Argument mismatch/);
    expect(new ZeroArgStore()).toBe(z1);
  });
});

describe('Class Decorators: Mutable', () => {
  it('should prevent hardening of decorated methods when condition evaluates to true', () => {
    let testMode = true;

    @Immutable
    class StatefulEngine {
      static version = 1;

      @Mutable(() => testMode)
      static reset() {
        StatefulEngine.version++;
      }
    }

    expect(() => {
      StatefulEngine.reset = () => {};
    }).not.toThrow();
  });

  it('should support bare @Mutable, @Mutable(), @Mutable(boolean), and @Mutable(() => boolean)', () => {
    @Immutable
    class SyntaxVariantEngine {
      @Mutable
      static bareMethod() {}

      @Mutable()
      static emptyParensMethod() {}

      @Mutable(true)
      static trueBoolMethod() {}

      @Mutable(false)
      static falseBoolMethod() {}
    }

    expect(() => { SyntaxVariantEngine.bareMethod = () => {}; }).not.toThrow();
    expect(() => { SyntaxVariantEngine.emptyParensMethod = () => {}; }).not.toThrow();
    expect(() => { SyntaxVariantEngine.trueBoolMethod = () => {}; }).not.toThrow();
    expect(() => { SyntaxVariantEngine.falseBoolMethod = () => {}; }).toThrow();
  });

  it('should have zero effect on classes not decorated with @Immutable or @Securable', () => {
    class StandardClass {
      @Mutable()
      static init() {}
    }
    expect(typeof StandardClass.init).toBe('function');
  });

  it('should compare member names by identity rather than String coercion (distinct symbols with same description)', () => {
    const symA = Symbol('testSymbol');
    const symB = Symbol('testSymbol');

    @Immutable
    class SymbolEngine {
      @Mutable
      static [symA]() {}

      static [symB]() {}
    }

    // symA is decorated with @Mutable, so its property descriptor shouldn't be locked writable: false
    expect(() => { (SymbolEngine as any)[symA] = () => {}; }).not.toThrow();
    // symB is NOT decorated with @Mutable, even though it shares description 'testSymbol' with symA
    expect(() => { (SymbolEngine as any)[symB] = () => {}; }).toThrow();
  });

  it('should support non-static / instance members decorated with @Mutable on @Immutable classes', () => {
    let testMode = true;

    @Immutable
    class Component {
      @Mutable(() => testMode)
      resetInstance() {}

      @Mutable
      get dynamicData() {
        return 42;
      }
    }

    expect(() => {
      Component.prototype.resetInstance = () => {};
    }).not.toThrow();

    expect(() => {
      Object.defineProperty(Component.prototype, 'dynamicData', {
        get() { return 100; },
        configurable: true,
      });
    }).not.toThrow();

    const c = new Component();
    expect((c as any).dynamicData).toBe(100);
  });
});
