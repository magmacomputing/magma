import { Tempo } from '#tempo';

describe('Sandbox Factory Pattern', () => {
	it('should return a subclass when create is called with options', () => {
		const Sandbox = Tempo.create({ locale: 'en-GB' });
		expect(Sandbox).not.toBe(Tempo);
		expect(Object.getPrototypeOf(Sandbox)).toBe(Tempo);
		expect(Sandbox.name).toBe('SandboxTempo');
	});

	it('should maintain isolated registries for sandboxes', () => {
		const MyTempo = Tempo.create({
			period: {
				'tea-time': '16:00'
			}
		});

		// The base Tempo should not have 'tea-time'
		expect(() => new Tempo('tea-time')).toThrow();

		const t = new MyTempo('tea-time');
		expect(t.hh).toBe(16);
		expect(t.mi).toBe(0);
	});

	it('should support shadowing global aliases', () => {
		// // Clear previous calls to ensure assertions are local to this test
		// (console.warn as any).mockClear();
		// (console.error as any).mockClear();

		// Global 'noon' is 12:00
		const EarlyNoon = Tempo.create({
			period: {
				'noon': '11:00'
			}
		});

		// Original remains unaffected (if not manually reset in a way that changes it)
		// We expect 12:00 for the base Tempo
		const t1 = new Tempo('noon');
		expect(t1.hh).toBe(12);

		const t2 = new EarlyNoon('noon');
		expect(t2.hh).toBe(11);

		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Potential period alias collision: "noon" overlaps with existing alias(es): after[ -]?noon')
		);
		expect(console.error).not.toHaveBeenCalled();
	});

	it('should record traceability info in parse results', () => {
		const MyTempo = Tempo.create({
			period: {
				'half-hour': function (this: Tempo) { return `${this.hh}:30` }
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
		const MyTempo = Tempo.create({
			period: {
				'break': '10:00'
			}
		});

		// Sandwich break at 11:00 for this specific instance
		const t = new MyTempo('break', {
			period: {
				'break': '11:00'
			}
		});

		expect(t.hh).toBe(11);

		const match = t.parse.result.find(r => r.type === 'Period' && r.value === 'break');
		expect(match?.source).toBe('local');
	});

	it('should guarantee immutability of the Sandbox class', () => {
		const Sandbox = Tempo.create({ locale: 'fr-FR' });

		// Attempting to modify static property should fail (if @Immutable is working)
		try {
			(Sandbox as any).someNewProp = 'test';
		} catch (e) { }

		expect((Sandbox as any).someNewProp).toBeUndefined();
	});

	it('should share terms across sandboxes by default', () => {
		// Terms are currently stored in the singleton Runtime pluginsDb
		// This is expected behavior as plugins are "library level" extensions
		const Sandbox1 = Tempo.create({});
		const Sandbox2 = Tempo.create({});

		expect(Sandbox1.terms).toEqual(Sandbox2.terms);
	});
});
