import { describe, it, expect, beforeEach } from 'vitest';
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '../src/index.js';

describe('CelestialPlugin Lifecycle TermHooks Showcase', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(CelestialPlugin);
	});

	describe('LunarTerm Hooks', () => {
		it('should format lunar emojis, phases, and illumination via [TermHook.format]', () => {
			const t = new Tempo('2026-03-03T12:00:00Z', { sphere: 'north' });
			const formatted = t.format('Date: {yyyy}-{mm}-{dd} | Moon: {#moon.emoji} {#moon.phase} ({#moon.illumination})');
			expect(formatted).toContain('Date: 2026-03-03 | Moon:');
			expect(formatted).toMatch(/Full Moon|Waxing Gibbous/);
			expect(formatted).toMatch(/\d+%/);

			const simpleMoon = t.format('Phase: {#lunar}');
			expect(simpleMoon.length).toBeGreaterThan('Phase: '.length);
		});

		it('should snap to phase boundaries via [TermHook.bound]', () => {
			const t = new Tempo('2026-03-03T12:00:00Z', { sphere: 'north' });
			const start = t.set('#lunar.start');
			const end = t.set('#lunar.end');
			const mid = t.set('#lunar.mid');

			expect(start.epoch.ms).toBeLessThanOrEqual(t.epoch.ms);
			expect(end.epoch.ms).toBeGreaterThanOrEqual(t.epoch.ms);
			expect(mid.epoch.ms).toBeGreaterThan(start.epoch.ms);
			expect(mid.epoch.ms).toBeLessThan(end.epoch.ms);
		});

		it('should step forward and backward by synodic month via [TermHook.step]', () => {
			const t = new Tempo('2026-01-01T00:00:00Z');
			const plusOne = t.add({ '#lunar': 1 });
			const minusOne = t.sub({ '#moon': 1 });

			// ~29.53 days
			const diffPlusDays = (plusOne.epoch.ms - t.epoch.ms) / 86400000;
			const diffMinusDays = (t.epoch.ms - minusOne.epoch.ms) / 86400000;

			expect(diffPlusDays).toBeCloseTo(29.53, 0);
			expect(diffMinusDays).toBeCloseTo(29.53, 0);

			// Shorthand slick syntax
			const slickPlus = t.add('#moon');
			expect(slickPlus.epoch.ms).toBe(plusOne.epoch.ms);
		});

		it('should compute lunation count differences via [TermHook.diff]', () => {
			const t1 = new Tempo('2026-01-01T00:00:00Z');
			const t2 = t1.add({ days: 59 }); // approx 2 lunations

			const lunations = t1.until(t2, '#lunar');
			expect(lunations).toBe(2);
		});
	});

	describe('SolarTerm Hooks', () => {
		const geoLondon = { latitude: 51.5074, longitude: -0.1278 };

		it('should snap to sunrise, sunset, and solar noon via [TermHook.bound]', () => {
			const t = new Tempo('2026-06-21T10:00:00+01:00[Europe/London]', { geo: geoLondon });
			const sunrise = t.set('#solar.start');
			const sunset = t.set('#solar.end');
			const noon = t.set('#solar.mid');

			expect(sunrise.format('{hh}:{mi}')).toMatch(/04:4\d/); // London summer sunrise ~04:43 BST
			expect(sunset.format('{hh}:{mi}')).toMatch(/21:2\d/); // London summer sunset ~21:21 BST
			expect(noon.format('{hh}:{mi}')).toMatch(/13:0\d/); // London summer solar noon ~13:02 BST
		});

		it('should parse solar event strings via [TermHook.parse]', () => {
			const anchor = new Tempo('2026-06-21T12:00:00+01:00[Europe/London]', { geo: geoLondon });
			const noon = Tempo.from('#solar.noon', { anchor });

			expect(noon.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-21');
			expect(noon.format('{hh}:{mi}')).toMatch(/13:0\d/);

			const sunset = Tempo.from('#sun.sunset', { anchor });
			expect(sunset.format('{hh}:{mi}')).toMatch(/21:2\d/);
		});

		it('should format solar state and angles via [TermHook.format]', () => {
			const t = new Tempo('2026-06-21T12:00:00+01:00[Europe/London]', { geo: geoLondon });
			const str = t.format('Status: {#solar.phase} | Elevation: {#solar.elevation}');
			expect(str).toContain('Status: Daylight');
			expect(str).toMatch(/Elevation: \d+/);
		});
	});

	describe('TidalTerm Hooks', () => {
		it('should step by 745-minute tidal cycles via [TermHook.step]', () => {
			const t = new Tempo('2026-04-01T00:00:00Z');
			const nextTide = t.add({ '#tide': 1 });
			const prevTide = t.sub({ '#tides': 2 });

			expect((nextTide.epoch.ms - t.epoch.ms) / 60000).toBe(745);
			expect((t.epoch.ms - prevTide.epoch.ms) / 60000).toBe(1490);

			// Shorthand slick syntax
			const slickTide = t.add('#tide');
			expect(slickTide.epoch.ms).toBe(nextTide.epoch.ms);
		});

		it('should compute tidal cycle counts via [TermHook.diff]', () => {
			const t1 = new Tempo('2026-04-01T00:00:00Z');
			const t2 = t1.add({ minutes: 745 * 4 });

			const tides = t1.until(t2, '#tide');
			expect(tides).toBe(4);
		});

		it('should format tidal state and alignment via [TermHook.format]', () => {
			const t = new Tempo('2026-04-01T00:00:00Z');
			const str = t.format('Tide: {#tide.state} ({#tide.alignment})');
			expect(str).toMatch(/Tide: (spring|neap|high|low|ebb|flood)/);
			expect(str).toMatch(/\d+°/);
		});
	});

	describe('AstroTerm Hooks', () => {
		it('should resolve natural ordinals via [TermHook.ordinal]', () => {
			const anchor = new Tempo('2026-01-01T00:00:00Z', { sphere: 'north' });

			// 1st equinox of 2026 -> Vernal Equinox (March ~20)
			const eq1 = Tempo.from('1st day of #equinox', { anchor });
			expect(eq1.format('{yyyy}-{mm}')).toBe('2026-03');

			// 2nd equinox of 2026 -> Autumnal Equinox (September ~22-23)
			const eq2 = Tempo.from('second day of #equinox', { anchor });
			expect(eq2.format('{yyyy}-{mm}')).toBe('2026-09');

			// 1st solstice of 2026 -> Summer Solstice (June ~21)
			const sol1 = Tempo.from('1st day of #solstice', { anchor });
			expect(sol1.format('{yyyy}-{mm}')).toBe('2026-06');

			// 2nd solstice of 2026 -> Winter Solstice (December ~21)
			const sol2 = Tempo.from('second day of #solstice', { anchor });
			expect(sol2.format('{yyyy}-{mm}')).toBe('2026-12');

			// last equinox of 2026 -> Autumnal Equinox (September ~22-23)
			const eqLast = Tempo.from('last day of #equinox', { anchor });
			expect(eqLast.format('{yyyy}-{mm}')).toBe('2026-09');

			// penultimate equinox of 2026 -> Vernal Equinox (March ~20) via negative instance-local ordinal
			const eqPenultimate = Tempo.from('penultimate day of #equinox', {
				anchor,
				registry: { ordinals: { penultimate: -2 } }
			});
			expect(eqPenultimate.format('{yyyy}-{mm}')).toBe('2026-03');
		});

		it('should parse explicit astronomical quarter strings via [TermHook.parse]', () => {
			const anchor = new Tempo('2026-01-01T00:00:00Z', { sphere: 'north' });

			const vernal = Tempo.from('#equinox.vernal', { anchor });
			expect(vernal.format('{yyyy}-{mm}')).toBe('2026-03');

			const summer = Tempo.from('#solstice.summer', { anchor });
			expect(summer.format('{yyyy}-{mm}')).toBe('2026-06');
		});

		it('should snap to astronomical season boundaries via [TermHook.bound]', () => {
			const t = new Tempo('2026-05-01T00:00:00Z', { sphere: 'north' });
			const start = t.set('#astro.start');
			const end = t.set('#astro.end');

			expect(start.format('{yyyy}-{mm}')).toBe('2026-03');
			expect(end.format('{yyyy}-{mm}')).toBe('2026-06');
		});

		it('should format astronomical event and season names via [TermHook.format]', () => {
			const t = new Tempo('2026-05-01T00:00:00Z', { sphere: 'north' });
			const str = t.format('Astronomical Season: {#astro.season} ({#astro})');
			expect(str).toContain('Astronomical Season: Spring');
			expect(str).toContain('Equinox');
		});
	});
});
