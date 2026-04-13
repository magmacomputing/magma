/**
 * Type declarations for tempo.symbol runtime module.
 * This provides `unique symbol` types for the exported symbol constants
 * so computed property names (e.g. `static [sym.$logError]`) are typed
 * precisely by the language service and emit correct declaration files.
 */

export const $Tempo: unique symbol;
export const $Plugins: unique symbol;
export const $Register: unique symbol;
export const $isTempo: unique symbol;
export const $Interpreter: unique symbol;
export const $logError: unique symbol;
export const $logDebug: unique symbol;
export const $termError: unique symbol;
export const $errored: unique symbol;

declare const _sym: {
  $Tempo: typeof $Tempo;
  $Plugins: typeof $Plugins;
  $Register: typeof $Register;
  $isTempo: typeof $isTempo;
  $Interpreter: typeof $Interpreter;
  $logError: typeof $logError;
  $logDebug: typeof $logDebug;
  $termError: typeof $termError;
  $errored: typeof $errored;
};

export function registerHook(sym: symbol, cb: (val: any) => void): any;
export const isTempo: (tempo?: any) => boolean;

export default _sym;
