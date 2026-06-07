import { Tempo, enums } from '#tempo';
import { stringify, objectify, enumify, getType, Pledge } from '#library';

const mockToken = process.env.TEMPO_LICENSE_KEY || undefined;

if (mockToken) {
    if (!process.env.TEMPO_REVOCATION_URL) process.env.TEMPO_REVOCATION_URL = 'mock';
    if (!process.env.TEMPO_REVOCATION_JWS) process.env.TEMPO_REVOCATION_JWS = '{"revoked":[]}';
}

// pre-load Tempo to the global scope for ease of use in the REPL
Object.assign(globalThis, { Tempo, getType, stringify, objectify, enumify, enums, Pledge, mockToken });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191mREPL initialized.\x1b[0m\n`);

/**
 * 💡 SMART IDLE: Auto-exit after 1 hour of keyboard inactivity
 * Monitors 'stdin' so background Tickers won't keep the session alive if you walk away.
 */
let idleTimer: NodeJS.Timeout;
const resetIdle = () => {
	clearTimeout(idleTimer);
	idleTimer = setTimeout(() => {
		console.warn('\n\x1b[33m[Tempo] REPL idle for 1 hour. Safety shutdown triggered.\x1b[0m');
		process.exit(0);
	}, 3600 * 1000);
	idleTimer.unref();
};

process.stdin.on('data', resetIdle);
resetIdle();
