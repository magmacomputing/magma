import '../../library/test/support/temporal-polyfill.js';

// Filter only Node's experimental localStorage warning without hiding real deprecation or memory leak warnings
if (typeof process !== 'undefined' && process.on) {
	const existingWarningListeners = process.listeners('warning');
	process.removeAllListeners('warning');
	process.on('warning', (warning) => {
		if (warning.name === 'ExperimentalWarning' && warning.message.includes('localStorage')) return;
		if (existingWarningListeners.length > 0) {
			existingWarningListeners.forEach((listener) => listener(warning));
		} else {
			console.warn(`[${warning.name}] ${warning.message}`);
		}
	});
}
