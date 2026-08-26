import { execFileSync } from 'node:child_process';

/**
 * Prepublish safeguard command for Tempo monorepo packages.
 * Verifies that git branch is 'main' before running 'npm run build'.
 *
 * @param {string[]} _args - Additional command arguments
 */
export async function prepublish(_args) {
	try {
		const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
		if (branch !== 'main') {
			console.error(`ERROR: Must be on main branch to publish (current branch: ${branch}).`);
			process.exit(1);
		}
	} catch (err) {
		if (err.status !== undefined && err.status !== 0) throw err;
		console.error('ERROR: Failed to verify git branch prior to publish:', err.message || err);
		process.exit(1);
	}

	const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	try {
		execFileSync(npmCmd, ['run', 'build'], { stdio: 'inherit' });
	} catch (err) {
		console.error('ERROR: Build failed during prepublish phase.');
		process.exit(1);
	}
}
