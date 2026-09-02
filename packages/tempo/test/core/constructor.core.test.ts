import { Tempo } from '#tempo/core';
import { FormatModule } from '#tempo/format';
import '#tempo/parse';

Tempo.extend(FormatModule);

describe('Tempo Core', () => {
	beforeEach(() => {
		Tempo.init()
	})

	describe('Constructor Modes', () => {

		describe("mode: 'auto' (Default)", () => {
			it('should auto-switch to lazy mode if input passes Master Guard', () => {
				const t = new Tempo('2024-01-01');
				expect(t.parse.mode).toBe(Tempo.MODE.Auto);
				expect(t.parse.lazy).toBe(true);
				expect(t.yy).toBe(2024);
				expect(t.yw).toBe(2024);
			});

			it('should fail-fast (strict) if input fails Master Guard', () => {
				// 'Hello World' fails the guard, so it attempts immediate parsing and throws
				expect(() => new Tempo('Hello World')).toThrow(/invalid ISO 8601 string/);
			});
		});

		describe("mode: 'strict'", () => {
			it('should throw immediately on invalid TimeZone', () => {
				// Even with a valid-looking date, 'strict' forces immediate validation of all options
				expect(() => new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone' })).toThrow(/Tempo: Unrecognized time zone Invalid\/Zone/);
			});
		});

		describe("Global strategy overrides", () => {
			it("should throw on invalid input when global mode is 'strict'", () => {
				Tempo.init({ mode: Tempo.MODE.Strict });
				expect(() => new Tempo('Invalid Date')).toThrow();
			});
		});

		describe("mode: 'defer'", () => {
			it('should NOT throw immediately on invalid TimeZone', () => {
				// 'defer' ignores the guard and skips all validation in the constructor
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone' });
				expect(t).toBeInstanceOf(Tempo);

				// Throws only on access
				expect(() => t.parse).toThrow();
				expect(() => t.yy).toThrow();
			});

			it('should allow introspection of lazy state with valid configuration', () => {
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer });
				expect(t.parse.lazy).toBe(true);
			});
		});

		describe("catch: true (Advanced Error Handling)", () => {
			it('should suppress immediate throws in strict mode', () => {
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid).toBe(false);
				expect(t.format('{yyyy}')).toBe('');
			});

			it('should suppress deferred throws in defer mode', () => {
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid).toBe(false);										// Validates on call
				expect(t.format('{yyyy}')).toBe('');
			});
		});
		describe("latitude sphere inference", () => {
			it('infers sphere as south when latitude is negative', () => {
				const t = new Tempo('2026-09-02', { latitude: -33.8688 });
				expect(t.sphere).toBe('south');
			});

			it('infers sphere as north when latitude is positive', () => {
				const t = new Tempo('2026-09-02', { lat: 40.7128 });
				expect(t.sphere).toBe('north');
			});

			it('allows explicit sphere to override latitude inference', () => {
				const t = new Tempo('2026-09-02', { latitude: -33.8688, sphere: 'north' });
				expect(t.sphere).toBe('north');
			});

			it('infers sphere from global Tempo.init config', () => {
				Tempo.init({ latitude: -33.8688 });
				const t = new Tempo('2026-09-02');
				expect(t.sphere).toBe('south');
			});

			it('infers sphere from sandbox Tempo.create config', () => {
				const CustomTempo = Tempo.create({ latitude: -33.8688 });
				const t = new CustomTempo('2026-09-02');
				expect(t.sphere).toBe('south');
			});
		});
	});
});
