import { formatCurrency, getHemisphere } from '#library/international.library.js';

describe('International Library', () => {
	describe('formatCurrency', () => {
		it('should format a number as AUD currency by default in en-US', () => {
			const result = formatCurrency(123.45, 2, 'AUD', 'en-US');
			expect(result).toContain('123.45');
		});

		it('should format a string as currency by coercing to number', () => {
			const result = formatCurrency('123.45', 2, 'AUD', 'en-US');
			expect(result).toContain('123.45');
		});

		it('should support different currencies (e.g. USD)', () => {
			const result = formatCurrency(123.45, 2, 'USD', 'en-US');
			expect(result).toContain('123.45');
			expect(result).toContain('$');
		});

		it('should handle zero correctly', () => {
			const result = formatCurrency(0, 2, 'USD', 'en-US');
			expect(result).toContain('0.00');
		});

		it('should handle string zero correctly', () => {
			const result = formatCurrency('0', 2, 'USD', 'en-US');
			expect(result).toContain('0.00');
		});
	});

	describe('getHemisphere', () => {
		it('should identify America/Argentina/Buenos_Aires as southern hemisphere', () => {
			expect(getHemisphere('America/Argentina/Buenos_Aires')).toBe('south');
		});
	});
});
