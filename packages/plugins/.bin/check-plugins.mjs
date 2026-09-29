#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const PLUGINS_DIR = join(REPO_ROOT, 'packages/plugins');
const MAIN_BRANCH = process.argv[2] || 'main';

function parseSemver(v) {
	if (!v) return null;
	const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
	if (!m) return null;
	return {
		major: parseInt(m[1], 10),
		minor: parseInt(m[2], 10),
		patch: parseInt(m[3], 10),
		prerelease: m[4] || ''
	};
}

function compareSemver(a, b) {
	const pa = parseSemver(a);
	const pb = parseSemver(b);
	if (!pa || !pb) return 0;
	if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
	if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
	if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
	if (!pa.prerelease && pb.prerelease) return 1;
	if (pa.prerelease && !pb.prerelease) return -1;
	if (!pa.prerelease && !pb.prerelease) return 0;

	const aParts = pa.prerelease.split('.');
	const bParts = pb.prerelease.split('.');
	const len = Math.min(aParts.length, bParts.length);
	for (let i = 0; i < len; i++) {
		const ap = aParts[i];
		const bp = bParts[i];
		if (ap === bp) continue;
		const aNum = /^\d+$/.test(ap);
		const bNum = /^\d+$/.test(bp);
		if (aNum && bNum) return parseInt(ap, 10) > parseInt(bp, 10) ? 1 : -1;
		if (aNum && !bNum) return -1;
		if (!aNum && bNum) return 1;
		return ap > bp ? 1 : -1;
	}
	return aParts.length > bParts.length ? 1 : (aParts.length < bParts.length ? -1 : 0);
}

function getGitOutput(cmd) {
	try {
		return execSync(cmd, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
	} catch {
		return '';
	}
}

async function fetchNpmVersion(pkgName) {
	try {
		const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(4000)
		});
		if (res.status === 404) return 'unreleased';
		if (!res.ok) return 'error';
		const data = await res.json();
		return data['dist-tags']?.latest ?? 'unknown';
	} catch {
		// Fallback to npm view if network fetch is blocked or timed out
		const out = getGitOutput(`npm view ${pkgName} version`);
		return out || 'unknown';
	}
}

async function main() {
	let mainCommit;
	try {
		mainCommit = execFileSync('git', ['rev-parse', '--verify', '--quiet', '--end-of-options', `${MAIN_BRANCH}^{commit}`], {
			cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8'
		}).trim();
	} catch {
		console.error(`Error: ${MAIN_BRANCH} does not resolve to a commit.`);
		process.exitCode = 1;
		return;
	}

	const entries = readdirSync(PLUGINS_DIR);
	const pluginDirs = [];

	for (const name of entries) {
		if (name.startsWith('.')) continue;
		const fullPath = join(PLUGINS_DIR, name);
		const pkgJsonPath = join(fullPath, 'package.json');
		if (statSync(fullPath).isDirectory() && existsSync(pkgJsonPath)) {
			try {
				const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
				if (!pkgJson.private) {
					pluginDirs.push({ name, pkgJson, fullPath, relPath: `packages/plugins/${name}` });
				}
			} catch {
				// ignore malformed
			}
		}
	}

	// Fetch NPM versions concurrently
	const npmPromises = pluginDirs.map(p => fetchNpmVersion(p.pkgJson.name || `@magmacomputing/tempo-plugin-${p.name}`));
	const npmVersions = await Promise.all(npmPromises);

	const rows = [];
	let hasError = false;

	for (let i = 0; i < pluginDirs.length; i++) {
		const { name, pkgJson, relPath } = pluginDirs[i];
		const branchVersion = pkgJson.version ?? '0.0.0';
		const npmVersion = npmVersions[i];

		// Read main branch version
		const mainJsonRaw = getGitOutput(`git show ${mainCommit}:${relPath}/package.json`);
		let mainVersion = '[NEW]';
		if (mainJsonRaw) {
			try {
				mainVersion = JSON.parse(mainJsonRaw).version ?? 'unknown';
			} catch {
				mainVersion = 'unknown';
			}
		}

		// Count changed src and doc files
		const srcDiffRaw = getGitOutput(`git diff --name-only ${mainCommit}...HEAD -- ${relPath}/src`);
		const srcCount = srcDiffRaw ? srcDiffRaw.split('\n').filter(Boolean).length : 0;

		const docDiffRaw = getGitOutput(`git diff --name-only ${mainCommit}...HEAD -- ${relPath}/doc ${relPath}/*.md`);
		const docCount = docDiffRaw ? docDiffRaw.split('\n').filter(Boolean).length : 0;

		const isBumpedOverMain = mainVersion !== '[NEW]' && compareSemver(branchVersion, mainVersion) > 0;
		const isNpmAhead = npmVersion !== 'unreleased' && npmVersion !== 'error' && compareSemver(branchVersion, npmVersion) > 0;

		let status = '🟢 Up to date';

		if (mainVersion === '[NEW]') {
			status = `🆕 New Plugin (v${branchVersion})`;
		} else if (srcCount > 0) {
			if (isBumpedOverMain) {
				status = `🚀 Ready to Publish (v${branchVersion})`;
			} else {
				status = '🚨 Needs Version Bump!';
				hasError = true;
			}
		} else if (docCount > 0) {
			if (isBumpedOverMain) {
				status = `📝 Doc Bumped (v${branchVersion})`;
			} else {
				status = '📝 Doc Only (Clean)';
			}
		} else if (isBumpedOverMain) {
			status = `📦 Version Bumped (v${branchVersion})`;
		} else if (isNpmAhead) {
			status = `📦 Pending Publish (v${branchVersion})`;
		} else if (npmVersion === 'unreleased') {
			status = `📦 Unreleased on NPM (v${branchVersion})`;
		}

		rows.push({
			name,
			srcCount,
			docCount,
			npmVersion,
			mainVersion,
			branchVersion,
			status
		});
	}

	// Print Header
	console.log('');
	console.log(
		'Plugin Package'.padEnd(18) + ' | ' +
		'Src'.padStart(3) + ' | ' +
		'Doc'.padStart(3) + ' | ' +
		'NPM Version'.padEnd(12) + ' | ' +
		'Main Version'.padEnd(12) + ' | ' +
		'Branch Version'.padEnd(14) + ' | ' +
		'Status / Action'
	);
	console.log(
		'-'.repeat(18) + '-+-' +
		'-'.repeat(3) + '-+-' +
		'-'.repeat(3) + '-+-' +
		'-'.repeat(12) + '-+-' +
		'-'.repeat(12) + '-+-' +
		'-'.repeat(14) + '-+-' +
		'-'.repeat(32)
	);

	for (const r of rows) {
		console.log(
			r.name.padEnd(18) + ' | ' +
			String(r.srcCount).padStart(3) + ' | ' +
			String(r.docCount).padStart(3) + ' | ' +
			r.npmVersion.padEnd(12) + ' | ' +
			r.mainVersion.padEnd(12) + ' | ' +
			r.branchVersion.padEnd(14) + ' | ' +
			r.status
		);
	}
	console.log('');

	process.exit(hasError ? 1 : 0);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
