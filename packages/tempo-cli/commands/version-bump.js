import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function versionBump(args) {
	const type = args[0] || 'patch';
	const validTypes = ['patch', 'minor', 'major'];

	if (!validTypes.includes(type)) {
		console.error(`ERROR: Invalid version type '${type}'. Must be one of: ${validTypes.join(', ')}`);
		process.exit(1);
	}

	console.log(`\n🚀 Bumping root package version (${type})...`);

	try {
		// Bump the root version
		execSync(`npm version ${type} --no-git-tag-version`, { cwd: ROOT_DIR, stdio: 'inherit' });

		// Trigger the sync script to update child workspaces
		execSync('npx tempo-cli version-sync', { cwd: ROOT_DIR, stdio: 'inherit' });
	} catch (error) {
		console.error('Failed to bump version.', error);
		process.exit(1);
	}
}
