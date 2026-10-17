import type { Tempo } from '@magmacomputing/tempo';
import type { Evaluable } from '@magmacomputing/tempo/library';
import type { Dialect } from './constants.js';

export interface ExplainedToken {
	readonly source: string;
	readonly tempo: string;
	readonly desc: string;
}

export interface ExplainResult {
	readonly dialect: Dialect;
	readonly source: string;
	readonly pattern: string;
	readonly tokens: readonly ExplainedToken[];
	toString(): string;
}

export interface ExportedToken {
	readonly source: string;
	readonly target: string;
	readonly desc: string;
	readonly supported: boolean;
}

export interface ExportResult {
	readonly dialect: Dialect;
	readonly source: string;
	readonly pattern: string;
	readonly tokens: readonly ExportedToken[];
	readonly unsupported: readonly string[];
	toString(): string;
}

export interface ConvertResult {
	readonly from: Dialect;
	readonly to: Dialect;
	readonly source: string;
	readonly pattern: string;
	readonly unsupported: readonly string[];
	toString(): string;
}

export type DialectInput = Evaluable<string>;

export interface ExplainOptions {
	readonly dialect?: DialectInput;
}

export interface ExportOptions {
	readonly dialect?: DialectInput;
}

export interface ConvertOptions {
	readonly from?: DialectInput;
	readonly to: DialectInput;
}

export interface DialectsInstanceNamespace {
	/**
	 * Formats this instance using Unicode LDML / Luxon tokens (e.g. 'yyyy-MM-dd HH:mm').
	 */
	ldml(mask: string): string;
	/**
	 * Formats this instance using POSIX strftime specifiers (e.g. '%Y-%m-%d %H:%M:%S').
	 */
	strftime(mask: string): string;
	/**
	 * Formats this instance using Oracle / SQL TO_CHAR format models (e.g. 'YYYY-MM-DD HH24:MI:SS').
	 */
	oracle(mask: string): string;
	/**
	 * Convenience helper for formatting using SQL / Oracle format models (e.g. 'YYYY-MM-DD HH24:MI:SS').
	 */
	sql(mask: string): string;
	/**
	 * Formats this instance using PHP date format specifiers (e.g. 'Y-m-d H:i:s').
	 */
	php(mask: string): string;
	/**
	 * Formats this instance using Go reference time format layout (e.g. '2006-01-02 15:04:05').
	 */
	go(mask: string): string;
	/**
	 * Formats this instance using a specified dialect mask.
	 */
	format(mask: string, dialect?: DialectInput): string;
	/**
	 * Explains an external dialect mask, translating it into native Tempo {token} syntax
	 * with detailed token mappings to guide incremental migration.
	 */
	explain(mask: string, dialectOrOptions?: DialectInput | ExplainOptions): ExplainResult;
	/**
	 * Exports a native Tempo format pattern into the corresponding external dialect format model.
	 */
	export(mask: string, dialectOrOptions?: DialectInput | ExportOptions): ExportResult;
	/**
	 * Converts a format mask directly from one dialect to another.
	 * If fromDialect is omitted, it will be automatically detected.
	 */
	convert(mask: string, options: ConvertOptions): ConvertResult;
	convert(mask: string, toDialect: DialectInput): ConvertResult;
	convert(mask: string, fromDialect: DialectInput, toDialect: DialectInput): ConvertResult;
}

export interface DialectsStaticNamespace {
	/**
	 * Parses a date string using a format mask and dialect.
	 */
	parse(input: string, mask: string, dialect?: DialectInput, options?: Tempo.Options): Tempo;
	parse(input: string, mask: string, options?: Tempo.Options): Tempo;
	/**
	 * Parses a date string trying multiple candidate masks until one matches.
	 */
	fromFormats(input: string, masks: string[], dialect?: DialectInput, options?: Tempo.Options): Tempo;
	fromFormats(input: string, masks: string[], options?: Tempo.Options): Tempo;
	/**
	 * Explains an external dialect mask, translating it into native Tempo {token} syntax
	 * with detailed token mappings to guide incremental migration.
	 */
	explain(mask: string, dialectOrOptions?: DialectInput | ExplainOptions): ExplainResult;
	/**
	 * Exports a native Tempo format pattern into the corresponding external dialect format model.
	 */
	export(mask: string, dialectOrOptions?: DialectInput | ExportOptions): ExportResult;
	/**
	 * Converts a format mask directly from one dialect to another.
	 * If fromDialect is omitted, it will be automatically detected.
	 */
	convert(mask: string, options: ConvertOptions): ConvertResult;
	convert(mask: string, toDialect: DialectInput): ConvertResult;
	convert(mask: string, fromDialect: DialectInput, toDialect: DialectInput): ConvertResult;
}

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		let dialects: DialectsStaticNamespace;
		function fromFormat(input: string, mask: string, options?: Tempo.Options): Tempo;
		function fromFormats(input: string, masks: string[], options?: Tempo.Options): Tempo;
	}

	interface Tempo {
		readonly dialects: DialectsInstanceNamespace;
		/**
		 * Luxon migration shim: formats using Unicode LDML mask.
		 */
		toFormat(mask: string, options?: Tempo.FormatOptions): string;
	}
}
