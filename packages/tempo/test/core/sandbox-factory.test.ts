import { Tempo, isSandbox, isTempo } from '#tempo';
import { $guard } from '#tempo/support';
import type { AliasContext } from '#tempo/tempo.type.js';
import { spies } from '../support/setup.console-spy.js';

describe('Sandbox Factory Pattern', () => {
	it('should identify authentic Sandbox classes and instances via @Branded', () => {
		const Sandbox = Tempo.derive({ locale: 'en-GB' });
		const sInstance = new Sandbox('2026-07-01');
		const tInstance = new Tempo('2026-07-01');

		// Class-level checks
		expect(isSandbox(Sandbox)).toBe(true);
		expect((Sandbox as any).isSandbox(Sandbox)).toBe(true);
		expect(Tempo.isSandbox(Sandbox)).toBe(true);
		expect(isSandbox(Tempo)).toBe(false);
		expect(Tempo.isSandbox(Tempo)).toBe(false);

		// Instance-level checks
		expect(isSandbox(sInstance)).toBe(true);
		expect((Sandbox as any).isSandbox(sInstance)).toBe(true);
		expect(Tempo.isSandbox(sInstance)).toBe(true);
		expect((sInstance as any).isSandbox).toBe(true);
		expect(sInstance instanceof Sandbox).toBe(true);
		expect(sInstance instanceof Tempo).toBe(true);
		expect(isTempo(sInstance)).toBe(true);
		expect(Tempo.isTempo(sInstance)).toBe(true);
		expect(Object.prototype.toString.call(sInstance)).toBe('[object TempoSandbox]');

		// Base Tempo instance should NOT be recognized as sandbox
		expect(isSandbox(tInstance)).toBe(false);
		expect((Sandbox as any).isSandbox(tInstance)).toBe(false);
		expect(Tempo.isSandbox(tInstance)).toBe(false);
		expect(tInstance instanceof Sandbox).toBe(false);
		expect((tInstance as any).isSandbox).toBeUndefined();


		// Spoofed object
		const spoofed = { [Symbol.toStringTag]: 'TempoSandbox' };
		expect(isSandbox(spoofed)).toBe(false);
		expect(Tempo.isSandbox(spoofed)).toBe(false);
		expect(spoofed instanceof Sandbox).toBe(false);
	});

	it('should return a subclass when create is called with options', () => {
		const Sandbox = Tempo.derive({ locale: 'en-GB' });
		expect(Sandbox).not.toBe(Tempo);
		expect(Object.getPrototypeOf(Sandbox)).toBe(Tempo);
		expect(Sandbox.name).toBe('SandboxTempo');
	});


	it('should maintain isolated registries for sandboxes', () => {
		const MyTempo = Tempo.derive({
			registry: {
				periods: {
					'tea-time': '16:00'
				}
			}
		});

		// The base Tempo should not have 'tea-time'
		expect(() => new Tempo('tea-time')).toThrow();

		const t = new MyTempo('tea-time');
		expect(t.hh).toBe(16);
		expect(t.mi).toBe(0);
	});

	it('should support shadowing global aliases', () => {
		const warnCountBefore = spies.warn.mock.calls.length;

		// Global 'noon' is 12:00
		const EarlyNoon = Tempo.derive({
			registry: {
				periods: {
					'noon': '11:00'
				}
			}
		});

		expect(console.error).not.toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalled();
		expect(spies.warn.mock.calls.length).toBe(warnCountBefore + 1);

		// Original remains unaffected (if not manually reset in a way that changes it)
		// We expect 12:00 for the base Tempo
		const t1 = new Tempo('noon');
		expect(t1.hh).toBe(12);

		const t2 = new EarlyNoon('noon');
		expect(t2.hh).toBe(11);
	});

	it('should record traceability info in parse results', () => {
		const MyTempo = Tempo.derive({
			registry: {
				periods: {
					'half-hour': function (this: AliasContext) { return `${this.hh}:30` }
				}
			}
		});

		const t = new MyTempo('half-hour');
		const results = t.parse.result;

		// Find the Period match
		const match = results.find(r => r.type === 'Period');
		expect(match).toBeDefined();
		expect(match?.source).toBe('local'); // 'local' relative to the Sandbox
	});

	it('should allow instance-specific overrides to shadow sandbox aliases', () => {
		const MyTempo = Tempo.derive({
			registry: {
				periods: {
					'break': '10:00'
				}
			}
		});

		// Sandwich break at 11:00 for this specific instance
		const t = new MyTempo('break', {
			registry: {
				periods: {
					'break': '11:00'
				}
			}
		});

		expect(t.hh).toBe(11);

		const match = t.parse.result.find(r => r.type === 'Period' && r.value === 'break');
		expect(match?.source).toBe('local');
	});

	it('should guarantee immutability of the Sandbox class', () => {
		const Sandbox = Tempo.derive({ locale: 'fr-FR' });

		// Attempting to modify static property should fail (if @Immutable is working)
		try {
			(Sandbox as any).someNewProp = 'test';
		} catch (e) { }

		expect((Sandbox as any).someNewProp).toBeUndefined();
	});

	it('should share terms across sandboxes by default', () => {
		// Terms are currently stored in the singleton Runtime pluginsDb
		// This is expected behavior as plugins are "library level" extensions
		const Sandbox1 = Tempo.derive({});
		const Sandbox2 = Tempo.derive({});

		expect(Sandbox1.terms).toEqual(Sandbox2.terms);
	});

	it('should support full discovery payloads (formats, timeZones) in create()', () => {
		const discovery = {
			registry: {
				formats: {
					'sandboxed_fmt': '{dd}/{mm}/{yyyy}'
				}
			},
			timeZones: {
				'sandbox_tz': 'Australia/Sydney'
			}
		};
		const Sandbox = Tempo.derive({ discovery });
		
		const t = new Sandbox('2026-06-03 12:00:00', { timeZone: 'sandbox_tz' });
		expect(t.format('sandboxed_fmt')).toBe('03/06/2026');
	});

	it('should support Symbol.asyncDispose on Sandbox class', async () => {
		const Sandbox = Tempo.derive({ locale: 'de-DE' });
		expect((Sandbox as any).isDisposed).toBe(false);
		await (Sandbox as any)[Symbol.asyncDispose]();
		expect((Sandbox as any).isDisposed).toBe(true);
	});

	it('should automatically dispose after synchronous scoped callback', () => {
		let capturedSb: any;
		const result = Tempo.derive((sb) => {
			capturedSb = sb;
			expect((sb as any).isDisposed).toBe(false);
			return 42;
		});
		expect(result).toBe(42);
		expect(capturedSb.isDisposed).toBe(true);
	});

	it('should rethrow synchronous error in scoped callback and dispose', () => {
		let capturedSb: any;
		expect(() => {
			Tempo.derive((sb) => {
				capturedSb = sb;
				throw new Error('sync callback error');
			});
		}).toThrow('sync callback error');
		expect(capturedSb.isDisposed).toBe(true);
	});

	it('should defer disposal until async scoped callback promise settles', async () => {
		let capturedSb: any;
		let ranAsync = false;
		const promise = Tempo.derive(async (sb) => {
			capturedSb = sb;
			expect((sb as any).isDisposed).toBe(false);
			await new Promise(r => setTimeout(r, 10));
			expect((sb as any).isDisposed).toBe(false);
			ranAsync = true;
			return 'async-result';
		});

		// While promise is in flight, sandbox should NOT be disposed yet
		expect(capturedSb.isDisposed).toBe(false);
		const val = await promise;
		expect(val).toBe('async-result');
		expect(ranAsync).toBe(true);
		expect(capturedSb.isDisposed).toBe(true);
	});

	it('should rethrow async rejection in scoped callback and dispose', async () => {
		let capturedSb: any;
		const promise = Tempo.derive(async (sb) => {
			capturedSb = sb;
			await new Promise(r => setTimeout(r, 5));
			throw new Error('async callback error');
		});

		await expect(promise).rejects.toThrow('async callback error');
		expect(capturedSb.isDisposed).toBe(true);
	});

	it('should handle disposal state cleanly for lookups and guards without altering non-sandbox classes', () => {
		const Sandbox = Tempo.derive({ locale: 'en-US' });
		const instance = new Sandbox();

		// Brand identity and initial state
		expect(isSandbox(Sandbox)).toBe(true);
		expect(isSandbox(instance)).toBe(true);
		expect((instance as any).isSandbox).toBe(true);
		expect((Sandbox as any).isDisposed).toBe(false);
		expect((instance as any).isDisposed).toBe(false);

		// Prior to disposal, guard is active
		expect((Sandbox as any)[$guard].test('anything')).toBeDefined();
		expect((instance as any)[$guard].test('anything')).toBeDefined();

		// Dispose sandbox
		(Sandbox as any)[Symbol.dispose]();

		// Brand identity remains true (brand check is not disposal check)
		expect(isSandbox(Sandbox)).toBe(true);
		expect(isSandbox(instance)).toBe(true);
		expect((instance as any).isSandbox).toBe(true);

		// Disposal state is tracked explicitly
		expect((Sandbox as any).isDisposed).toBe(true);
		expect((instance as any).isDisposed).toBe(true);

		// Disposed plugin lookups return false
		expect(Sandbox.hasModule('anyModule')).toBe(false);
		expect(Sandbox.hasModule('TermsModule')).toBe(false);
		expect(instance.hasModule('anyModule')).toBe(false);
		expect(instance.hasModule('TermsModule')).toBe(false);

		// Disposed guard fallbacks return false
		expect((Sandbox as any)[$guard].test('anything')).toBe(false);
		expect((instance as any)[$guard].test('anything')).toBe(false);

		// Non-sandbox classes unaffected
		expect((Tempo as any).isDisposed).toBeUndefined();
		const baseInstance = new Tempo();
		expect((baseInstance as any).isDisposed).toBeUndefined();
		expect((baseInstance as any).isSandbox).toBeUndefined();
	});
});


