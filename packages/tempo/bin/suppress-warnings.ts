/**
 * Suppress experimental localStorage noise in interactive REPL sessions.
 */
const _origEmitWarning = process.emitWarning;
process.emitWarning = function (warning: any, ...args: any[]) {
	const msg = typeof warning === 'string' ? warning : warning?.message;
	if (typeof msg === 'string' && (msg.includes('--localstorage-file') || msg.toLowerCase().includes('localstorage'))) {
		return;
	}
	return (_origEmitWarning as any).apply(process, [warning, ...args]);
};
