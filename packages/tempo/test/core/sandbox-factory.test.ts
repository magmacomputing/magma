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

		// Prior to disposal, guard is active and matches valid input
		expect((Sandbox as any)[$guard].test('now')).toBe(true);
		expect((instance as any)[$guard].test('now')).toBe(true);

		// Prior to disposal, installed modules report true
		Sandbox.use({ name: 'ActiveModule', install: () => { } });
		expect(Sandbox.hasModule('ActiveModule')).toBe(true);
		expect(instance.hasModule('ActiveModule')).toBe(true);

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
		expect(Sandbox.hasModule('ActiveModule')).toBe(false);
		expect(instance.hasModule('ActiveModule')).toBe(false);
		expect(Sandbox.hasModule('anyModule')).toBe(false);
		expect(Sandbox.hasModule('TermsModule')).toBe(false);
		expect(instance.hasModule('anyModule')).toBe(false);
		expect(instance.hasModule('TermsModule')).toBe(false);

		// Disposed guard fallbacks return false
		expect((Sandbox as any)[$guard].test('now')).toBe(false);
		expect((instance as any)[$guard].test('now')).toBe(false);
		expect((Sandbox as any)[$guard].test('anything')).toBe(false);
		expect((instance as any)[$guard].test('anything')).toBe(false);

		// Non-sandbox classes unaffected
		expect((Tempo as any).isDisposed).toBeUndefined();
		const baseInstance = new Tempo();
		expect((baseInstance as any).isDisposed).toBeUndefined();
		expect((baseInstance as any).isSandbox).toBeUndefined();
	});

	it('should retain sandbox configuration rather than falling back to global config after disposal', () => {
		const S = Tempo.derive({ locale: 'fr-FR', timeZone: 'Africa/Cairo' });
		const beforeInst = new S('2026-01-01');
		expect(beforeInst.locale).toBe('fr-FR');
		expect(beforeInst.config.timeZone).toBe('Africa/Cairo');
		expect(beforeInst.zdt.timeZoneId).toBe('Africa/Cairo');
		expect(S.config.locale).toBe('fr-FR');
		expect(S.config.timeZone).toBe('Africa/Cairo');

		(S as any)[Symbol.dispose]();
		expect((S as any).isDisposed).toBe(true);

		// Disposed class retains its configuration instead of falling back to global
		expect(S.config.locale).toBe('fr-FR');
		expect(S.config.timeZone).toBe('Africa/Cairo');

		// Construction after disposal retains sandbox configuration instead of falling back to global
		const afterInst = new S('2026-01-01');
		expect(afterInst.locale).toBe('fr-FR');
		expect(afterInst.config.timeZone).toBe('Africa/Cairo');
		expect(afterInst.zdt.timeZoneId).toBe('Africa/Cairo');
		expect((afterInst as any).isDisposed).toBe(true);

		// Mutation on instances retains sandbox configuration
		const mutated = beforeInst.add({ days: 1 });
		expect(mutated.locale).toBe('fr-FR');
		expect(mutated.config.timeZone).toBe('Africa/Cairo');
		expect(mutated.zdt.timeZoneId).toBe('Africa/Cairo');

		// Derived children retain parent sandbox configuration
		const child = (S as any).derive();
		const childInst = new child('2026-01-01');
		expect(childInst.locale).toBe('fr-FR');
		expect(childInst.config.timeZone).toBe('Africa/Cairo');
		expect(childInst.zdt.timeZoneId).toBe('Africa/Cairo');
	});

	it('should restore the nearest live predecessor when disposing named sandboxes out of order', () => {
		const discKey = 'shared-predecessor-test';
		const sb1 = Tempo.derive({ discovery: discKey });
		const sb2 = Tempo.derive({ discovery: discKey });
		const sb3 = Tempo.derive({ discovery: discKey });

		const globalSlot = Symbol.for(discKey);
		expect((globalThis as any)[globalSlot]?.sandbox).toBe(sb3);

		// Dispose middle sandbox sb2 first
		(sb2 as any)[Symbol.dispose]();
		// Slot should still be sb3
		expect((globalThis as any)[globalSlot]?.sandbox).toBe(sb3);

		// Now dispose sb3 (its immediate predecessor sb2 was disposed, so nearest live is sb1)
		(sb3 as any)[Symbol.dispose]();
		expect((globalThis as any)[globalSlot]?.sandbox).toBe(sb1);

		// Finally dispose sb1, slot is deleted
		(sb1 as any)[Symbol.dispose]();
		expect((globalThis as any)[globalSlot]).toBeUndefined();
	});

	it('should transfer prevVersion to surviving owner when earlier sandbox is disposed', () => {
		const pluginA = {
			name: 'TestPluginA',
			version: '1.0.0',
			install: () => { }
		};
		const pluginB = {
			name: 'TestPluginA',
			version: '2.0.0',
			install: () => { }
		};

		const sbA = Tempo.derive();
		sbA.use(pluginA);
		expect(Tempo.versions['TestPluginAPlugin']).toBe('1.0.0');

		const sbB = Tempo.derive();
		sbB.use(pluginB);
		expect(Tempo.versions['TestPluginAPlugin']).toBe('2.0.0');

		// Dispose sbA while sbB is the owner of TestPluginAPlugin
		(sbA as any)[Symbol.dispose]();
		// Version should still be 2.0.0 from sbB
		expect(Tempo.versions['TestPluginAPlugin']).toBe('2.0.0');

		// When sbB is disposed last, it restores the version prior to sbA (which was undefined/deleted)
		(sbB as any)[Symbol.dispose]();
		expect(Tempo.versions['TestPluginAPlugin']).toBeUndefined();
	});

	it('should preserve nested derive discovery slot if setup throws', () => {
		const discKey = 'failing-setup-test';
		const globalSlot = Symbol.for(discKey);
		let nestedSandbox: any;

		expect(() => {
			Tempo.derive({
				discovery: discKey,
				plugins: [
					{
						name: 'FailingPlugin',
						install: () => {
							nestedSandbox = Tempo.derive({ discovery: discKey });
							throw new Error('Boom');
						}
					}
				]
			});
		}).toThrow('Boom');

		// Slot should still belong to nestedSandbox
		expect((globalThis as any)[globalSlot]?.sandbox).toBe(nestedSandbox);
		(nestedSandbox as any)[Symbol.dispose]();
	});

	it('should ensure instanceof checks differentiate between distinct sandbox classes', () => {
		const SandboxA = Tempo.derive({ locale: 'en-US' });
		const SandboxB = Tempo.derive({ locale: 'ja-JP' });

		const instanceA = new SandboxA('2026-01-01');
		const instanceB = new SandboxB('2026-01-01');

		// Shared brand check is true for all sandboxes
		expect(isSandbox(instanceA)).toBe(true);
		expect(isSandbox(instanceB)).toBe(true);
		expect(Tempo.isSandbox(instanceA)).toBe(true);
		expect(Tempo.isSandbox(instanceB)).toBe(true);

		// Instanceof reflects actual prototype membership
		expect(instanceA instanceof SandboxA).toBe(true);
		expect(instanceB instanceof SandboxB).toBe(true);
		expect(instanceA instanceof SandboxB).toBe(false);
		expect(instanceB instanceof SandboxA).toBe(false);
		expect(instanceA instanceof Tempo).toBe(true);
		expect(instanceB instanceof Tempo).toBe(true);
	});

	it('should invalidate cached config snapshot when lazy instance resolves', () => {
		const t = new Tempo('2026-05-15', { mode: 'defer', locale: 'en-US' });
		// Access config before resolution
		const preConfig = t.config;
		expect(preConfig.locale).toBe('en-US');

		// Modify catch mode
		t.setCatchMode(true);
		expect(t.config.catch).toBe(true);

		// Resolve by accessing toDateTime
		const dt = t.toDateTime();
		expect(dt).toBeDefined();

		// Post-resolution config remains consistent
		expect(t.config.catch).toBe(true);
	});

	it('should roll back recorded versions if plugin setup fails', () => {
		const plugin1 = {
			name: 'RollbackPlugin',
			version: '3.0.0',
			install: () => { }
		};
		const failingPlugin = {
			name: 'FailingInstallPlugin',
			install: () => {
				throw new Error('Install failed');
			}
		};

		expect(() => {
			Tempo.derive({
				plugins: [plugin1, failingPlugin]
			});
		}).toThrow('Install failed');

		// Version from plugin1 should have been rolled back
		expect(Tempo.versions['RollbackPluginPlugin']).toBeUndefined();
	});

	it('should hand version back to live predecessor across multi-sandbox lifecycles', () => {
		const S_A = Tempo.derive({});
		const S_B = Tempo.derive({});
		const S_C = Tempo.derive({});

		S_A.use({ name: 'Chained', version: '1.0.0', install: () => { } });
		expect(Tempo.versions['ChainedPlugin']).toBe('1.0.0');

		S_B.use({ name: 'Chained', version: '2.0.0', install: () => { } });
		expect(Tempo.versions['ChainedPlugin']).toBe('2.0.0');

		S_C.use({ name: 'Chained', version: '3.0.0', install: () => { } });
		expect(Tempo.versions['ChainedPlugin']).toBe('3.0.0');

		// Disposing non-owner A transfers predecessor info to B
		S_A[Symbol.dispose]();
		expect(Tempo.versions['ChainedPlugin']).toBe('3.0.0');

		// Disposing owner C restores B's live version 2.0.0
		S_C[Symbol.dispose]();
		expect(Tempo.versions['ChainedPlugin']).toBe('2.0.0');

		// Disposing B leaves no live sandbox, removing the version
		S_B[Symbol.dispose]();
		expect(Tempo.versions['ChainedPlugin']).toBeUndefined();
	});

	it('preserves predecessor owner on failed same-name install so version cleans up on disposal', () => {
		const S_A = Tempo.derive({});
		S_A.use({ name: 'Preserved', version: '1.0.0', install: () => { } });
		expect(Tempo.versions['PreservedPlugin']).toBe('1.0.0');

		const S_B = Tempo.derive({});
		expect(() => {
			S_B.use({
				name: 'Preserved',
				version: '2.0.0',
				type: 'properties',
				install: () => {
					throw new Error('install failed');
				}
			});
		}).toThrow('install failed');

		// Version restored to 1.0.0 and owned by S_A
		expect(Tempo.versions['PreservedPlugin']).toBe('1.0.0');

		// Disposing S_A cleanly removes the version
		S_A[Symbol.dispose]();
		expect(Tempo.versions['PreservedPlugin']).toBeUndefined();
		S_B[Symbol.dispose]();
	});

	it('allows child sandboxes to use modules and install plugins after parent disposal', () => {
		const parent = Tempo.derive({});
		parent.use({ name: 'SharedMod', install: () => { } });

		const child = (parent as any).derive({});

		expect(child.hasModule('SharedMod')).toBe(true);
		expect(new child('2026-01-01').hasModule('SharedMod')).toBe(true);

		(parent as any)[Symbol.dispose]();
		expect((parent as any).isDisposed).toBe(true);
		expect((child as any).isDisposed).toBe(false);

		// Child static and instance hasModule still report true for usable modules
		expect(child.hasModule('SharedMod')).toBe(true);
		expect(new child('2026-01-01').hasModule('SharedMod')).toBe(true);

		// Child can use plugins after parent disposal
		let installedOnChild = false;
		child.use({
			name: 'ChildOnlyPlugin',
			version: '1.0.0',
			install: () => { installedOnChild = true; }
		});
		expect(installedOnChild).toBe(true);
		(child as any)[Symbol.dispose]();
	});

	it('preserves writtenVersions across failed install in the same sandbox', () => {
		const sb = Tempo.derive({});
		sb.use({
			name: 'MultiInstallPlugin',
			version: '1.0.0',
			install: () => { }
		});
		expect(Tempo.versions['MultiInstallPlugin']).toBe('1.0.0');

		expect(() => {
			sb.use({
				name: 'MultiInstall',
				version: '2.0.0',
				type: 'properties',
				install: () => {
					throw new Error('second install failed');
				}
			});
		}).toThrow('second install failed');

		// Still 1.0.0
		expect(Tempo.versions['MultiInstallPlugin']).toBe('1.0.0');

		// On sandbox disposal, 1.0.0 is cleanly cleaned up
		(sb as any)[Symbol.dispose]();
		expect(Tempo.versions['MultiInstallPlugin']).toBeUndefined();
	});
});


