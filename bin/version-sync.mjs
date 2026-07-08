import { execSync } from 'node:child_process';

const version = process.env.npm_package_version;

if (!version) {
	console.error('ERROR: version-sync must be run via npm (e.g. npm run version:sync) to access npm_package_version.');
	process.exit(1);
}

console.log(`\n🔄 Syncing version ${version} to workspaces...`);

try {
	const workspaces = ['@magmacomputing/tempo', '@magmacomputing/library'];
	for (const ws of workspaces) {
		try {
			execSync(`npm version ${version} -w ${ws} --no-git-tag-version`, { stdio: 'inherit' });
			console.log(`✅ Synced ${ws} to ${version}`);
		} catch (error) {
			console.warn(`⚠️ Bypassed ${ws} (likely already at ${version} or not found).`);
		}
	}
	console.log(`\n🎉 Version sync complete!\n`);
} catch (error) {
	console.error('Fatal error during sync.', error);
	process.exit(1);
}
