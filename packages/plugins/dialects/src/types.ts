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

export type DialectInput = Evaluable<string>;

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
	 * Formats this instance using a specified dialect mask.
	 */
	format(mask: string, dialect?: DialectInput): string;
	/**
	 * Explains an external dialect mask, translating it into native Tempo {token} syntax
	 * with detailed token mappings to guide incremental migration.
	 */
	explain(mask: string, dialect?: DialectInput): ExplainResult;
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
	explain(mask: string, dialect?: DialectInput): ExplainResult;
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
