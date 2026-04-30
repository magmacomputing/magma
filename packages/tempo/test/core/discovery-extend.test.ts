import { Tempo } from '#tempo';

describe('Discovery in Extend', () => {
	beforeEach(() => { Tempo.init() });
	afterEach(() => { Tempo.init() });

	it('should apply monthDay discovery via extend', () => {
		Tempo.extend({
			monthDay: {
				locales: ['custom-locale']
			}
		});
		expect(Tempo.MONTH_DAY.locales).toContain('custom-locale');
	});

	it('should apply relativeTime discovery via extend', () => {
		Tempo.extend({
			relativeTime: {
				style: 'narrow'
			}
		});
		expect(Tempo.config.relativeTime.style).toBe('narrow');
	});

	it('should apply formats discovery via extend', () => {
		Tempo.extend({
			formats: {
				customFormat: '{yyyy}-{mm}'
			}
		});
		expect(Tempo.formats.customFormat).toBe('{yyyy}-{mm}');
	});
});
