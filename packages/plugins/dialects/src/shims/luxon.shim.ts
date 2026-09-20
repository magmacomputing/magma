import type { Tempo } from '@magmacomputing/tempo';
import { formatWithDialect } from '../engine/dialect.registry.js';
import { DIALECT } from '../constants.js';

/**
 * Attaches convenience shims for developers migrating from Luxon or Moment.
 */
export function attachDialectShims(TempoClass: any): void {
	// Instance method: t.toFormat()
	if (!TempoClass.prototype.toFormat) {
		Object.defineProperty(TempoClass.prototype, 'toFormat', {
			value: function toFormat(this: Tempo, mask: string, options: Tempo.FormatOptions = {}): string {
				if (typeof (this as any).hasModule === 'function' && !(this as any).hasModule('FormatModule')) {
					throw new Error("[Tempo Dialects] Formatting requires 'FormatModule'. Call 'Tempo.use(FormatModule)' first.");
				}
				const zdt = this.toDateTime();
				return formatWithDialect(zdt, mask, {
					...this.config,
					...options,
					dialect: (options as any)?.dialect ?? DIALECT.Ldml,
				});
			},
			writable: false,
			configurable: true,
			enumerable: false,
		});
	}

	// Static method: Tempo.fromFormat()
	if (!TempoClass.fromFormat) {
		Object.defineProperty(TempoClass, 'fromFormat', {
			value: function fromFormat(input: string, mask: string, options: Tempo.Options = {}): Tempo {
				return (TempoClass as any).from(input, {
					...options,
					format: mask,
					dialect: options.dialect ?? DIALECT.Ldml,
				});
			},
			writable: false,
			configurable: true,
			enumerable: false,
		});
	}

	// Static method: Tempo.fromFormats()
	if (!TempoClass.fromFormats) {
		Object.defineProperty(TempoClass, 'fromFormats', {
			value: function fromFormats(input: string, masks: string[], options: Tempo.Options = {}): Tempo {
				return (TempoClass as any).from(input, {
					...options,
					format: masks,
					dialect: options.dialect ?? DIALECT.Ldml,
				});
			},
			writable: false,
			configurable: true,
			enumerable: false,
		});
	}
}
