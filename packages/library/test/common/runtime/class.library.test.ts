import { Immutable, Securable, StringTag } from '#library/class.library.js';

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
