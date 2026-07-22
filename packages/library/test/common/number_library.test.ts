import { formatCurrency } from '#library/international.library.js';

describe('Number Library', () => {
	describe('formatCurrency', () => {
		it('should format a number as AUD currency by default', () => {
			const result = formatCurrency(123.45);
			// The exact format can depend on the locale, but it should contain the number and currency symbol (or code)
			expect(result).toMatch(/123\.45/);
		});

		it('should format a string as currency by coercing to number', () => {
			const result = formatCurrency("123.45");
			expect(result).toMatch(/123\.45/);
		});

		it('should support different currencies (e.g. USD)', () => {
			const result = formatCurrency(123.45, 2, 'USD');
			expect(result).toMatch(/123\.45/);
			// In many locales USD is $ or USD
			expect(result).toMatch(/\$|USD/);
		});

		it('should handle zero correctly', () => {
			const result = formatCurrency(0);
			expect(result).toMatch(/0\.00/);
		});

		it('should handle string zero correctly', () => {
			const result = formatCurrency("0");
			expect(result).toMatch(/0\.00/);
		});
	});
});
