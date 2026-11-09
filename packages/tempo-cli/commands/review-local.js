import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resolves a git command output in the current working directory.
 */
function runGit(args) {
	try {
		return execFileSync('git', args, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return '';
	}
}

/**
 * Extracts a concise title from a markdown comment if no explicit title field is present.
 */
function extractTitle(comment = '') {
	const firstLine = comment.trim().split('\n')[0] || '';
	return firstLine.replace(/^\*\*|\*\*$/g, '').trim();
}

/**
 * Normalizes a single CodeRabbit finding from either the CLI store or the VS Code Extension store.
 */
function normalizeFinding(raw, fallbackFile = '') {
	const fileName = raw.fileName || raw.filename || fallbackFile || '';
	const startLine = raw.startLine ?? raw.lineRange?.start ?? null;
	const endLine = raw.endLine ?? raw.lineRange?.end ?? startLine;
	const comment = raw.comment || '';
	return {
		id: raw.id || '',
		fileName,
		startLine,
		endLine,
		severity: raw.severity || 'info',
		type: raw.type || 'actionable',
		title: raw.title || extractTitle(comment),
		comment,
		codegenInstructions: raw.codegenInstructions || '',
		diff: raw.diff || '',
		originalLines: Array.isArray(raw.originalLines) ? raw.originalLines : [],
		suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
		indicatorTypes: Array.isArray(raw.indicatorTypes) ? raw.indicatorTypes : [],
		fingerprint: raw.fingerprint || '',
	};
}

/**
 * Returns dirty/untracked files in the working tree along with their last-modified timestamp (ms).
 */
function getWorkingTreeDirtyFiles(repoRoot) {
	let raw = '';
	try {
		raw = execFileSync('git', ['status', '--porcelain', '-uall', '-z'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
	} catch {
		return [];
	}
	if (!raw) return [];

	const parts = raw.split('\0');
	const files = [];
	for (let i = 0; i < parts.length; i++) {
		const entry = parts[i];
		if (!entry || entry.length < 4) continue;
		const code = entry.slice(0, 2);
		const relPath = entry.slice(3);

		// In porcelain -z, rename/copy outputs: XY <destPath>\0<origPath>\0
		if (code.includes('R') || code.includes('C')) {
			i++; // skip origPath
		}

		const isDeleted = code.includes('D');
		if (isDeleted) {
			files.push({
				fileName: relPath,
				isDeleted: true,
				mtimeMs: Infinity,
			});
			continue;
		}

		const absPath = path.resolve(repoRoot, relPath);
		try {
			if (fs.existsSync(absPath)) {
				const stat = fs.statSync(absPath);
				if (stat.isFile()) {
					files.push({
						fileName: relPath,
						isDeleted: false,
						mtimeMs: Math.round(stat.mtimeMs),
					});
				}
			}
		} catch {
			// Ignore stat errors
		}
	}
	return files;
}

/**
 * Evaluates whether a saved review session is stale relative to current HEAD and working tree edits.
 */
function evaluateStaleness(session, currentHead, dirtyFiles) {
	const staleReasons = [];
	const isHeadMatch = Boolean(currentHead && session.headCommitId === currentHead);

	if (!session.timestamp || typeof session.timestamp !== 'number' || isNaN(session.timestamp) || session.timestamp <= 0) {
		staleReasons.push('Session lacks a valid completion timestamp (unknown freshness)');
	}
	if (!currentHead) {
		staleReasons.push('Current HEAD commit is unavailable (unknown freshness)');
	} else if (!session.headCommitId) {
		staleReasons.push('Session lacks reviewed commit ID');
	} else if (!isHeadMatch) {
		staleReasons.push(`HEAD commit changed since review (${session.headCommitId.slice(0, 8)} -> ${currentHead.slice(0, 8)})`);
	}

	const modifiedSinceReview = [];
	const deletedFiles = [];
	for (const df of dirtyFiles) {
		if (df.isDeleted) {
			if (session.reviewedDeletions && session.reviewedDeletions.has(df.fileName)) {
				continue;
			}
			deletedFiles.push(df.fileName);
			modifiedSinceReview.push(`${df.fileName} (deleted)`);
		} else if (session.timestamp && df.mtimeMs > session.timestamp) {
			modifiedSinceReview.push(df.fileName);
		}
	}

	if (deletedFiles.length > 0) {
		staleReasons.push(`${deletedFiles.length} tracked file(s) deleted in working tree`);
	}
	const editedCount = modifiedSinceReview.length - deletedFiles.length;
	if (editedCount > 0) {
		staleReasons.push(`${editedCount} working-tree file(s) modified after this review completed`);
	}

	return {
		isHeadMatch,
		isStale: staleReasons.length > 0,
		staleReasons,
		modifiedFilesSinceReview: modifiedSinceReview,
	};
}

/**
 * Scans ~/.coderabbit/reviews for completed CLI reviews matching the repository.
 */
function scanCliReviews(homeDir, repoRoot, currentBranch, allBranches = false) {
	const reviewsBase = path.join(homeDir, '.coderabbit', 'reviews');
	if (!fs.existsSync(reviewsBase)) return [];

	const sessions = [];
	const ignoredFiles = new Set(['git.json', 'incrementalDiff.v2.json', 'internalState.json']);

	function walk(dir) {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			if (!ent.isDirectory()) continue;
			if (ent.name === 'reviews') {
				const reviewsDir = path.join(dir, ent.name);
				let revDirs;
				try {
					revDirs = fs.readdirSync(reviewsDir, { withFileTypes: true });
				} catch {
					continue;
				}
				for (const rev of revDirs) {
					if (!rev.isDirectory()) continue;
					const sessionDir = path.join(reviewsDir, rev.name);
					const gitFile = path.join(sessionDir, 'git.json');
					const completeFile = path.join(sessionDir, '.session-complete-v2');
					if (!fs.existsSync(gitFile)) continue;

					let gitMeta;
					try {
						gitMeta = JSON.parse(fs.readFileSync(gitFile, 'utf8'));
					} catch {
						continue;
					}

					if (repoRoot && (!gitMeta.workingDirectory || path.resolve(gitMeta.workingDirectory) !== path.resolve(repoRoot))) {
						continue;
					}
					if (!allBranches && currentBranch && gitMeta.currentBranch && gitMeta.currentBranch !== currentBranch) {
						continue;
					}

					let isComplete = false;
					if (fs.existsSync(completeFile)) {
						try {
							const comp = JSON.parse(fs.readFileSync(completeFile, 'utf8'));
							isComplete = comp.state === 'complete';
						} catch {
							isComplete = false;
						}
					}
					if (!isComplete) continue;

					const findings = [];
					const reviewedDeletions = new Set();
					const incDiffFile = path.join(sessionDir, 'incrementalDiff.v2.json');
					if (fs.existsSync(incDiffFile)) {
						try {
							const inc = JSON.parse(fs.readFileSync(incDiffFile, 'utf8'));
							if (Array.isArray(inc)) {
								for (const item of inc) {
									const fn = item.filename || item.fileName;
									if (fn && item.diff && item.diff.includes('deleted file mode')) {
										reviewedDeletions.add(fn);
									}
								}
							}
						} catch {
							// Ignore diff parse error
						}
					}

					let files;
					try {
						files = fs.readdirSync(sessionDir, { withFileTypes: true });
					} catch {
						continue;
					}

					for (const f of files) {
						if (!f.isFile() || !f.name.endsWith('.json') || f.name.startsWith('.') || ignoredFiles.has(f.name)) {
							continue;
						}
						try {
							const item = JSON.parse(fs.readFileSync(path.join(sessionDir, f.name), 'utf8'));
							if (item && (item.fileName || item.filename || item.comment)) {
								findings.push(normalizeFinding(item));
							}
						} catch {
							// Ignore malformed file
						}
					}

					const dirTs = Number(rev.name);
					const metaTs = Number(gitMeta.timestamp) || 0;
					const timestamp = !Number.isNaN(dirTs) && dirTs > 1e12
						? dirTs
						: (metaTs && metaTs < 1e11 ? metaTs * 1000 : metaTs);

					sessions.push({
						source: 'cli',
						reviewId: rev.name,
						timestamp,
						isoTime: timestamp ? new Date(timestamp).toISOString() : null,
						branch: gitMeta.currentBranch || currentBranch || '',
						baseBranch: gitMeta.baseBranch || '',
						headCommitId: gitMeta.head || '',
						baseCommitId: gitMeta.baseCommitId || '',
						reviewType: 'cli',
						storagePath: sessionDir,
						reviewedDeletions,
						findings,
					});
				}
			} else {
				walk(path.join(dir, ent.name));
			}
		}
	}

	walk(reviewsBase);
	return sessions;
}

/**
 * Candidate VS Code workspaceStorage base directories across Linux, macOS, and Windows.
 */
function getVsCodeWorkspaceStorageDirs(homeDir) {
	const candidates = [
		path.join(homeDir, '.config', 'Code', 'User', 'workspaceStorage'),
		path.join(homeDir, '.config', 'Antigravity', 'User', 'workspaceStorage'),
		path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
	];
	if (process.env.APPDATA) {
		candidates.push(path.join(process.env.APPDATA, 'Code', 'User', 'workspaceStorage'));
	}
	return candidates.filter(d => fs.existsSync(d));
}

/**
 * Scans VS Code workspaceStorage for completed CodeRabbit extension reviews matching the repository.
 */
function scanVsCodeReviews(homeDir, repoRoot, currentBranch, allBranches = false) {
	const storageBases = getVsCodeWorkspaceStorageDirs(homeDir);
	const sessions = [];

	for (const base of storageBases) {
		let wsDirs;
		try {
			wsDirs = fs.readdirSync(base, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const ws of wsDirs) {
			if (!ws.isDirectory()) continue;
			const crDir = path.join(base, ws.name, 'coderabbit.coderabbit-vscode');
			if (!fs.existsSync(crDir)) continue;

			const categoriesFile = path.join(crDir, 'categories.json');
			const fileToBranch = new Map();
			if (fs.existsSync(categoriesFile) && repoRoot) {
				try {
					const cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
					const prefix = `${repoRoot}-`;
					const suffix = '-reviews';
					for (const key of Object.keys(cats)) {
						if (key.startsWith(prefix) && key.endsWith(suffix)) {
							const branch = key.slice(prefix.length, -suffix.length);
							const hash = crypto.createHash('sha256').update(key).digest('hex') + '.json';
							fileToBranch.set(hash, branch);
						}
					}
				} catch {
					// Ignore categories parse error
				}
			}

			let files;
			try {
				files = fs.readdirSync(crDir, { withFileTypes: true });
			} catch {
				continue;
			}

			for (const f of files) {
				if (!f.isFile() || !f.name.endsWith('.json') || f.name === 'categories.json') continue;
				const fullPath = path.join(crDir, f.name);
				let stat;
				try {
					stat = fs.statSync(fullPath);
				} catch {
					continue;
				}
				if (stat.size < 50) continue;

				let parsed;
				try {
					parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
				} catch {
					continue;
				}

				if (!Array.isArray(parsed)) continue;

				for (const entry of parsed) {
					if (!entry || typeof entry !== 'object') continue;
					const wsRoot = entry.checkpoint?.workspaceRoot;
					const matchesCategory = fileToBranch.has(f.name);
					if (repoRoot) {
						if (wsRoot) {
							if (path.resolve(wsRoot) !== path.resolve(repoRoot)) continue;
						} else if (!matchesCategory) {
							continue;
						}
					}
					if (entry.status !== 'completed' && entry.completion?.outcome !== 'completed') {
						continue;
					}

					const inferredBranch = entry.branch || fileToBranch.get(f.name) || currentBranch || '';
					if (!allBranches && currentBranch && inferredBranch && inferredBranch !== currentBranch) {
						continue;
					}

					const seenIds = new Set();
					const findings = [];
					const reviewedDeletions = new Set();

					if (entry.fileReviewMap && typeof entry.fileReviewMap === 'object') {
						for (const [filePath, fileData] of Object.entries(entry.fileReviewMap)) {
							if (fileData?.status === 'deleted' || fileData?.isDeleted) {
								reviewedDeletions.add(filePath);
							}
							if (!fileData || !Array.isArray(fileData.comments)) continue;
							for (const c of fileData.comments) {
								if (!c || typeof c !== 'object') continue;
								const norm = normalizeFinding(c, filePath);
								if (norm.id) seenIds.add(norm.id);
								findings.push(norm);
							}
						}
					}

					const assertiveMap = entry.additionalDetails?.assertiveComments;
					if (assertiveMap && typeof assertiveMap === 'object') {
						for (const [filePath, comments] of Object.entries(assertiveMap)) {
							if (!Array.isArray(comments)) continue;
							for (const c of comments) {
								if (!c || typeof c !== 'object') continue;
								if (c.id && seenIds.has(c.id)) continue;
								const norm = normalizeFinding(c, filePath);
								if (norm.id) seenIds.add(norm.id);
								findings.push(norm);
							}
						}
					}

					let timestamp = 0;
					if (typeof entry.timestamp === 'number' && entry.timestamp > 0) {
						timestamp = entry.timestamp < 1e11 ? entry.timestamp * 1000 : entry.timestamp;
						if (Number.isNaN(new Date(timestamp).getTime())) continue;
					} else if (typeof entry.timestamp === 'string' && entry.timestamp.trim() !== '' && entry.timestamp !== '0') {
						timestamp = Date.parse(entry.timestamp) || 0;
					}

					if (!timestamp && entry.endedAt) {
						timestamp = Date.parse(entry.endedAt) || 0;
					}
					if (!timestamp && entry.startedAt) {
						timestamp = Date.parse(entry.startedAt) || 0;
					}

					if (timestamp && Number.isNaN(new Date(timestamp).getTime())) {
						continue;
					}

					sessions.push({
						source: 'vscode',
						reviewId: entry.id || f.name.replace(/\.json$/, ''),
						timestamp,
						isoTime: timestamp ? new Date(timestamp).toISOString() : null,
						branch: inferredBranch,
						baseBranch: '',
						headCommitId: entry.headCommitId || '',
						baseCommitId: entry.baseCommitId || '',
						reviewType: entry.checkpoint?.reviewType || 'all',
						storagePath: fullPath,
						reviewedDeletions,
						findings,
					});
				}
			}
		}
	}

	return sessions;
}

/**
 * Reads local CodeRabbit review findings from both the CodeRabbit CLI store (~/.coderabbit/reviews)
 * and the VS Code CodeRabbit extension store (~/.config/Code/User/workspaceStorage/.../coderabbit.coderabbit-vscode).
 *
 * Usage:
 *   tempo-cli review-local [--json] [--cli] [--vscode] [--list] [--all-branches]
 */
export async function reviewLocal(args = []) {
	const jsonOutput = args.includes('--json');
	const cliOnly = args.includes('--cli');
	const vscodeOnly = args.includes('--vscode');
	const listAll = args.includes('--list');
	const allBranches = args.includes('--all-branches');

	const homeDir = os.homedir();
	const repoRoot = runGit(['rev-parse', '--show-toplevel']) || process.cwd();
	const currentBranch = runGit(['branch', '--show-current']);
	const currentHead = runGit(['rev-parse', 'HEAD']);
	const dirtyFiles = getWorkingTreeDirtyFiles(repoRoot);

	const cliSessions = vscodeOnly ? [] : scanCliReviews(homeDir, repoRoot, currentBranch, allBranches);
	const vscodeSessions = cliOnly ? [] : scanVsCodeReviews(homeDir, repoRoot, currentBranch, allBranches);

	const allSessions = [...cliSessions, ...vscodeSessions].sort((a, b) => b.timestamp - a.timestamp);

	if (listAll) {
		const summaries = allSessions.map(s => {
			const staleness = evaluateStaleness(s, currentHead, dirtyFiles);
			return {
				source: s.source,
				reviewId: s.reviewId,
				timestamp: s.timestamp,
				isoTime: s.isoTime,
				branch: s.branch,
				baseBranch: s.baseBranch,
				reviewType: s.reviewType,
				headCommitId: s.headCommitId,
				baseCommitId: s.baseCommitId,
				isHeadMatch: staleness.isHeadMatch,
				isStale: staleness.isStale,
				staleReasons: staleness.staleReasons,
				findingsCount: s.findings.length,
			};
		});

		if (jsonOutput) {
			console.log(JSON.stringify({ sessionsCount: summaries.length, sessions: summaries }, null, 2));
			return;
		}

		console.log(`\n======================================================`);
		console.log(`Saved Local CodeRabbit Review Sessions (${summaries.length})`);
		console.log(`======================================================\n`);
		if (summaries.length === 0) {
			console.log('No saved local CodeRabbit review sessions found for this repository/branch.\n');
			return;
		}
		for (const s of summaries) {
			const ageMins = s.timestamp ? Math.round((Date.now() - s.timestamp) / 60000) : null;
			const ageLabel = ageMins !== null ? `${ageMins}m ago` : 'unknown time';
			const statusLabel = s.isStale ? '⚠️ STALE' : '✅ CURRENT';
			console.log(`  • [${s.source.toUpperCase()}] ${s.isoTime || s.reviewId} (${ageLabel}) — ${s.findingsCount} finding(s) | ${statusLabel} | head: ${s.headCommitId ? s.headCommitId.slice(0, 8) : 'n/a'}`);
		}
		console.log('');
		return;
	}

	const latest = allSessions[0] || null;

	if (!latest) {
		if (jsonOutput) {
			console.log(JSON.stringify({
				found: false,
				repoRoot,
				currentBranch,
				currentHead,
				findingsCount: 0,
				findings: [],
			}, null, 2));
			return;
		}
		console.log(`\n======================================================`);
		console.log(`Local CodeRabbit Review Findings`);
		console.log(`======================================================\n`);
		console.log(`⚠️  No saved local CodeRabbit review found for branch "${currentBranch || 'HEAD'}".`);
		console.log(`Run "npm run review:agent" in your terminal or start a review in the VS Code CodeRabbit sidebar first.\n`);
		return;
	}

	const ageMinutes = latest.timestamp ? Math.round((Date.now() - latest.timestamp) / 60000) : null;
	const staleness = evaluateStaleness(latest, currentHead, dirtyFiles);

	if (jsonOutput) {
		console.log(JSON.stringify({
			found: true,
			source: latest.source,
			reviewId: latest.reviewId,
			timestamp: latest.timestamp,
			isoTime: latest.isoTime,
			ageMinutes,
			branch: latest.branch,
			baseBranch: latest.baseBranch,
			reviewType: latest.reviewType,
			headCommitId: latest.headCommitId,
			baseCommitId: latest.baseCommitId,
			currentHead,
			isHeadMatch: staleness.isHeadMatch,
			isStale: staleness.isStale,
			staleReasons: staleness.staleReasons,
			modifiedFilesSinceReview: staleness.modifiedFilesSinceReview,
			findingsCount: latest.findings.length,
			findings: latest.findings,
			availableSessions: allSessions.map(s => ({
				source: s.source,
				reviewId: s.reviewId,
				isoTime: s.isoTime,
				baseBranch: s.baseBranch,
				reviewType: s.reviewType,
				findingsCount: s.findings.length,
			})),
		}, null, 2));
		return;
	}

	console.log(`\n======================================================`);
	console.log(`Local CodeRabbit Review Findings [${latest.source.toUpperCase()}]`);
	console.log(`Review ID: ${latest.reviewId} | Time: ${latest.isoTime || 'unknown'} (${ageMinutes !== null ? `${ageMinutes}m ago` : 'n/a'})`);
	console.log(`Branch: ${latest.branch || currentBranch} | Head: ${latest.headCommitId ? latest.headCommitId.slice(0, 8) : 'n/a'}${staleness.isHeadMatch ? ' (matches HEAD)' : ` (current HEAD: ${currentHead.slice(0, 8)})`}`);
	console.log(`Status: ${staleness.isStale ? `⚠️  STALE (${staleness.staleReasons.join('; ')})` : '✅ CURRENT'}`);
	console.log(`Findings Summary: ${latest.findings.length} finding(s)`);
	console.log(`======================================================\n`);

	if (latest.findings.length === 0) {
		console.log('✅ No findings reported in the latest local CodeRabbit review.\n');
		return;
	}

	for (let i = 0; i < latest.findings.length; i++) {
		const f = latest.findings[i];
		const lineRange = f.startLine
			? (f.endLine && f.endLine !== f.startLine ? `:${f.startLine}-${f.endLine}` : `:${f.startLine}`)
			: '';
		console.log(`--- [Finding ${i + 1}/${latest.findings.length}] [${f.severity.toUpperCase()}] ---`);
		console.log(`File: ${f.fileName}${lineRange}`);
		if (f.title) console.log(`Title: ${f.title}`);
		console.log(`\n${f.comment.trim()}\n`);
	}
}
