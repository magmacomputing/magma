import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let repoRoot = null;
function getRepoRoot() {
	if (repoRoot === null) {
		try {
			repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		} catch {
			repoRoot = '';
		}
	}
	return repoRoot;
}

function resolveExistingPath(candidate) {
	if (!candidate) return null;
	const root = getRepoRoot();
	const toTest = [];
	try {
		toTest.push(decodeURIComponent(candidate));
	} catch {}
	toTest.push(candidate);

	for (const p of toTest) {
		if (existsSync(p)) return p;
		if (root && existsSync(path.resolve(root, p))) return p;
	}
	return null;
}

/**
 * Executes a gh CLI command and returns trimmed stdout.
 */
function runGh(args) {
	try {
		return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 }).trim();
	} catch (err) {
		const stderr = err.stderr ? err.stderr.toString().trim() : '';
		throw new Error(stderr || err.message);
	}
}

/**
 * Parses top-level review body comments (Follow-up, Nitpicks, Additional comments).
 */
function parseTopLevelReviewComments(rawBody) {
	if (!rawBody) return [];

	// Strip markdown blockquote prefixes ("> ") from callout alert blocks so HTML tags parse cleanly
	const normalized = rawBody.replace(/^[ \t]*>[ \t]?/gm, '');

	const sectionSpecs = [
		{ type: 'Follow-up', pattern: /(?:##\s*Follow-up\s*Comments|<summary>(?:<picture>.*?<\/picture>\s*)?Follow-up[\s\S]*?<\/summary>)/i },
		{ type: 'Nitpick', pattern: /<summary>(?:<picture>.*?<\/picture>\s*)?[^\w]*Nitpick comments[\s\S]*?<\/summary>/i },
		{ type: 'Additional', pattern: /<summary>(?:<picture>.*?<\/picture>\s*)?[^\w]*Additional comments[\s\S]*?<\/summary>/i },
	];

	const sectionStarts = [];
	for (const s of sectionSpecs) {
		const m = normalized.match(s.pattern);
		if (m) sectionStarts.push({ type: s.type, index: m.index });
	}

	sectionStarts.sort((a, b) => a.index - b.index);
	if (sectionStarts.length === 0) return [];

	const endMarkers = [
		'<!-- autofix_checkbox_start -->',
		'<summary>Review info',
		'<summary><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/info.svg"',
		'## Review metadata'
	];

	const lastSecStart = sectionStarts.length > 0 ? sectionStarts[sectionStarts.length - 1].index : 0;

	let overallEnd = normalized.length;
	for (const marker of endMarkers) {
		const idx = normalized.indexOf(marker, lastSecStart);
		if (idx !== -1 && idx < overallEnd) overallEnd = idx;
	}

	const itemRegex = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>/gi;
	itemRegex.lastIndex = lastSecStart;
	let lastItemEnd = lastSecStart;
	let imSearch;
	while ((imSearch = itemRegex.exec(normalized)) !== null) {
		if (imSearch.index >= overallEnd) break;
		const summaryText = imSearch[1].replace(/<[^>]+>/g, '').trim();
		if (/^[^\w]*(?:Follow-up\s*\(\d+\)|Minor\s*\(\d+\)|Major\s*\(\d+\)|Nitpick comments|Additional comments|Suggested\s*(?:fix|changes|code|diff)?\b|🧪|Prompt for|Supported by|Review info|Run configuration|Files selected|Commits)/i.test(summaryText)) {
			continue;
		}
		const closeTag = normalized.indexOf('</details>', imSearch.index);
		if (closeTag !== -1 && closeTag < overallEnd) {
			lastItemEnd = Math.max(lastItemEnd, closeTag + '</details>'.length);
		}
	}

	const findings = [];

	for (let s = 0; s < sectionStarts.length; s++) {
		const sec = sectionStarts[s];
		const nextStart = s + 1 < sectionStarts.length ? sectionStarts[s + 1].index : overallEnd;
		const secChunk = normalized.slice(sec.index, nextStart);

		const fileItemRegex = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>/gi;
		const itemPositions = [];
		let im;
		while ((im = fileItemRegex.exec(secChunk)) !== null) {
			const summaryText = im[1].replace(/<[^>]+>/g, '').trim();
			if (/^[^\w]*(?:Follow-up\s*\(\d+\)|Minor\s*\(\d+\)|Major\s*\(\d+\)|Nitpick comments|Additional comments|Suggested\s*(?:fix|changes|code|diff)?\b|🧪|Prompt for|Supported by|Review info|Run configuration|Files selected|Commits)/i.test(summaryText)) {
				continue;
			}
			itemPositions.push({ summary: summaryText, index: im.index });
		}

		for (let i = 0; i < itemPositions.length; i++) {
			const item = itemPositions[i];
			const itemEnd = i + 1 < itemPositions.length ? itemPositions[i + 1].index : secChunk.length;
			const itemBlock = secChunk.slice(item.index, itemEnd);

			let filePath = '';
			let line = null;

			const reviewAtMatch = itemBlock.match(/Review comment at\s+@(.+?)(?:\s+around lines|\s+at line)\s+(\d+)(?:\s*-\s*(\d+))?/);
			if (reviewAtMatch) {
				filePath = reviewAtMatch[1];
				line = reviewAtMatch[3] ? `${reviewAtMatch[2]}-${reviewAtMatch[3]}` : reviewAtMatch[2];
			}

			if (!filePath) {
				const sumPath = item.summary.match(/^\s*(?:[a-zA-Z]+\s+)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)(?:\s*[:\-]\s*(\d+(?:-\d+)?))?(?:\s*[:\-]\s+.*|\s*$)/);
				const allowedRootExt = /\.(?:[mc]?[jt]sx?|json|ya?ml|md|toml)$/i;
				if (sumPath && (sumPath[1].includes('/') || allowedRootExt.test(sumPath[1]))) {
					const candidate = sumPath[1].trim();
					filePath = candidate;
					if (sumPath[2] && !line) line = sumPath[2];
				}
			}

			const ghBlobMatch = itemBlock.match(/(?:https?:\/\/)?github\.com\/[^\/]+\/[^\/]+\/blob\/([^#?\s)]+)(?:\?[^#\s)]*)?(?:#L(\d+(?:-L\d+)?))?/);
			let blobFilePath = '';
			let blobLine = null;
			if (ghBlobMatch) {
				const blobUrl = ghBlobMatch[0];
				const afterBlob = ghBlobMatch[1];
				blobLine = ghBlobMatch[2] ? ghBlobMatch[2].replace(/-L/, '-') : null;

				const segments = afterBlob.split('/');
				for (let s = 1; s < segments.length; s++) {
					const candidate = segments.slice(s).join('/');
					const resolved = resolveExistingPath(candidate);
					if (resolved) {
						blobFilePath = resolved;
						break;
					}
				}
				if (!blobFilePath) {
					try {
						blobFilePath = decodeURIComponent(segments.slice(1).join('/'));
					} catch {
						blobFilePath = blobUrl;
					}
				}
			}

			if (!filePath && blobFilePath) {
				filePath = blobFilePath;
			}
			if (filePath && blobFilePath === filePath && !line && blobLine) {
				line = blobLine;
			}

			if (!filePath) {
				for (const backtickMatch of itemBlock.matchAll(/`([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)(?::(\d+(?:-\d+)?))?`/g)) {
					const candidate = backtickMatch[1];
					if (candidate.includes('/')) {
						const resolved = resolveExistingPath(candidate);
						if (resolved) {
							filePath = resolved;
							if (backtickMatch[2] && !line) line = backtickMatch[2];
							break;
						}
					}
				}
			}

			if (!line) {
				const lineMatch = itemBlock.match(/`(\d+(?:-\d+)?)`:/);
				if (lineMatch) line = lineMatch[1];
			}

			if (!filePath) continue;

			const crId = itemBlock.match(/<!-- cr-comment:v1:([0-9a-fA-F]+) -->/);
			const commentId = crId ? `cr_${crId[1]}` : null;

			const cleanBody = itemBlock
				.replace(/<details[^>]*>\s*<summary[\s\S]*?<\/summary>\s*<blockquote>/i, '')
				.replace(/<\/blockquote>\s*<\/details>\s*$/i, '')
				.trim();

			findings.push({
				path: filePath,
				line: line,
				title: item.summary,
				category: sec.type,
				commentId,
				body: cleanBody,
				isFollowUp: true,
			});
		}
	}

	return findings;
}

/**
 * Fetches and displays unresolved CodeRabbit review findings from the open PR.
 *
 * Usage:
 *   tempo-cli review-pr [--json]
 */
export async function reviewPr(args = []) {
	const jsonOutput = args.includes('--json');

	try {
		const prInfoRaw = runGh(['pr', 'view', '--json', 'number,title,headRefName,url,headRepository,headRepositoryOwner']);
		const prInfo = JSON.parse(prInfoRaw);

		const urlMatch = prInfo.url?.match(/\/([^/]+)\/([^/]+)\/pull\/\d+/);
		const repoOwner = urlMatch ? urlMatch[1] : prInfo.headRepositoryOwner?.login;
		const repoName = urlMatch ? urlMatch[2] : prInfo.headRepository?.name;

		if (!repoOwner || !repoName) {
			throw new Error('Could not determine base repository owner and name from selected PR.');
		}

		const threadsQuery = `
query($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          isResolved
          path
          line
          comments(first: 10) {
            nodes {
              id
              author { login }
              body
              createdAt
            }
          }
        }
      }
    }
  }
}`;

		const reviewsQuery = `
query($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviews(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          author { login }
          submittedAt
          body
        }
      }
    }
  }
}`;

		let hasNextPage = true;
		let afterCursor = null;
		const allThreads = [];

		while (hasNextPage) {
			const gqlArgs = [
				'api',
				'graphql',
				'-f', `query=${threadsQuery}`,
				'-f', `owner=${repoOwner}`,
				'-f', `repo=${repoName}`,
				'-F', `pr=${prInfo.number}`,
			];
			if (afterCursor) {
				gqlArgs.push('-f', `after=${afterCursor}`);
			}

			const gqlRaw = runGh(gqlArgs);

			const data = JSON.parse(gqlRaw);
			const pullRequest = data?.data?.repository?.pullRequest;
			if (!pullRequest) {
				throw new Error(`Pull request #${prInfo.number} not found in repository ${repoOwner}/${repoName}.`);
			}

			const reviewThreads = pullRequest.reviewThreads;
			const pageThreads = reviewThreads?.nodes ?? [];
			allThreads.push(...pageThreads);

			hasNextPage = Boolean(reviewThreads?.pageInfo?.hasNextPage);
			afterCursor = reviewThreads?.pageInfo?.endCursor ?? null;

			if (hasNextPage && !afterCursor) {
				throw new Error(`Review-thread pagination failed: hasNextPage is true but no endCursor was returned for PR #${prInfo.number}.`);
			}
		}

		let hasNextReviewsPage = true;
		let afterReviewsCursor = null;
		const allReviews = [];
		let reviewsError = null;

		try {
			while (hasNextReviewsPage) {
				const gqlArgs = [
					'api',
					'graphql',
					'-f', `query=${reviewsQuery}`,
					'-f', `owner=${repoOwner}`,
					'-f', `repo=${repoName}`,
					'-F', `pr=${prInfo.number}`,
				];
				if (afterReviewsCursor) {
					gqlArgs.push('-f', `after=${afterReviewsCursor}`);
				}

				const gqlRaw = runGh(gqlArgs);

				const data = JSON.parse(gqlRaw);
				const pullRequest = data?.data?.repository?.pullRequest;
				if (!pullRequest) {
					throw new Error(`Pull request #${prInfo.number} not found in repository ${repoOwner}/${repoName}.`);
				}

				const reviews = pullRequest.reviews;
				const pageReviews = reviews?.nodes ?? [];
				allReviews.push(...pageReviews);

				hasNextReviewsPage = Boolean(reviews?.pageInfo?.hasNextPage);
				afterReviewsCursor = reviews?.pageInfo?.endCursor ?? null;

				if (hasNextReviewsPage && !afterReviewsCursor) {
					throw new Error(`Reviews pagination failed: hasNextPage is true but no endCursor was returned for PR #${prInfo.number}.`);
				}
			}
		} catch (err) {
			reviewsError = err;
		}

		const unresolved = allThreads.filter(t => !t.isResolved);

		const threadFindings = [];
		for (const t of unresolved) {
			const crComment = t.comments.nodes.find(
				c => c.author?.login === 'coderabbitai' || c.author?.login === 'coderabbitai[bot]'
			);
			if (crComment) {
				threadFindings.push({
					threadId: t.id,
					path: t.path,
					line: t.line,
					commentId: crComment.id,
					body: crComment.body,
					isFollowUp: false,
				});
			}
		}

		// Parse top-level review comments (Follow-up, Nitpick, Additional) from the latest CodeRabbit review
		const latestCrReview = allReviews
			.slice()
			.reverse()
			.find(r => (r.author?.login === 'coderabbitai' || r.author?.login === 'coderabbitai[bot]') && r.body && r.body.trim().length > 0);

		const topLevelFindings = latestCrReview ? parseTopLevelReviewComments(latestCrReview.body) : [];

		const findings = [...threadFindings, ...topLevelFindings];

		if (jsonOutput) {
			console.log(JSON.stringify({
				pr: prInfo,
				findingsCount: findings.length,
				unresolvedThreadsCount: threadFindings.length,
				topLevelCommentsCount: topLevelFindings.length,
				findings,
				...(reviewsError ? { followUpError: reviewsError.message } : {})
			}, null, 2));
			if (reviewsError) {
				console.error(`\n⚠️  Warning: Failed to fetch follow-up reviews: ${reviewsError.message}\n`);
				process.exitCode = 1;
			}
			return;
		}

		console.log(`\n======================================================`);
		console.log(`CodeRabbit PR Findings: PR #${prInfo.number} (${prInfo.title})`);
		console.log(`Branch: ${prInfo.headRefName} | URL: ${prInfo.url}`);
		console.log(`Findings Summary: ${findings.length} total (${threadFindings.length} unresolved inline thread(s), ${topLevelFindings.length} top-level review comment(s) - resolution not tracked)`);
		console.log(`======================================================\n`);

		if (findings.length === 0) {
			console.log('✅ No unresolved CodeRabbit findings found on this PR.\n');
			if (reviewsError) {
				console.error(`⚠️  Warning: Failed to fetch follow-up reviews: ${reviewsError.message}\n`);
				process.exitCode = 1;
			}
			return;
		}

		for (let i = 0; i < findings.length; i++) {
			const f = findings[i];
			const typeTag = f.isFollowUp ? (f.category ? ` (${f.category})` : ' (Top-level Review)') : '';
			console.log(`--- [Finding ${i + 1}/${findings.length}${typeTag}] ---`);
			console.log(`File: ${f.path}${f.line ? `:${f.line}` : ''}`);
			if (f.threadId) console.log(`Thread ID: ${f.threadId}`);
			if (f.commentId) console.log(`Comment ID: ${f.commentId}`);
			if (f.title) console.log(`Title: ${f.title}`);
			console.log(`\n${f.body.trim()}\n`);
		}

		if (reviewsError) {
			console.error(`⚠️  Warning: Failed to fetch follow-up reviews: ${reviewsError.message}\n`);
			process.exitCode = 1;
		}
	} catch (err) {
		console.error(`Error fetching PR review findings: ${err.message}`);
		process.exit(1);
	}
}
