import { Tempo } from '@magmacomputing/tempo';
import { FinanceNamespace } from '../src/index.js';

describe('Finance Namespace', () => {
	it('should lazy load the finance properties', () => {
		Tempo.extend(FinanceNamespace);

		const t1 = new Tempo('2024-02-15');
		expect(t1.finance.fiscalQuarter).toBe(1);
		expect(t1.finance.taxYear).toBe(2024);

		const t2 = new Tempo('2024-05-15');
		expect(t2.finance.fiscalQuarter).toBe(2);

		const isStart = t2.finance.isFiscalYearStart;
		expect(typeof isStart).toBe('function');
		expect(isStart()).toBe(false);

		const t3 = new Tempo('2024-01-01');
		expect(t3.finance.isFiscalYearStart()).toBe(true);
	});
});
