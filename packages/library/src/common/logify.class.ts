import { Immutable } from '#library/class.library.js';
import { sym, markConfig } from '#library/symbol.library.js';
import { asType } from '#library/type.library.js';
import { isObject, isEmpty } from '#library/assertion.library.js';
import { enumify } from '#library/enumerate.library.js';
import type { ValueOf, KeyOf } from '#library/type.library.js';

export const LOG = enumify(['Off', 'Error', 'Warn', 'Info', 'Debug', 'Trace']);
export type LOG = ValueOf<typeof LOG>
export type LogLevel = KeyOf<typeof LOG>

/** @internal console method names keyed by internal identifiers (not exported; see LOG enum for public API) */
const Method = {
	Log: 'log',
	Info: 'info',
	Warn: 'warn',
	Debug: 'debug',
	Trace: 'trace',
	Error: 'error',
} as const;

/** @internal severity levels mapped to Method names for gating logic, derived from LOG */
const Level = {
	[Method.Error]: LOG.Error,
	[Method.Warn]: LOG.Warn,
	[Method.Info]: LOG.Info,
	[Method.Log]: LOG.Info,
	[Method.Debug]: LOG.Debug,
	[Method.Trace]: LOG.Trace,
} as const;

/** logging severity levels for Logify output control */
/**
 * provide standard logging methods to the console for a class
 */
@Immutable
export class Logify {
	#name: string;
	#opts: Logify.Constructor = { [sym.$Logify]: true };

	/**
	 * if {catch:true} then show a warning on the console and return  
	 * otherwise show an error on the console and re-throw the error
	 */
	#trap(method: Logify.Method, ...msg: any[]) {
		const config = (isObject(msg[0]) && (msg[0] as any)[sym.$Logify] === true) ? msg.shift() : this.#opts;
		const currentLevel = (typeof config.debug === 'number')
			? config.debug
			: (config.debug === true ? LOG.Trace : LOG.Info);
		const methodLevel = Level[method] ?? 0;

		const output = msg.map(m => {
			if (m instanceof Error) return m.message;
			if (isObject(m)) {
				try {
					const name = m.constructor?.name ?? 'Object';			// avoiding JSON.stringify (expensive)
					if (name === 'Object') {
						const keys = Object.keys(m);
						const summary = keys.slice(0, 3).join(', ');
						return `{ ${summary}${keys.length > 3 ? `, ... (+${keys.length - 3} more)` : ''} }`;
					}
					return `[${name}]`;
				} catch { return '[Object]'; }
			}
			return String(m);
		}).filter(s => !isEmpty(s)).join(' ');

		if (!config.silent && !isEmpty(output) && methodLevel <= currentLevel)
			(console as any)[method](`${this.#name}: ${output}`);

		if (method === Method.Error && !config.catch) {
			const e = msg.find(m => m instanceof Error);
			const message = `${this.#name}: ${output}`;
			if (e) {
				e.message = message;
				throw e;
			}
			throw new Error(message);
		}
	}

	/** console.log */		log = (...msg: any[]) => this.#trap(Method.Log, ...msg);
	/** console.info */		info = (...msg: any[]) => this.#trap(Method.Info, ...msg);
	/** console.warn */		warn = (...msg: any[]) => this.#trap(Method.Warn, ...msg);
	/** console.debug */	debug = (...msg: any[]) => this.#trap(Method.Debug, ...msg);
	/** console.trace */	trace = (...msg: any[]) => this.#trap(Method.Trace, ...msg);
	/** console.error */	error = (...msg: any[]) => this.#trap(Method.Error, ...msg);

	constructor(self?: Logify.Constructor | string, opts = {} as Logify.Constructor) {
		opts = { ...opts };																				// defensive copy of the options
		const arg = asType(self);
		this.#name = (arg.type === 'String')
			? arg.value
			: (self as any)?.constructor?.name
			?? 'Logify';

		if (arg.type === 'Object') {
			const cfg = { ...arg.value as object };
			markConfig(cfg);																			// auto-mark if it's a config object
			Object.assign(opts, cfg);
		}

		markConfig(opts);																				// auto-mark the options object

		this.#opts.debug = opts.debug ?? false;									// default debug to 'false'
		this.#opts.catch = opts.catch ?? false;									// default catch to 'false'
		this.#opts.silent = opts.silent ?? false;								// default silent to 'false'
	}
}

export namespace Logify {
	export type Method = ValueOf<typeof Method>

	export interface Constructor {
		/**
		 * Logging verbosity: `boolean | number`.
		 * - `true` maps to `LOG.Trace`, enabling trace-level logging
		 * - `false` (or unset) maps to `LOG.Info`
		 * - numeric values map directly to `LOG` levels
		 *
		 * Note: numeric `0` (`LOG.Off`) suppresses all console emission, including
		 * `console.error`. Errors can still be rethrown when `catch: false`, but no
		 * error log is emitted. Use `true` or a higher numeric level to ensure errors
		 * are logged to the console.
		 */
		debug?: boolean | number | undefined,
		catch?: boolean | undefined,
		silent?: boolean | undefined,
		[sym.$Logify]?: boolean | undefined
	}
}