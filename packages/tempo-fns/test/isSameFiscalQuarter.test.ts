import { isSameFiscalQuarter } from '../src/isSameFiscalQuarter.js';
import { Tempo } from '@magmacomputing/tempo';

describe('isSameFiscalQuarter', () => {
	beforeAll(() => {
		Tempo.init();
	});

	it('should return true for dates in the same fiscal quarter', () => {
		const t1 = new Tempo('2026-02-01');
		const t2 = new Tempo('2026-03-01');

		expect(isSameFiscalQuarter(t1, t2)).toBe(true);
	});

	it('should return false for dates in different fiscal quarters', () => {
		const t1 = new Tempo('2026-03-01');
		const t2 = new Tempo('2026-04-01');

		expect(isSameFiscalQuarter(t1, t2)).toBe(false);
	});
});
