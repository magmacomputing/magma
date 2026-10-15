import { definePlugin, deepFreeze, hasOwn, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import { getRuntime } from '@magmacomputing/tempo/support';
import { isFunction } from '@magmacomputing/tempo/library';
import type { Tempo } from '@magmacomputing/tempo/core';

import { DIALECT, DIALECT_ALIAS, normalizeDialect, type Dialect, type DialectAlias } from './constants.js';
import { formatWithDialect, parseWithDialect } from './engine/dialect.registry.js';
import { formatLdml, parseLdml } from './compiler/ldml.compiler.js';
import { formatStrftime, parseStrftime } from './compiler/strftime.compiler.js';
import { formatOracle, parseOracle } from './compiler/oracle.compiler.js';
import { formatPhp, parsePhp } from './compiler/php.compiler.js';
import { formatGo, parseGo } from './compiler/go.compiler.js';
import { explain, type ExplainResult, type ExplainedToken } from './engine/explain.js';
import { exportDialect } from './engine/export.js';
import { convertDialect } from './engine/convert.js';
import { attachDialectShims } from './shims/luxon.shim.js';
import type { ConvertResult, DialectInput, DialectsInstanceNamespace, DialectsStaticNamespace, ExportResult, ExportedToken } from './types.js';

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
	formatOracle,
	parseOracle,
	formatPhp,
	parsePhp,
	formatGo,
	parseGo,
	explain,
	exportDialect,
	convertDialect,
};

export type { ConvertResult, Dialect, DialectAlias, DialectsInstanceNamespace, DialectsStaticNamespace, ExplainResult, ExplainedToken, ExportResult, ExportedToken };

/**
 * ## DialectsPlugin
 * Extends Tempo with external format dialects (Unicode LDML, Luxon, Moment, POSIX strftime, Oracle/SQL TO_CHAR).
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
		if (!hasOwn(installedClass, 'dialects')) {
			const staticNamespace: DialectsStaticNamespace = {
				parse: (input: string, mask: string, dialectOrOptions?: string | any, options?: any): Tempo => {
					const opts = typeof dialectOrOptions === 'object' && dialectOrOptions !== null ? dialectOrOptions : { dialect: dialectOrOptions, ...options };
					return (installedClass as any).from(input, {
						...opts,
						format: mask,
						dialect: opts.dialect ?? DIALECT.Ldml,
					});
				},
				fromFormats: (input: string, masks: string[], dialectOrOptions?: string | any, options?: any): Tempo => {
					const opts = typeof dialectOrOptions === 'object' && dialectOrOptions !== null ? dialectOrOptions : { dialect: dialectOrOptions, ...options };
					return (installedClass as any).from(input, {
						...opts,
						format: masks,
						dialect: opts.dialect ?? DIALECT.Ldml,
					});
				},
				explain: (mask: string, dialect?: DialectInput): ExplainResult => {
					return explain(mask, dialect);
				},
				export: (mask: string, dialect?: DialectInput): ExportResult => {
					return exportDialect(mask, dialect);
				},
				convert: (mask: string, fromOrTo: DialectInput, maybeTo?: DialectInput): ConvertResult => {
					return convertDialect(mask, fromOrTo, maybeTo);
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
		if (!hasOwn(installedClass.prototype, 'dialects')) {
			Object.defineProperty(installedClass.prototype, 'dialects', {
				get: function (this: Tempo): DialectsInstanceNamespace {
					const self = this;
					const format = (mask: string, dialect?: string) => {
						if (isFunction((self as any).hasModule) && !(self as any).hasModule('FormatModule'))
							throw new Error("[Tempo Dialects] Formatting requires 'FormatModule'. Call 'Tempo.use(FormatModule)' first.");

						return formatWithDialect(self.toDateTime(), mask, {
							...self.config,
							dialect,
						});
					};

					return {
						ldml: (mask: string) => format(mask, DIALECT.Ldml),
						strftime: (mask: string) => format(mask, DIALECT.Strftime),
						oracle: (mask: string) => format(mask, DIALECT.Oracle),
						sql: (mask: string) => format(mask, DIALECT.Oracle),
						php: (mask: string) => format(mask, DIALECT.Php),
						go: (mask: string) => format(mask, DIALECT.Go),
						format,
						explain: (mask: string, dialect?: DialectInput): ExplainResult => explain(mask, dialect),
						export: (mask: string, dialect?: DialectInput): ExportResult => exportDialect(mask, dialect),
						convert: (mask: string, fromOrTo: DialectInput, maybeTo?: DialectInput): ConvertResult =>
							convertDialect(mask, fromOrTo, maybeTo),
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
