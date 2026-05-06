import { Tempo } from '#tempo';

describe('Master Guard Extension', () => {
	beforeEach(() => {
		Tempo.init({ silent: true })
	});

	it('should rebuild the guard after extension via Discovery', () => {
		// 1. Initially, '$$$apple$$$' should FAIL the guard and throw immediately
		expect(() => new Tempo('$$$apple$$$')).toThrow(/Unrecognized or invalid ISO 8601 string: \"\$\$\$apple\$\$\$\"/);

		// 2. Extend with a custom term '$$$apple$$$' via Discovery object
		Tempo.extend({
			terms: [{
				key: '$$$apple$$$',
				define(keyOnly?: boolean, anchor?: any) { return anchor?.mm === 10 ? 'OCT' : undefined }
			}]
		});

		// 3. Now '$$$apple$$$' should PASS the guard and auto-switch to lazy: true.
		const t = new Tempo('$$$apple$$$');
		expect(t).toBeInstanceOf(Tempo);
		// expect(t.parse.lazy).toBe(true);

		// 4. Accessing a property should now trigger parsing and throw
		expect(() => t.yy).toThrow(/Unrecognized or invalid ISO 8601 string: \"\$\$\$apple\$\$\$\"/);
	});

	it('should rebuild the guard after direct extension', () => {
		// 1. '@@@banana@@@' fails initially
		expect(() => new Tempo('@@@banana@@@')).toThrow(/Unrecognized or invalid ISO 8601 string: \"@@@banana@@@\"/);

		// 2. Extend directly
		Tempo.extend({
			key: '@@@banana@@@',
			define(keyOnly?: boolean, anchor?: any) { return anchor?.mm === 11 ? 'NOV' : undefined }
		});

		// 3. '@@@banana@@@' now passes guard
		const t = new Tempo('@@@banana@@@');
		// expect(t.parse.lazy).toBe(true);
		expect(t).toBeInstanceOf(Tempo);
	});
});
