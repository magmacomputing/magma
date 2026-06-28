import { execSync } from 'node:child_process';

const version = process.env.npm_package_version;

if (!version) {
	console.error('ERROR: version-sync must be run via npm (e.g. npm run version:sync) to access npm_package_version.');
	process.exit(1);
}

console.log(`\n🔄 Syncing version ${version} to workspaces...`);

try {
	execSync(
		`npm version ${version} -w @magmacomputing/tempo -w @magmacomputing/library --no-git-tag-version`,
		{ stdio: 'inherit' }
	);
	console.log(`✅ Version successfully synced to ${version} across workspaces!\n`);
} catch (error) {
	console.error('Failed to sync versions.', error);
	process.exit(1);
}
