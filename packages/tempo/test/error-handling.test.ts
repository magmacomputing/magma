import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Error Handling stabilization', () => {
	afterEach(() => vi.restoreAllMocks())

	it('should throw an error for invalid ticker interval by default', () => {
		Tempo.init({ catch: false });
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

		expect(() => Tempo.ticker('invalid')).toThrow();
		expect(errorSpy).toHaveBeenCalled();
	});

	it('should log an error and fallback to 1s when catch: true', () => {
		Tempo.init({ catch: true });
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

		let t: any;
		expect(() => {
			t = Tempo.ticker('invalid');
		}).not.toThrow();

		expect(errorSpy).toHaveBeenCalled();
		expect(t).toBeDefined();

		t?.[Symbol.dispose]();
		Tempo.init({ catch: false }); // Reset
	});
});
