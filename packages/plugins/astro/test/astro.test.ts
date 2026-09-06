import { Tempo } from '@magmacomputing/tempo';
import { AstroPlugin } from '../src/index.js';

describe('Astro Plugin (Astronomical Seasons & Events)', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(AstroPlugin);
	});

	it('should register "astro" and "astronomy" terms via AstroPlugin', () => {
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
});
