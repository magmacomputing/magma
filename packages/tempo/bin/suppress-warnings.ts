/**
 * Suppress experimental localStorage noise in interactive REPL sessions.
 */
const _origEmitWarning = process.emitWarning;
process.emitWarning = function (warning: any, ...args: any[]) {
	const msg = typeof warning === 'string' ? warning : warning?.message;
	const type = typeof warning === 'object' && warning ? warning.name : (typeof args[0] === 'string' ? args[0] : args[0]?.type);
	const isExperimental = type === 'ExperimentalWarning' || (typeof warning === 'string' && typeof args[0] === 'string' && args[0] === 'ExperimentalWarning');

	if (isExperimental && typeof msg === 'string' && (msg.includes('--localstorage-file') || msg.includes('localStorage is an experimental feature'))) {
		return;
	}
	return (_origEmitWarning as any).apply(process, [warning, ...args]);
};
