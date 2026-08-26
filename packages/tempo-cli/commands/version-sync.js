import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function versionSync(_args) {
	const rootPkgPath = path.resolve(ROOT_DIR, 'package.json');
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
	const version = rootPkg?.version;

	if (!version || typeof version !== 'string' || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version.trim())) {
		console.error('ERROR: Unable to detect valid root package version for version-sync.');
		process.exit(1);
	}

	console.log(`\n🔄 Syncing version ${version} to workspaces...`);

	try {
		const workspaces = ['@magmacomputing/tempo', '@magmacomputing/library', '@magmacomputing/tempo-pro'];
		let syncedCount = 0;
		let alreadySyncedCount = 0;
		for (const ws of workspaces) {
			try {
				const wsRelPath = ws.replace('@magmacomputing/', '');
				const wsPkgPath = path.resolve(ROOT_DIR, 'packages', wsRelPath, 'package.json');
				if (existsSync(wsPkgPath)) {
					const wsPkg = JSON.parse(readFileSync(wsPkgPath, 'utf8'));
					if (wsPkg.version === version) {
						console.log(`ℹ️ ${ws} is already at ${version}`);
						alreadySyncedCount++;
						continue;
					}
				}
				const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
				execFileSync(npmCmd, ['version', version, '-w', ws, '--no-git-tag-version'], { cwd: ROOT_DIR, stdio: 'inherit' });
				console.log(`✅ Synced ${ws} to ${version}`);
				syncedCount++;
			} catch (error) {
				console.warn(`⚠️ Bypassed ${ws} (error details):`, error?.message || error);
			}
		}

		if (syncedCount === 0 && alreadySyncedCount === 0) {
			console.error(`\n✖ Sync failed: All workspaces were bypassed or not found.`);
			process.exit(1);
		}

		console.log(`\n🎉 Version sync complete!\n`);
	} catch (error) {
		console.error('Fatal error during sync.', error);
		process.exit(1);
	}
}
