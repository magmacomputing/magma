import { execSync } from 'node:child_process';

const type = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(type)) {
	console.error(`ERROR: Invalid version type '${type}'. Must be one of: ${validTypes.join(', ')}`);
	process.exit(1);
}

console.log(`\n🚀 Bumping root package version (${type})...`);

try {
	// Bump the root version
	execSync(`npm version ${type} --no-git-tag-version`, { stdio: 'inherit' });

	// Trigger the sync script to update child workspaces
	execSync('npm run version:sync', { stdio: 'inherit' });
} catch (error) {
	console.error('Failed to bump version.', error);
	process.exit(1);
}
