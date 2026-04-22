import { parse } from '#tempo/parse';

// Pre-load core symbols (parse) to the global scope
Object.assign(globalThis, { parse });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo (parse) \x1b[0m\x1b[38;2;45;212;191mREPL initialized (parse only).\x1b[0m\n`);

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
