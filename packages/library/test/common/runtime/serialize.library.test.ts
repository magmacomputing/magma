import { stringify, objectify, cloneify } from '#library';

const label = 'serialize_symbol:';
const sym1 = Symbol.for('global');
const sym2 = Symbol('local');

const Summer = { [sym2]: { "Summer": { day: 1, month: 6 } } };
const Winter = { [sym1]: { "Winter": { day: 1, month: 12 } } };

/**
 * Test the serialization of Symbols
 */
describe(`${label}`, () => {
  const global = { "$Symbol": "@@(global)" };
  test(`${label} stringify Symbol.for(global) == ${sym1.toString()}`, () => {
    expect(stringify(sym1))
      .toEqual(JSON.stringify(global))
  })

  // global Symbols can be cloned
  test(`${label} objectify Symbol.for(global) == ${sym1.toString()}`, () => {
    expect(objectify(stringify(sym1)))
      .toEqual(sym1)
  })

  // global Symbols are equal
  test(`${label} cloneify Object{[@@global]: any} == ${stringify(Winter)}`, () => {
    expect(cloneify(Winter))
      .toEqual(Winter)
  })

  // local Symbols cannot be cloned
  test(`${label} cloneify Symbol(local) != ${sym2.toString()}`, () => {
    expect(cloneify(sym2))
      .not.toEqual(sym2)
  })

  // local Symbols are not equal
  test(`${label} cloneify Object{[@local]: any} != ${stringify(Summer)}`, () => {
    expect(cloneify(Summer))
      .not.toEqual(Summer)
  })
})

describe('registerSerializable', () => {
  it('should reject conflicting registrations from distinct constructors with identical names/tags and resolve intended constructor via objectify', async () => {
    const { registerSerializable, objectify } = await import('#library/serialize.library.js');

    class IntendedWidget {
      value: number;
      constructor(data: { value: number }) {
        this.value = data.value;
      }
      get [Symbol.toStringTag]() {
        return 'ConflictingWidgetTag';
      }
    }

    class ConflictingWidget {
      value: number;
      constructor(data: { value: number }) {
        this.value = data.value * 2;
      }
      get [Symbol.toStringTag]() {
        return 'ConflictingWidgetTag';
      }
    }

    // Register initial constructor
    registerSerializable('ConflictingWidgetTag', IntendedWidget);

    // Idempotent registration of exact same constructor should succeed
    expect(() => registerSerializable('ConflictingWidgetTag', IntendedWidget)).not.toThrow();

    // Registration of distinct constructor must throw collision error
    expect(() => registerSerializable('ConflictingWidgetTag', ConflictingWidget)).toThrow(/Collision/);

    // Confirm objectify resolves instances to the intended constructor
    const restored = objectify<IntendedWidget>('{"$ConflictingWidgetTag":{"value":42}}');
    expect(restored).toBeInstanceOf(IntendedWidget);
    expect(restored).not.toBeInstanceOf(ConflictingWidget);
    expect(restored.value).toBe(42);
  });
});