import fs from 'node:fs';
import path from 'node:path';

export async function rm(args) {
	if (args.length === 0) {
		console.error('Error: "tempo-cli rm" requires at least one file or directory path argument.');
		process.exit(1);
	}

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
}
