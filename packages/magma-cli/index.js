#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [command, ...args] = process.argv.slice(2);

if (command === 'rm') {
	for (const arg of args) {
		if (!arg) continue;
		const fullPath = path.resolve(process.cwd(), arg);
		try {
			fs.rmSync(fullPath, { recursive: true, force: true });
		} catch (err) {
			console.error(`Failed to remove ${fullPath}:`, err.message);
			process.exitCode = 1;
		}
	}
} else {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
}
