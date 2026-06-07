import { raise } from '../../src/common/boundary.library.js';

describe('Boundary Library', () => {
	let consoleSpy: any;
	let mockLogger: any;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
		mockLogger = { error: vi.fn() };
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should throw immediately if no catch is specified', () => {
		expect(() => raise('Test Exception')).toThrow('Test Exception');
		expect(consoleSpy).toHaveBeenCalledWith('[Boundary]', expect.any(Error));
	});

	it('should log to custom logger if provided', () => {
		expect(() => raise('Test Exception', { logger: mockLogger })).toThrow('Test Exception');
		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it('should swallow the error if catch is true', () => {
		expect(() => raise('Handled Exception', { catch: true })).not.toThrow();
		expect(consoleSpy).toHaveBeenCalledWith('[Boundary]', expect.any(Error));
	});

	it('should completely suppress output if silent is true', () => {
		expect(() => raise('Silent Exception', { catch: true, silent: true })).not.toThrow();
		expect(consoleSpy).not.toHaveBeenCalled();
		expect(mockLogger.error).not.toHaveBeenCalled();
	});
});
