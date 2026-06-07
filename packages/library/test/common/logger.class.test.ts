import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LOG, parseLogLevel } from '../../src/common/logger.class.js';
import { sym } from '../../src/common/symbol.library.js';

describe('Logger Class', () => {
	let consoleSpy: any;

	beforeEach(() => {
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			info: vi.spyOn(console, 'info').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
			debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
			trace: vi.spyOn(console, 'trace').mockImplementation(() => {})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should parse log levels correctly', () => {
		expect(parseLogLevel('trace')).toBe(LOG.Trace);
		expect(parseLogLevel('error')).toBe(LOG.Error);
		expect(parseLogLevel(undefined, LOG.Warn)).toBe(LOG.Warn);
		expect(parseLogLevel(LOG.Debug)).toBe(LOG.Debug);
	});

	it('should format namespace correctly', () => {
		const logger = new Logger('Test');
		logger.info('Hello');
		expect(consoleSpy.info).toHaveBeenCalledWith('[Test] Hello');
	});

	it('should respect default level boundaries', () => {
		const logger = new Logger('Test', LOG.Warn);
		logger.info('Should not print');
		logger.error('Should print');
		expect(consoleSpy.info).not.toHaveBeenCalled();
		expect(consoleSpy.error).toHaveBeenCalledWith('[Test] Should print');
	});

	it('should respect inline config overrides', () => {
		const logger = new Logger('Test', LOG.Error);
		// Normally debug wouldn't print on Error level, but we override it via config
		const config = { [sym.$LogConfig]: true, debug: 'trace' };
		logger.debug(config, 'Inline debug');
		expect(consoleSpy.debug).toHaveBeenCalledWith('[Test] Inline debug');
	});

	it('should suppress output when silent is true', () => {
		const logger = new Logger('Test', LOG.Trace);
		const config = { [sym.$LogConfig]: true, silent: true };
		logger.error(config, 'Fatal error');
		expect(consoleSpy.error).not.toHaveBeenCalled();
	});
});
