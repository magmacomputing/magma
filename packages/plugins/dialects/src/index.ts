import { definePlugin, deepFreeze, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import { getRuntime } from '@magmacomputing/tempo/support';
import type { Tempo } from '@magmacomputing/tempo/core';

import { DIALECT, DIALECT_ALIAS, normalizeDialect, type Dialect, type DialectAlias } from './constants.js';
import { formatWithDialect, parseWithDialect } from './engine/dialect.registry.js';
import { formatLdml, parseLdml } from './engine/ldml.compiler.js';
import { formatStrftime, parseStrftime } from './engine/strftime.compiler.js';
import { attachDialectShims } from './shims/luxon.shim.js';
import type { DialectsInstanceNamespace, DialectsStaticNamespace } from './types.js';

export {
	DIALECT,
	DIALECT_ALIAS,
	normalizeDialect,
	formatWithDialect,
	parseWithDialect,
	formatLdml,
	parseLdml,
	formatStrftime,
	parseStrftime,
};

export type { Dialect, DialectAlias, DialectsInstanceNamespace, DialectsStaticNamespace };

/**
 * ## DialectsPlugin
 * Extends Tempo with external format dialects (Unicode LDML, Luxon, Moment, POSIX strftime).
 */
export const DialectsPlugin: TempoPlugin = definePlugin({
	name: 'dialects',
	install(this: any, TempoClass: any) {
		const installedClass = TempoClass || this;

		// 1. Register global runtime dialect router for core FormatModule and ParseModule
		const rt = getRuntime() as any;
		rt.dialects = {
			format: formatWithDialect,
			parse: parseWithDialect,
		};
		if (rt.modules) rt.modules['DialectsModule'] = rt.dialects;
		(globalThis as any)[Symbol.for('Tempo.dialects')] = rt.dialects;
		(installedClass as any).dialectsRegistry = rt.dialects;

		// 2. Static tools on Tempo.dialects
		if (!Object.hasOwn(installedClass, 'dialects')) {
			const staticNamespace: DialectsStaticNamespace = {
				parse: (input: string, mask: string, dialect?: string): Tempo => {
					return (installedClass as any).from(input, {
						format: mask,
						dialect: dialect ?? DIALECT.Ldml,
					});
				},
				fromFormats: (input: string, masks: string[], dialect?: string): Tempo => {
					return (installedClass as any).from(input, {
						format: masks,
						dialect: dialect ?? DIALECT.Ldml,
					});
				},
			};

			Object.defineProperty(installedClass, 'dialects', {
				value: deepFreeze(staticNamespace),
				writable: false,
				configurable: false,
				enumerable: false,
			});
		}

		// 3. Instance namespace t.dialects
		if (!Object.hasOwn(installedClass.prototype, 'dialects')) {
			Object.defineProperty(installedClass.prototype, 'dialects', {
				get: function (this: Tempo): DialectsInstanceNamespace {
					const self = this;
					return {
						ldml: (mask: string) => {
							if (typeof (self as any).hasModule === 'function' && !(self as any).hasModule('FormatModule')) {
								throw new Error("[Tempo Dialects] Formatting requires 'FormatModule'. Call 'Tempo.use(FormatModule)' first.");
							}
							return formatWithDialect(self.toDateTime(), mask, {
								...self.config,
								dialect: DIALECT.Ldml,
							});
						},
						strftime: (mask: string) => {
							if (typeof (self as any).hasModule === 'function' && !(self as any).hasModule('FormatModule')) {
								throw new Error("[Tempo Dialects] Formatting requires 'FormatModule'. Call 'Tempo.use(FormatModule)' first.");
							}
							return formatWithDialect(self.toDateTime(), mask, {
								...self.config,
								dialect: DIALECT.Strftime,
							});
						},
						format: (mask: string, dialect?: string) => {
							if (typeof (self as any).hasModule === 'function' && !(self as any).hasModule('FormatModule')) {
								throw new Error("[Tempo Dialects] Formatting requires 'FormatModule'. Call 'Tempo.use(FormatModule)' first.");
							}
							return formatWithDialect(self.toDateTime(), mask, {
								...self.config,
								dialect,
							});
						},
					};
				},
				configurable: true,
				enumerable: false,
			});
		}

		// 4. Attach convenience shims (t.toFormat, Tempo.fromFormat, Tempo.fromFormats)
		attachDialectShims(installedClass);
	},
});

export const dialectsPlugin = DialectsPlugin;
export default DialectsPlugin;
