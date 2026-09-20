import type { Tempo } from '@magmacomputing/tempo';

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
	format(mask: string, dialect?: string): string;
}

export interface DialectsStaticNamespace {
	/**
	 * Parses a date string using a format mask and dialect.
	 */
	parse(input: string, mask: string, dialect?: string): Tempo;
	/**
	 * Parses a date string trying multiple candidate masks until one matches.
	 */
	fromFormats(input: string, masks: string[], dialect?: string): Tempo;
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
