import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Error Handling stabilization', () => {
	it('should throw an error for invalid ticker interval by default', () => {
		Tempo.init({ catch: false });
		
		expect(() => Tempo.ticker('invalid')).toThrow();
		expect(console.error).toHaveBeenCalled();
	});

	it('should log an error and fallback to 1s when catch: true', () => {
		Tempo.init({ catch: true });

		let t: any;
		expect(() => {
			t = Tempo.ticker('invalid');
		}).not.toThrow();

		expect(console.error).toHaveBeenCalled();
		expect(t).toBeDefined();

		t?.[Symbol.dispose]();
		Tempo.init({ catch: false }); // Reset
	});
});
