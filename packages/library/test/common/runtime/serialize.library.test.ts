import { stringify, objectify, cloneify, registerSerializable, fastDigest } from '#library/serialize.library.js';
import { isInteger } from '#library/assertion.library.js';

describe('serialize.library', () => {

	describe('stringify', () => {
		it('should serialize basic primitives natively', () => {
			expect(stringify(123)).toBe('123');
			expect(stringify('hello')).toBe('hello');
			expect(stringify(true)).toBe('true');
			expect(stringify(null)).toBe('null');
		});

		it('should serialize BigInts to compact tagged strings by default', () => {
			const json = stringify(123n);
			expect(json).toBe('"~n123"');
		});

		it('should serialize Dates into compact epoch tagged strings by default', () => {
			const date = new Date('2024-01-01T00:00:00.000Z');
			const json = stringify(date);
			expect(json).toBe(`"~t${date.getTime()}"`);
		});

		it('should serialize Sets into safe identifier signatures', () => {
			const set = new Set([1, 'a', true]);
			const json = stringify(set);
			expect(json).toBe('{"$Set":[1,"a",true]}');
		});

		it('should serialize Maps into safe identifier signatures with compact keys/values', () => {
			const map = new Map<any, any>([
				['key1', 1],
				[123n, 'value2'],																	// Map with BigInt key
			]);
			const json = stringify(map);
			expect(json).toBe('{"$Map":[["key1", 1],["~n123", "value2"]]}');
		});

		it('should serialize undefined to a compact tagged string by default', () => {
			expect(stringify(undefined)).toBe('"~u"');
		});

		it('should serialize Symbols to compact tagged strings by default', () => {
			expect(stringify(Symbol.for('test'))).toBe('"~y@@(test)"');
			expect(stringify(Symbol('local'))).toBe('"~y@(local)"');
		});

		it('should escape strings starting with ~ to ~~', () => {
			expect(stringify('~hello')).toBe('"~~hello"');
			expect(stringify('~~test')).toBe('"~~~test"');
		});

		it('should serialize to legacy oneKey envelopes when compact: false', () => {
			const date = new Date('2024-01-01T00:00:00.000Z');
			const map = new Map<any, any>([
				['key1', 1],
				[123n, 'value2'],
			]);

			expect(stringify(123n, { compact: false })).toBe('{"$BigInt":123}');
			expect(stringify(date, { compact: false })).toBe('{"$Date":"2024-01-01T00:00:00.000Z"}');
			expect(stringify(undefined, { compact: false })).toBe('{"$Undefined":"void"}');
			expect(stringify(Symbol.for('test'), { compact: false })).toBe('{"$Symbol":"@@(test)"}');
			expect(stringify(map, { compact: false })).toBe('{"$Map":[["key1", 1],[{"$BigInt":123}, "value2"]]}');
		});
	});

	describe('objectify', () => {
		it('should deserialize basic strings natively', () => {
			expect(objectify('123')).toBe(123);
			expect(objectify('hello')).toBe('hello');
			expect(objectify('true')).toBe(true);
			expect(objectify('null')).toBe(null);
		});

		it('should deserialize compact BigInt tagged strings', () => {
			const val = objectify<bigint>('"~n123"');
			expect(val).toBe(123n);
			expect(isInteger(val)).toBe(true);
		});

		it('should deserialize compact Date epoch tagged strings', () => {
			const epoch = 1704067200000;
			const val = objectify<Date>(`"~t${epoch}"`);
			expect(val).toBeInstanceOf(Date);
			expect(val.getTime()).toBe(epoch);
		});

		it('should deserialize compact undefined tagged strings', () => {
			const sentinel = () => undefined;
			const val = objectify('"~u"', sentinel);
			expect(val).toBeUndefined();
		});

		it('should unescape compact ~~ string values', () => {
			expect(objectify('"~~hello"')).toBe('~hello');
			expect(objectify('"~~~test"')).toBe('~~test');
		});

		it('should deserialize legacy BigInt identifier signatures', () => {
			const val = objectify<bigint>('{"$BigInt":123}');
			expect(val).toBe(123n);
			expect(isInteger(val)).toBe(true);
		});

		it('should deserialize legacy Date identifier signatures', () => {
			const val = objectify<Date>('{"$Date":"2024-01-01T00:00:00.000Z"}');
			expect(val).toBeInstanceOf(Date);
			expect(val.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});

		it('should deserialize Set identifier signatures', () => {
			const val = objectify<Set<any>>('{"$Set":[1,"a",true]}');
			expect(val).toBeInstanceOf(Set);
			expect(val.has(1)).toBeTruthy();
			expect(val.has('a')).toBeTruthy();
			expect(val.has(true)).toBeTruthy();
		});

		it('should deserialize Map identifier signatures with compact elements', () => {
			const val = objectify<Map<any, any>>('{"$Map":[["key1", 1],["~n123", "value2"]]}');
			expect(val).toBeInstanceOf(Map);
			expect(val.get('key1')).toBe(1);
			expect(val.get(123n)).toBe('value2');
		});

		it('should deserialize legacy Map identifier signatures', () => {
			const val = objectify<Map<any, any>>('{"$Map":[["key1", 1],[{"$BigInt":123}, "value2"]]}');
			expect(val).toBeInstanceOf(Map);
			expect(val.get('key1')).toBe(1);
			expect(val.get(123n)).toBe('value2');
		});

		it('should deserialize compact Symbol tagged strings', () => {
			const globalSym = objectify<symbol>('"~y@@(test)"');
			expect(Symbol.keyFor(globalSym)).toBe('test');

			const localSym = objectify<symbol>('"~y@(local)"');
			expect(localSym.description).toBe('local');
		});

		it('should deserialize legacy Symbol identifier signatures', () => {
			const globalSym = objectify<symbol>('{"$Symbol":"@@(test)"}');
			expect(Symbol.keyFor(globalSym)).toBe('test');
		});

		it('should deserialize legacy undefined to undefined via sentinel', () => {
			const sentinel = () => undefined;
			const val = objectify('{"$Undefined":"void"}', sentinel);
			expect(val).toBeUndefined();
		});
	});

	describe('cloneify', () => {
		it('should deep clone a rich object', () => {
			const original = {
				map: new Map([['a', 1]]),
				set: new Set([1n, 2n]),
				date: new Date('2024-01-01'),
				big: 999n,
				sym: Symbol.for('test'),
				undef: undefined
			};

			const cloned = cloneify(original, () => undefined);

			expect(cloned).not.toBe(original);
			expect(cloned.map).toBeInstanceOf(Map);
			expect(cloned.map).not.toBe(original.map);
			expect(cloned.map.get('a')).toBe(1);

			expect(cloned.set).toBeInstanceOf(Set);
			expect(cloned.set).not.toBe(original.set);
			expect(cloned.set.has(1n)).toBe(true);

			expect(cloned.date).toBeInstanceOf(Date);
			expect(cloned.date).not.toBe(original.date);
			expect(cloned.date.getTime()).toBe(original.date.getTime());

			expect(cloned.big).toBe(999n);
			expect(Symbol.keyFor(cloned.sym)).toBe('test');
			expect(cloned.undef).toBeUndefined();
		});

		it('should clone global symbols with equal identity', () => {
			const sym1 = Symbol.for('global');
			const winter = { [sym1]: { Winter: { day: 1, month: 12 } } };

			expect(objectify(stringify(sym1))).toEqual(sym1);
			expect(cloneify(winter)).toEqual(winter);
		});

		it('should produce distinct non-equal identities when cloning local symbols', () => {
			const sym2 = Symbol('local');
			const summer = { [sym2]: { Summer: { day: 1, month: 6 } } };

			expect(cloneify(sym2)).not.toEqual(sym2);
			expect(cloneify(summer)).not.toEqual(summer);
		});
	});

	describe('registerSerializable', () => {
		it('should reject conflicting registrations from distinct constructors with identical names/tags and resolve intended constructor via objectify', async () => {
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

	describe('objectify security mitigations', () => {
		it('should block prototype pollution attempts via __proto__, constructor, and prototype', () => {
			const json = '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"valid":"ok"}';
			const res = objectify<any>(json);

			expect((({} as any)).polluted).toBeUndefined();
			expect(res.valid).toBe('ok');
			expect(Object.prototype.hasOwnProperty.call(res, '__proto__')).toBe(false);
			expect(Object.prototype.hasOwnProperty.call(res, 'constructor')).toBe(false);
		});

		it('should prevent deep recursion stack overflow using maxDepth', () => {
			let deep = '{"$BigInt":123}';
			for (let i = 0; i < 25; i++) {
				deep = `{"nested":${deep}}`;
			}

			// Should not throw RangeError: Maximum call stack size exceeded
			const res = objectify<any>(deep, { maxDepth: 20 });
			expect(res).toBeDefined();
			expect(res.nested).toBeDefined();

			// Navigate to depth 20: traversed and defined
			let cursor = res;
			for (let i = 0; i < 20; i++) {
				cursor = cursor.nested;
			}
			expect(cursor).toBeDefined();

			// Beyond depth 20 (depth 21+), traversal was halted: innermost $BigInt was not transformed
			let deepCursor = cursor;
			while (deepCursor?.nested) {
				deepCursor = deepCursor.nested;
			}
			expect(deepCursor).toEqual({ $BigInt: 123 });
			expect(typeof deepCursor).not.toBe('bigint');

			// With sufficient maxDepth, traversal reaches the innermost node and transforms it
			const full = objectify<any>(deep, { maxDepth: 30 });
			let fullCursor = full;
			while (fullCursor?.nested) {
				fullCursor = fullCursor.nested;
			}
			expect(fullCursor).toBe(123n);
		});

		it('should respect allowClasses: false and prevent class instantiation', () => {
			class SafeWidget {
				constructor(public data: { v: number }) {}
			}
			registerSerializable('SafeWidget', SafeWidget);

			const json = '{"$SafeWidget":{"v":42}}';

			// With allowClasses: false, returns raw JSON object without instantiating SafeWidget
			const raw = objectify<any>(json, { allowClasses: false });
			expect(raw).not.toBeInstanceOf(SafeWidget);
			expect(raw).toEqual({ $SafeWidget: { v: 42 } });

			// Default behavior still instantiates
			const instantiated = objectify<any>(json);
			expect(instantiated).toBeInstanceOf(SafeWidget);
			expect(instantiated.data.v).toBe(42);
		});

		it('should restrict instantiation using allowedClasses allowlist', () => {
			class AllowedCls {
				constructor(public data: any) {}
			}
			class BlockedCls {
				constructor(public data: any) {}
			}
			registerSerializable('AllowedCls', AllowedCls);
			registerSerializable('BlockedCls', BlockedCls);

			const allowedJson = '{"$AllowedCls":{"a":1}}';
			const blockedJson = '{"$BlockedCls":{"b":2}}';

			const resAllowed = objectify<any>(allowedJson, { allowedClasses: ['AllowedCls'] });
			const resBlocked = objectify<any>(blockedJson, { allowedClasses: ['AllowedCls'] });

			expect(resAllowed).toBeInstanceOf(AllowedCls);
			expect(resBlocked).not.toBeInstanceOf(BlockedCls);
			expect(resBlocked).toEqual({ $BlockedCls: { b: 2 } });
		});

		it('should respect allowRegExp: false and oversized regex pattern limits', () => {
			const validRegexJson = '{"$RegExp":{"source":"^test$","flags":"i"}}';
			const resNormal = objectify<any>(validRegexJson);
			expect(resNormal).toBeInstanceOf(RegExp);
			expect(resNormal.test('TEST')).toBe(true);

			// allowRegExp: false skips RegExp reconstruction
			const resDisabled = objectify<any>(validRegexJson, { allowRegExp: false });
			expect(resDisabled).not.toBeInstanceOf(RegExp);
			expect(resDisabled).toEqual({ $RegExp: { source: '^test$', flags: 'i' } });

			// Oversized RegExp source skips instantiation
			const hugePattern = 'a'.repeat(600);
			const hugeRegexJson = `{"$RegExp":{"source":"${hugePattern}","flags":"g"}}`;
			const resHuge = objectify<any>(hugeRegexJson);
			expect(resHuge).not.toBeInstanceOf(RegExp);
		});

		it('should sign output with stringify({ signed: true, secret }) and verify in objectify', () => {
			const secret = 'test-secret';
			const data = { count: 123n, active: true };
			const signedStr = stringify(data, { signed: true, secret });

			expect(signedStr.startsWith('$sig:')).toBe(true);

			// Automatically verifies and unpacks
			const unpacked = objectify<any>(signedStr, { secret });
			expect(unpacked.count).toBe(123n);
			expect(unpacked.active).toBe(true);
		});

		it('should throw TypeError when signed: true but secret is omitted', () => {
			expect(() => stringify({ a: 1 }, { signed: true })).toThrow(TypeError);
			expect(() => stringify({ a: 1 }, { signed: true, secret: '' })).toThrow(TypeError);
		});

		it('should reject unsigned strings when requireSigned: true', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const plainStr = stringify({ safe: true });
				expect(plainStr.startsWith('$sig:')).toBe(false);

				// Rejects unsigned string and returns it raw without parsing
				const rejected = objectify<any>(plainStr, { requireSigned: true });
				expect(rejected).toBe(plainStr);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should reject tampered signed payloads', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const secret = 'test-secret';
				const data = { role: 'user' };
				const signedStr = stringify(data, { signed: true, secret });

				// Tamper payload
				const tampered = signedStr.replace('user', 'admin');
				const rejected = objectify<any>(tampered, { secret });
				expect(rejected).toBe(tampered);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should throw when throwOnError: true on verification failure or unsigned input', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const secret = 'test-secret';
				const signedStr = stringify({ role: 'user' }, { signed: true, secret });
				const tampered = signedStr.replace('user', 'admin');

				expect(() => objectify(tampered, { secret, throwOnError: true })).toThrow(/signature verification failed/);
				expect(() => objectify(signedStr, { throwOnError: true })).toThrow(/requires an explicit secret/);
				expect(() => objectify('{"plain":true}', { requireSigned: true, throwOnError: true })).toThrow(/rejected by requireSigned/);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should support custom secret for signed stringify and verified objectify', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const secret = 'custom-test-secret';
				const data = { key: 'val' };
				const signedStr = stringify(data, { signed: true, secret });

				// Succeeds with matching secret
				const verified = objectify<any>(signedStr, { secret });
				expect(verified.key).toBe('val');

				// Rejects with wrong secret
				const wrongSecret = objectify<any>(signedStr, { secret: 'wrong-secret' });
				expect(wrongSecret).toBe(signedStr);
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should retain verified state during quoted retry when requireSigned: true', () => {
			const secret = 'test-secret';
			const unquoted = 'hello world';
			const signed = `$sig:${fastDigest(unquoted, secret)}:${unquoted}`;
			const res = objectify<string>(signed, { requireSigned: true, secret });
			expect(res).toBe('hello world');
		});

		it('should round-trip strings with leading ~ across compact and non-compact modes', () => {
			const str1 = '~hello';
			const str2 = '~n1';
			const str3 = '~~double';

			expect(objectify(stringify(str1, { compact: false }))).toBe(str1);
			expect(objectify(stringify(str2, { compact: false }))).toBe(str2);
			expect(objectify(stringify(str3, { compact: false }))).toBe(str3);

			expect(objectify(stringify(str1, { compact: true }))).toBe(str1);
			expect(objectify(stringify(str2, { compact: true }))).toBe(str2);
			expect(objectify(stringify(str3, { compact: true }))).toBe(str3);
		});

		it('should safely guard against malformed compact tags without throwing exceptions', () => {
			expect(objectify('"~ninvalid"')).toBe('~ninvalid');
			expect(objectify('"~tinvalid-date"')).toBe('~tinvalid-date');
		});

		it('should serialize and deserialize host or class objects with prototype getters cleanly', () => {
			class MockCoordinates {
				get latitude() { return -28.807; }
				get longitude() { return 153.302; }
				get altitude() { return null; }
				get accuracy() { return 20; }
				get altitudeAccuracy() { return null; }
				get heading() { return null; }
				get speed() { return null; }
				get [Symbol.toStringTag]() { return 'GeolocationCoordinates'; }
			}

			class MockPosition {
				get coords() { return new MockCoordinates() as any; }
				get timestamp() { return 1773651260108; }
				get [Symbol.toStringTag]() { return 'GeolocationPosition'; }
			}

			const pos = new MockPosition();
			const json = stringify(pos);
			const restored = objectify<any>(json);

			expect(restored.coords.latitude).toBe(-28.807);
			expect(restored.coords.longitude).toBe(153.302);
			expect(restored.timestamp).toBe(1773651260108);
		});
	});

});