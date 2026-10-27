import { definePlugin, deepFreeze, hasOwn, getRuntime, isFunction, isObject, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo/core';

import { DIALECT, DIALECT_ALIAS, normalizeDialect, type Dialect, type DialectAlias } from './constants.js';
import { detectDialect, formatWithDialect, parseWithDialect } from './engine/dialect.registry.js';
import { formatLdml, parseLdml, LDML_TOKENS, type LdmlToken } from './compiler/ldml.compiler.js';
import { formatStrftime, parseStrftime, STRFTIME_SPECIFIERS, type StrftimeSpecifier } from './compiler/strftime.compiler.js';
import { formatOracle, parseOracle, ORACLE_TOKENS, ORACLE_UNSUPPORTED_PARSE_TOKENS, type OracleToken } from './compiler/oracle.compiler.js';
import { formatPhp, parsePhp, PHP_TOKENS, type PhpToken } from './compiler/php.compiler.js';
import { formatGo, parseGo } from './compiler/go.compiler.js';
import { formatMysql, parseMysql, MYSQL_SPECIFIERS, type MysqlSpecifier } from './compiler/mysql.compiler.js';
import { formatDotNet, parseDotNet, DOTNET_TOKENS, type DotNetSpecifier } from './compiler/dotnet.compiler.js';
import { formatSheet, parseSheet, SHEET_TOKENS, type SheetSpecifier } from './compiler/sheet.compiler.js';
import { validateResolvedDateFields, type ExtractedDateMetadata } from './compiler/shared.compiler.js';
import { MOMENT_TOKENS, MOMENT_TO_LDML_MAP, type MomentToken } from './engine/dialect.registry.js';
import { explain } from './engine/explain.js';
import { exportDialect } from './engine/export.js';
import { convertDialect } from './engine/convert.js';
import { attachDialectShims } from './engine/dialect.shim.js';
import type { ConvertOptions, ConvertResult, DialectInput, DialectsInstanceNamespace, DialectsStaticNamespace, ExplainOptions, ExplainResult, ExplainedToken, ExportOptions, ExportResult, ExportedToken } from './types.js';

export {
	DIALECT,
	DIALECT_ALIAS,
	normalizeDialect,
	detectDialect,
	formatWithDialect,
	parseWithDialect,
	formatLdml,
	parseLdml,
	LDML_TOKENS,
	formatStrftime,
	parseStrftime,
	STRFTIME_SPECIFIERS,
	formatOracle,
	parseOracle,
	ORACLE_TOKENS,
	ORACLE_UNSUPPORTED_PARSE_TOKENS,
	formatPhp,
	parsePhp,
	PHP_TOKENS,
	formatGo,
	parseGo,
	formatMysql,
	parseMysql,
	MYSQL_SPECIFIERS,
	formatDotNet,
	parseDotNet,
	DOTNET_TOKENS,
	formatSheet,
	parseSheet,
	SHEET_TOKENS,
	validateResolvedDateFields,
	MOMENT_TOKENS,
	MOMENT_TO_LDML_MAP,
	explain,
	exportDialect,
	convertDialect,
};

export type {
	ConvertOptions,
	ConvertResult,
	ExtractedDateMetadata,
	Dialect,
	DialectAlias,
	DialectsInstanceNamespace,
	DialectsStaticNamespace,
	ExplainOptions,
	ExplainResult,
	ExplainedToken,
	ExportOptions,
	ExportResult,
	ExportedToken,
	LdmlToken,
	StrftimeSpecifier,
	OracleToken,
	PhpToken,
	MomentToken,
	MysqlSpecifier,
	DotNetSpecifier,
	SheetSpecifier,
};

/**
 * ## DialectsPlugin
 * Extends Tempo with external format dialects (Unicode LDML, Luxon, Moment, POSIX strftime, Oracle/SQL TO_CHAR).
 */
export const DialectsPlugin: TempoPlugin = definePlugin({
	name: 'dialects',
	/** Registers dialect routing, static and instance namespaces, and compatibility shims on the supplied Tempo class. */
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
					const opts = isObject(dialectOrOptions) ? dialectOrOptions : { ...options, dialect: dialectOrOptions ?? options?.dialect };
					return (installedClass as any).from(input, {
						...opts,
						format: mask,
						dialect: opts.dialect ?? detectDialect(mask),
					});
				},
				fromFormats: (input: string, masks: string[], dialectOrOptions?: string | any, options?: any): Tempo => {
					const opts = isObject(dialectOrOptions) ? dialectOrOptions : { ...options, dialect: dialectOrOptions ?? options?.dialect };
					if (opts.dialect != null) {
						return (installedClass as any).from(input, {
							...opts,
							format: masks,
						});
					}
					let lastInstance: any;
					let firstError: unknown;
					for (const mask of masks) {
						try {
							const t = (installedClass as any).from(input, {
								...opts,
								format: mask,
								dialect: detectDialect(mask),
							});
							if (t?.isValid) return t;
							lastInstance = t;
						} catch (err) {
							if (firstError === undefined) firstError = err;
						}
					}
					if (lastInstance !== undefined) return lastInstance;
					try {
						const fallback = (installedClass as any).from(input, {
							...opts,
							format: masks,
							dialect: DIALECT.Ldml,
						});
						if (!fallback?.isValid && firstError !== undefined)
							throw firstError;

						return fallback;
					} catch (fallbackErr) {
						if (firstError !== undefined) throw firstError;
						throw fallbackErr;
					}
				},
				explain: (mask: string, dialectOrOptions?: DialectInput | ExplainOptions): ExplainResult => {
					return explain(mask, dialectOrOptions);
				},
				export: (mask: string, dialectOrOptions?: DialectInput | ExportOptions): ExportResult => {
					return exportDialect(mask, dialectOrOptions);
				},
				convert: (mask: string, fromOrTo: any, maybeTo?: any): ConvertResult => {
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
					/**
					 * Formats this instance with the selected or detected dialect.
					 * @throws Error when FormatModule is absent; date resolution and formatter errors also propagate.
					 */
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
						mysql: (mask: string) => format(mask, DIALECT.Mysql),
						dotnet: (mask: string) => format(mask, DIALECT.DotNet),
						sheet: (mask: string) => format(mask, DIALECT.Sheet),
						format,
						explain: (mask: string, dialectOrOptions?: DialectInput | ExplainOptions): ExplainResult => explain(mask, dialectOrOptions),
						export: (mask: string, dialectOrOptions?: DialectInput | ExportOptions): ExportResult => exportDialect(mask, dialectOrOptions),
						convert: (mask: string, fromOrTo: any, maybeTo?: any): ConvertResult =>
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
