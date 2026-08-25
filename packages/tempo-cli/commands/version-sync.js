import { execSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function versionSync(_args) {
	let version = process.env.npm_package_version;

	if (!version) {
		const rootPkgPath = path.resolve(ROOT_DIR, 'package.json');
		const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
		version = rootPkg.version;
	}

	if (!version) {
		console.error('ERROR: Unable to detect root package version for version-sync.');
		process.exit(1);
	}

	console.log(`\n🔄 Syncing version ${version} to workspaces...`);

	try {
		const workspaces = ['@magmacomputing/tempo', '@magmacomputing/library', '@magmacomputing/tempo-pro'];
		let syncedCount = 0;
		for (const ws of workspaces) {
			try {
				execSync(`npm version ${version} -w ${ws} --no-git-tag-version`, { cwd: ROOT_DIR, stdio: 'inherit' });
				console.log(`✅ Synced ${ws} to ${version}`);
				syncedCount++;
			} catch (error) {
				console.warn(`⚠️ Bypassed ${ws} (likely already at ${version} or not found). Error details:`, error);
			}
		}

		if (syncedCount === 0) {
			console.error(`\n✖ Sync failed: All workspaces were bypassed (already at ${version} or not found).`);
			process.exit(1);
		}

		console.log(`\n🎉 Version sync complete!\n`);
	} catch (error) {
		console.error('Fatal error during sync.', error);
		process.exit(1);
	}
}
