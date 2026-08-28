import { isObject, isEmpty, isNumber, isError, isString } from '#library/assertion.library.js';
import { enumify } from '#library/enumerate.library.js';
import { sym } from '#library/symbol.library.js';
import type { KeyOf, ValueOf } from '#library/type.library.js';

/**
 * Enumeration of available log levels from lowest to highest verbosity.
 */
export const LOG = enumify(['Off', 'Error', 'Warn', 'Info', 'Debug', 'Trace']);
/**
 * Type representing a numeric log level value.
 */
export type LOG = ValueOf<typeof LOG>
/**
 * Type representing a log level by its string key name.
 */
export type LogLevel = KeyOf<typeof LOG>
/**
 * Type representing any valid debug level specification (numeric or method string).
 */
export type DebugLevel = LOG | Method;

const Method = {
	Off: 'off',
	Log: 'log',
	Info: 'info',
	Warn: 'warn',
	Debug: 'debug',
	Trace: 'trace',
	Error: 'error',
} as const;
type Method = ValueOf<typeof Method>

const Level = {
	[Method.Off]: LOG.Off,
	[Method.Error]: LOG.Error,
	[Method.Warn]: LOG.Warn,
	[Method.Info]: LOG.Info,
	[Method.Log]: LOG.Info,
	[Method.Debug]: LOG.Debug,
	[Method.Trace]: LOG.Trace,
} as const;

/**
 * Parses a debug level (numeric or string) into a strongly-typed LOG enumeration value.
 * 
 * @param level - The log level to parse
 * @param fallback - The default log level to return if parsing fails (default: Info)
 * @returns The resolved LOG enumeration value
 * @example
 * ```ts
 * parseLogLevel('debug'); // LOG.Debug
 * ```
 */
export function parseLogLevel(level?: DebugLevel, fallback: LOG = LOG.Info): LOG {
	if (isNumber(level)) return (level >= LOG.Off && level <= LOG.Trace) ? level as LOG : fallback;
	if (isString(level)) return Level[level.toLowerCase() as Method] ?? fallback;
	return fallback;
}

/**
 * A lightweight, dependency-free namespaced logger.
 * Decoupled from error handling and boundaries, utilizing standard `console` methods.
 * Supports configurable log levels and structured object output.
 * 
 * @example
 * ```ts
 * const log = new Logger('App', LOG.Debug);
 * log.info('Started'); // [App] Started
 * ```
 */
export class Logger {
	#namespace: string;

	/** The current verbosity level */
	level: LOG;

	constructor(namespace: string, level: LOG = LOG.Info) {
		this.#namespace = namespace.startsWith('[') ? namespace : `[${namespace}]`;
		this.level = level;
	}

	#emit(method: typeof Method[keyof typeof Method], ...msg: any[]) {
		let config: any;
		if (msg.length > 0 && isObject(msg[0])) {
			try {
				if (msg[0][sym.$LogConfig]) {
					config = msg.shift();
				}
			} catch {
				// Ignore access errors on proxies/getters
			}
		}

		let activeLevel = this.level;
		if (config) {
			if (config.silent === true) return;
			if (config.debug !== undefined) {
				activeLevel = parseLogLevel(config.debug, activeLevel);
			}
		}

		if (activeLevel === LOG.Off) return;
		const methodLevel = Level[method] ?? 0;
		if (methodLevel > activeLevel) return;

		const output = msg
			.map(m => {
				if (isError(m)) return m.message;
				if (isObject(m)) {
					try {
						const name = m.constructor?.name ?? 'Object';
						if (name === 'Object') {
							const keys = Object.keys(m);
							const summary = keys.slice(0, 3).join(', ');
							return `{ ${summary}${keys.length > 3 ? `, ... (+${keys.length - 3} more)` : ''} }`;
						}
						return `[${name}]`;
					} catch { return '[Object]'; }
				}
				return String(m);
			})
			.filter(s => !isEmpty(s)).join(' ');

		if (!isEmpty(output)) {
			const consoleMethod = method;
			(console as any)[consoleMethod](`${this.#namespace} ${output}`);
		}
	}

	/** console.log */		log = (...msg: any[]) => this.#emit(Method.Log, ...msg);
	/** console.info */		info = (...msg: any[]) => this.#emit(Method.Info, ...msg);
	/** console.warn */		warn = (...msg: any[]) => this.#emit(Method.Warn, ...msg);
	/** console.debug */	debug = (...msg: any[]) => this.#emit(Method.Debug, ...msg);
	/** console.trace */	trace = (...msg: any[]) => this.#emit(Method.Trace, ...msg);
	/** console.error */	error = (...msg: any[]) => this.#emit(Method.Error, ...msg);
}
