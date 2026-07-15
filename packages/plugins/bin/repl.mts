import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Tempo, enums } from '@magmacomputing/tempo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mockToken = process.env.TEMPO_LICENSE_KEY || undefined;

// Fallback manual .env loading since tsx CLI proxy might drop Node native args
if (!mockToken) {
    try {
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^TEMPO_LICENSE_KEY=(.*)$/m);
            if (match) mockToken = match[1].trim();
        }
    } catch (e) { /* ignore */ }
}

if (process.env.TEST_MODE) {
    if (!process.env.TEMPO_REVOCATION_URL) process.env.TEMPO_REVOCATION_URL = 'mock';
    if (!process.env.TEMPO_REVOCATION_JWS) process.env.TEMPO_REVOCATION_JWS = '{"revoked":[]}';
}

Tempo.init(mockToken ? { license: mockToken } : {});

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191m Plugin Testing REPL initialized.\x1b[0m\n`);

// Auto-discover and load compiled plugins from packages/*/dist/index.js
const packagesDir = path.join(__dirname, '..');
const plugins = fs.readdirSync(packagesDir, { withFileTypes: true })
	.filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('@'))
	.map(dirent => dirent.name)

for (const plugin of plugins) {
	let indexPath = path.join(packagesDir, plugin, 'dist/index.mjs');
	if (!fs.existsSync(indexPath))
		indexPath = path.join(packagesDir, plugin, 'dist/index.js');

	if (fs.existsSync(indexPath)) {
		try {
			// Convert to file:// URL for safe dynamic import on Windows/Linux
			const mod = await import(pathToFileURL(indexPath).href);
			let loadedCount = 0;

			for (const key in mod) {
				if (key.endsWith('Term') || key.endsWith('Plugin') || key.endsWith('Module')) {
					console.log(`\x1b[32m✔ Loaded plugin from ${plugin}:\x1b[0m ${key}`);
					loadedCount++;
				}
			}

			if (loadedCount === 0) {
				console.log(`\x1b[33m⚠ No standard *Term, *Plugin, or *Module exports found in ${plugin} dist.\x1b[0m`);
			}
		} catch (err: any) {
			console.error(`\x1b[31m✖ Failed to load plugin ${plugin}:\x1b[0m ${err.message}`);
		}
	} else {
		console.log(`\x1b[90m⚠ Skipped ${plugin} - dist/index.js not found (run build first)\x1b[0m`);
	}
}

console.log('');

// Expose Tempo globally
Object.assign(globalThis, { Tempo, enums });

