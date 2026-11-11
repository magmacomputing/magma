import { Tempo, TermHook } from '@magmacomputing/tempo';
import { CelestialPlugin, AstroTerm } from '../src/index.js';

describe('Celestial Plugin - Astro Term (Astronomical Seasons & Events)', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(CelestialPlugin);
	});

	it('should register "astro" and "astronomy" terms via CelestialPlugin', () => {
		const tempo = new Tempo('2026-06-21T12:00:00Z', { sphere: 'north' });
		expect(tempo.term.astro).toBeDefined();
		expect(tempo.term.astronomy).toBeDefined();
	});

	it('should calculate Northern Hemisphere astronomical seasons correctly', () => {
		const spring = new Tempo('2026-04-15T12:00:00Z', { sphere: 'north' });
		expect(spring.term.astro).toBe('Vernal');
		expect(spring.term.astronomy.season).toBe('Spring');
		expect(spring.term.astronomy.event).toBe('Equinox');

		const summer = new Tempo('2026-07-15T12:00:00Z', { sphere: 'north' });
		expect(summer.term.astro).toBe('Summer');
		expect(summer.term.astronomy.season).toBe('Summer');
		expect(summer.term.astronomy.event).toBe('Solstice');

		const autumn = new Tempo('2026-10-15T12:00:00Z', { sphere: 'north' });
		expect(autumn.term.astro).toBe('Autumnal');
		expect(autumn.term.astronomy.season).toBe('Autumn');
		expect(autumn.term.astronomy.event).toBe('Equinox');

		const winter = new Tempo('2026-01-15T12:00:00Z', { sphere: 'north' });
		expect(winter.term.astro).toBe('Winter');
		expect(winter.term.astronomy.season).toBe('Winter');
		expect(winter.term.astronomy.event).toBe('Solstice');
	});

	it('should invert seasonal names for Southern Hemisphere', () => {
		const springSouth = new Tempo('2026-10-15T12:00:00Z', { sphere: 'south' });
		expect(springSouth.term.astro).toBe('Vernal');
		expect(springSouth.term.astronomy.season).toBe('Spring');
	});

	it('should preserve the exact sub-day astronomical event instant in span boundaries', () => {
		// 2026-06-21T23:00:00Z is on the June solstice date after the solstice instant (~08:24Z)
		const onSolsticeDate = new Tempo('2026-06-21T23:00:00Z', { sphere: 'north' });
		const start = onSolsticeDate.term.astronomy.span.start;

		expect(onSolsticeDate.term.astronomy.key).toBe('Summer');
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-21');
		// Should match the exact astronomical instant rather than falling back to 00:00:00.000
		expect(start.hh * 3600 + start.mi * 60 + start.ss).toBeGreaterThan(0);

		const boundStart = AstroTerm[TermHook.bound]('start', 'astro', onSolsticeDate);
		expect(boundStart.epoch.ns).toBe(start.epoch.ns);

		// Span elapsed and progress should be measured from the actual date (23:00Z), not boundaryAnchor (start + 1min)
		expect(onSolsticeDate.term.astronomy.span.elapsed.hours).toBeGreaterThanOrEqual(14);
		expect(onSolsticeDate.term.astronomy.span.progress).toBeGreaterThan(0.005);
	});

	it('should allow standalone use of AstroTerm', () => {
		Tempo.init();
		Tempo.use(AstroTerm);
		const tempo = new Tempo('2026-06-21T12:00:00Z', { sphere: 'north' });
		expect(tempo.term.astro).toBe('Summer');
		expect(tempo.term.equinox).toBeDefined();
		expect(tempo.term.solstice).toBe('Summer');
	});

	it('exposes frozen keys array on AstroTerm and scope astronomy', () => {
		const tempo = new Tempo('2026-06-21T12:00:00Z', { sphere: 'north' });
		expect(Array.isArray(tempo.term.astronomy.keys)).toBe(true);
		expect(tempo.term.astronomy.keys).toBe(AstroTerm.keys);
		expect(Object.isFrozen(tempo.term.astronomy.keys)).toBe(true);
		expect(tempo.term.astronomy.keys).toEqual(['Vernal', 'Summer', 'Autumnal', 'Winter']);
	});

	it('refuses to guess hemisphere for undefined, equator, or non-polar sphere', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const tEquator = new Tempo('2026-06-21T12:00:00Z', { sphere: 'equator' });
			expect(tEquator.term.astro).toBeUndefined();
			expect(tEquator.term.astronomy).toBeUndefined();

			const tEast = new Tempo('2026-06-21T12:00:00Z', { sphere: 'east' });
			expect(tEast.term.astro).toBeUndefined();
			expect(tEast.term.astronomy).toBeUndefined();

			const tBoth = new Tempo('2026-06-21T12:00:00Z', { sphere: 'north-south' });
			expect(tBoth.term.astro).toBeUndefined();
			expect(tBoth.term.astronomy).toBeUndefined();

			// [TermHook.parse] refusing to guess without explicit north/south
			expect(AstroTerm[TermHook.parse]('#equinox.vernal', { anchor: tEquator })).toBeUndefined();
			expect(AstroTerm[TermHook.parse]('#solstice.summer', { anchor: tEast })).toBeUndefined();
			expect(AstroTerm[TermHook.parse]('#solstice.summer', { anchor: tBoth })).toBeUndefined();

			// Ambient non-polar configuration
			Tempo.init({ sphere: 'equator' });
			const tAmbient = new Tempo('2026-06-21T12:00:00Z');
			expect(tAmbient.term.astro).toBeUndefined();
			expect(AstroTerm[TermHook.parse]('#equinox.vernal')).toBeUndefined();
		} finally {
			warnSpy.mockRestore();
		}
	});

	it('should accept a Tempo instance as anchor in AstroTerm.define without throwing', () => {
		const base = new Tempo('2026-01-01T00:00:00Z', { sphere: 'north' });
		const anchor = new Tempo('2026-06-21T23:00:00Z', { sphere: 'north' });
		const res = AstroTerm.define!.call(base, false, anchor) as any;
		expect(res).toBeDefined();
		expect(res.key).toBe('Summer');
		expect(res.span).toBeDefined();
	});

	it('should accept numeric epoch and Date anchors in AstroTerm.define without throwing', () => {
		const base = new Tempo('2026-01-01T00:00:00Z', { sphere: 'north' });

		// Date anchor for summer solstice 2026
		const dateAnchor = new Date('2026-06-21T23:00:00Z');
		const resDate = AstroTerm.define!.call(base, false, dateAnchor) as any;
		expect(resDate).toBeDefined();
		expect(resDate.key).toBe('Summer');
		expect(resDate.span).toBeDefined();

		// Numeric epoch anchor for summer solstice 2026
		const epochAnchor = dateAnchor.getTime();
		const resEpoch = AstroTerm.define!.call(base, false, epochAnchor) as any;
		expect(resEpoch).toBeDefined();
		expect(resEpoch.key).toBe('Summer');
		expect(resEpoch.span).toBeDefined();
	});

	it('should fallback to receiver when anchor is invalid under catch mode', () => {
		const base = new Tempo('2026-06-21T23:00:00Z', { sphere: 'north', catch: true });
		// An invalid Date in catch mode produces an invalid Tempo instance
		const invalidAnchor = new Tempo(new Date(NaN), { catch: true });
		const res = AstroTerm.define!.call(base, false, invalidAnchor) as any;
		expect(res).toBeDefined();
		expect(res.key).toBe('Summer');
		expect(res.span.start.format('{yyyy}')).toBe('2026');
	});
});
