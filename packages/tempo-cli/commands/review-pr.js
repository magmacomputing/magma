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

function fileExistsInRef(ref, filePath) {
	if (!ref || !filePath) return false;
	try {
		execFileSync('git', ['cat-file', '-e', `${ref}:${filePath}`], { stdio: ['ignore', 'ignore', 'ignore'] });
		return true;
	} catch {
		return false;
	}
}

function resolveExistingPath(candidate, ref = null) {
	if (!candidate) return null;
	const root = getRepoRoot();
	const toTest = [];
	try {
		toTest.push(decodeURIComponent(candidate));
	} catch { }
	toTest.push(candidate);

	for (const p of toTest) {
		if (!root) {
			if (existsSync(p)) return p;
			continue;
		}
		for (const abs of [path.resolve(root, p), path.resolve(p)]) {
			const rel = path.relative(root, abs);
			if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
			if (existsSync(abs)) return rel.split(path.sep).join('/');
			if (ref) {
				const gitRel = rel.split(path.sep).join('/');
				if (fileExistsInRef(ref, gitRel)) return gitRel;
			}
		}
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
 * Reusable Markdown and token subpatterns.
 */
const FENCE_BLOCK_SOURCE = '(?:^[ \\t]*(`{3,}|~{3,})[^\\n]*\\n[\\s\\S]*?\\n[ \\t]*\\1[`~]*[ \\t]*(?:\\n|$))';
const INLINE_FENCE_SOURCE = '(?:`{3,}[^\\n]*?`{3,})';
const FENCE_SKIP_PREFIX = `${FENCE_BLOCK_SOURCE}|${INLINE_FENCE_SOURCE}`;
const FENCE_MASK_REGEX = new RegExp(FENCE_SKIP_PREFIX, 'gm');

const FILE_PATH_SOURCE = '([a-zA-Z0-9_\\-./@]+\\.[a-zA-Z0-9]+)';
const LINE_RANGE_SOURCE = '(\\d+(?:-\\d+)?)';

/**
 * Patterns for parsing review comments, summaries, and Markdown constructs.
 */
const BLOCKQUOTE_PREFIX_REGEX = /^[ \t]*>[ \t]?/gm;
const HTML_TAG_REGEX = /<[^>]+>/g;
const ALLOWED_ROOT_EXT_PATTERN = /\.(?:[mc]?[jt]sx?|json|ya?ml|md|toml)$/i;

const FOLLOW_UP_SECTION_PATTERN = /(?:##\s*Follow-up\s*Comments|<summary>(?:<picture>[\s\S]*?<\/picture>\s*)?Follow-up[\s\S]*?<\/summary>)/i;
const NITPICK_SECTION_PATTERN = /<summary>(?:<picture>[\s\S]*?<\/picture>\s*)?[^\w]*Nitpick comments[\s\S]*?<\/summary>/i;
const ADDITIONAL_SECTION_PATTERN = /<summary>(?:<picture>[\s\S]*?<\/picture>\s*)?[^\w]*Additional comments[\s\S]*?<\/summary>/i;

const SUMMARY_EXCLUSION_PATTERN = /^[^\w]*(?:Follow-ups?\s*\(\d+\)|Minor\s*\(\d+\)|Major\s*\(\d+\)|Nitpick comments|Additional comments|Suggested\s*(?:fix|changes|code|diff)?\b|🧪|Prompt (?:for|to)\b|Supported by|Review info|Run configuration|Files selected|Commits\b)/i;

const ITEM_DETAILS_REGEX = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>/gi;
const CR_COMMENT_CLOSE_PATTERN = /<!--\s*cr-comment:[^>]+-->[\s\S]*?<\/details>/i;
const CR_COMMENT_ID_PATTERN = /<!-- cr-comment:v1:([0-9a-fA-F]+) -->/;

const DETAIL_TAG_REGEX = new RegExp(`${FENCE_SKIP_PREFIX}|(<\\/?details\\b[^>]*>)|(?:(\`+)[^\`\\n]*?\\3)`, 'gim');
const SECTION_TAG_REGEX = new RegExp(`${FENCE_SKIP_PREFIX}|(<\\/?details\\b[^>]*>|<summary[^>]*>([\\s\\S]*?)<\\/summary>)|(?:(\`+)[^\`\\n]*?\\4)`, 'gim');

const REVIEW_COMMENT_AT_PATTERN = /Review comment at\s+@(.+?)(?:\s+around lines|\s+at line)\s+(\d+)(?:\s*-\s*(\d+))?/;
const SUMMARY_FILE_PATH_PATTERN = new RegExp(`^\\s*(?:[a-zA-Z]+\\s+)?${FILE_PATH_SOURCE}(?:\\s*\\(\\d+\\)\\s*|(?:\\s*[:\\-]\\s*${LINE_RANGE_SOURCE})?(?:\\s*[:\\-]\\s+.*|\\s*$))`);
const GH_BLOB_URL_PATTERN = /(?:https?:\/\/)?github\.com\/[^\/]+\/[^\/]+\/blob\/([^#?\s)]+)(?:\?[^#\s)]*)?(?:#L(\d+(?:-L\d+)?))?/;
const GH_LINE_RANGE_SEPARATOR_REGEX = /-L/;
const BACKTICK_FILE_PATH_PATTERN = new RegExp(`\`${FILE_PATH_SOURCE}(?::${LINE_RANGE_SOURCE})?\``, 'g');
const LEADING_BODY_MARKUP_PATTERN = /^[\s\S]*?<\/summary>\s*(?:<(?:blockquote|dl|dd|p)[^>]*>\s*)*$/i;
const INLINE_LINE_NUMBER_PATTERN = new RegExp(`\`${LINE_RANGE_SOURCE}\`:`);

const CLEAN_BODY_PREFIX_PATTERN = /^\s*<summary[^>]*>[\s\S]*?<\/summary>\s*<blockquote>/i;
const CLEAN_BODY_SUFFIX_PATTERN = /<\/blockquote>\s*<\/details>\s*(?:<details[^>]*>\s*)?$/i;

const PR_URL_PATTERN = /\/([^/]+)\/([^/]+)\/pull\/\d+/;

/**
 * Parses top-level review body comments (Follow-up, Nitpicks, Additional comments).
 */
export function parseTopLevelReviewComments(rawBody, prRef = 'HEAD') {
	if (!rawBody) return [];

	// Strip markdown blockquote prefixes ("> ") from callout alert blocks so HTML tags parse cleanly
	const normalized = rawBody.replace(BLOCKQUOTE_PREFIX_REGEX, '');
	const masked = normalized.replace(FENCE_MASK_REGEX, m => m.replace(/[^\n]/g, ' '));

	const sectionSpecs = [
		{ type: 'Follow-up', pattern: FOLLOW_UP_SECTION_PATTERN },
		{ type: 'Nitpick', pattern: NITPICK_SECTION_PATTERN },
		{ type: 'Additional', pattern: ADDITIONAL_SECTION_PATTERN },
	];

	const sectionStarts = [];
	for (const s of sectionSpecs) {
		const m = masked.match(s.pattern);
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

	let scanLimit = normalized.length;
	ITEM_DETAILS_REGEX.lastIndex = lastSecStart;
	let lastItemEnd = lastSecStart;
	let imSearch;
	while ((imSearch = ITEM_DETAILS_REGEX.exec(masked)) !== null) {
		let markerIdx = -1;
		for (const marker of endMarkers) {
			const idx = masked.indexOf(marker, lastItemEnd);
			if (idx !== -1 && idx < imSearch.index + imSearch[0].length) {
				if (markerIdx === -1 || idx < markerIdx) markerIdx = idx;
			}
		}
		if (markerIdx !== -1) {
			scanLimit = markerIdx;
			break;
		}
		const summaryText = imSearch[1].replace(HTML_TAG_REGEX, '').trim();
		if (SUMMARY_EXCLUSION_PATTERN.test(summaryText)) {
			continue;
		}
		let closeEnd = -1;
		const slice = masked.slice(imSearch.index);
		const cr = slice.match(CR_COMMENT_CLOSE_PATTERN);
		if (cr) {
			closeEnd = imSearch.index + cr.index + cr[0].length;
		} else {
			let d = 0;
			DETAIL_TAG_REGEX.lastIndex = imSearch.index;
			let dMatch;
			while ((dMatch = DETAIL_TAG_REGEX.exec(masked)) !== null) {
				if (!dMatch[2]) continue;
				if (dMatch[2].startsWith('</details')) {
					d--;
					if (d <= 0) {
						closeEnd = dMatch.index + dMatch[0].length;
						break;
					}
				} else {
					d++;
				}
			}
		}
		if (closeEnd !== -1) {
			lastItemEnd = Math.max(lastItemEnd, closeEnd);
			ITEM_DETAILS_REGEX.lastIndex = closeEnd;
		}
	}

	let overallEnd = scanLimit;
	for (const marker of endMarkers) {
		const idx = masked.indexOf(marker, lastItemEnd);
		if (idx !== -1 && idx < overallEnd) overallEnd = idx;
	}

	const findings = [];

	for (let s = 0; s < sectionStarts.length; s++) {
		const sec = sectionStarts[s];
		const nextStart = s + 1 < sectionStarts.length ? sectionStarts[s + 1].index : overallEnd;
		const secChunk = normalized.slice(sec.index, nextStart);

		SECTION_TAG_REGEX.lastIndex = 0;
		const itemPositions = [];
		let depth = 0;
		let inDepthOneFinding = false;
		let im;
		while ((im = SECTION_TAG_REGEX.exec(secChunk)) !== null) {
			if (!im[2]) continue;
			const tag = im[2];
			if (tag.startsWith('</details')) {
				if (depth > 0) depth--;
				if (depth === 0) inDepthOneFinding = false;
			} else if (tag.startsWith('<details')) {
				depth++;
				if (depth === 1) inDepthOneFinding = false;
			} else if (im[3] !== undefined && (depth === 1 || (depth === 2 && !inDepthOneFinding))) {
				const summaryText = im[3].replace(HTML_TAG_REGEX, '').trim();
				if (SUMMARY_EXCLUSION_PATTERN.test(summaryText))
					continue;
				if (depth === 1) inDepthOneFinding = true;
				itemPositions.push({ summary: summaryText, index: im.index });
			}
		}

		for (let i = 0; i < itemPositions.length; i++) {
			const item = itemPositions[i];
			let itemEnd;
			if (i + 1 < itemPositions.length) {
				itemEnd = itemPositions[i + 1].index;
			} else if (s === sectionStarts.length - 1 && lastItemEnd > sec.index + item.index && lastItemEnd <= sec.index + secChunk.length) {
				itemEnd = lastItemEnd - sec.index;
			} else {
				itemEnd = secChunk.length;
			}
			const itemBlock = secChunk.slice(item.index, itemEnd);

			let filePath = '';
			let line = null;

			const reviewAtMatch = itemBlock.match(REVIEW_COMMENT_AT_PATTERN);
			if (reviewAtMatch) {
				filePath = reviewAtMatch[1];
				line = reviewAtMatch[3] ? `${reviewAtMatch[2]}-${reviewAtMatch[3]}` : reviewAtMatch[2];
			}

			if (!filePath) {
				const sumPath = item.summary.match(SUMMARY_FILE_PATH_PATTERN);
				if (sumPath && (sumPath[1].includes('/') || ALLOWED_ROOT_EXT_PATTERN.test(sumPath[1]))) {
					const candidate = sumPath[1].trim();
					filePath = candidate;
					if (sumPath[2] && !line) line = sumPath[2];
				}
			}

			let ghBlobMatch = null;
			const labeledBlobMatch = itemBlock.match(/\[(?:[^\]]*?([a-zA-Z0-9_\-./@]+\.[a-zA-Z0-9]+)[^\]]*?)\]\((https?:\/\/github\.com\/[^\/]+\/[^\/]+\/blob\/[^)]+)\)/i);
			if (labeledBlobMatch) {
				ghBlobMatch = labeledBlobMatch[2].match(GH_BLOB_URL_PATTERN);
			}
			if (!ghBlobMatch) {
				const prefixMatch = itemBlock.match(CLEAN_BODY_PREFIX_PATTERN);
				const headerRegion = itemBlock.slice(0, prefixMatch ? prefixMatch[0].length + 300 : 400);
				ghBlobMatch = headerRegion.match(GH_BLOB_URL_PATTERN);
			}
			if (!ghBlobMatch) {
				for (const m of itemBlock.matchAll(new RegExp(GH_BLOB_URL_PATTERN.source, 'g'))) {
					const candidatePath = m[1]?.split('/')?.pop();
					if (candidatePath && item.summary.includes(candidatePath)) {
						ghBlobMatch = m;
						break;
					}
				}
			}
			if (!ghBlobMatch) {
				ghBlobMatch = itemBlock.match(GH_BLOB_URL_PATTERN);
			}

			let blobFilePath = '';
			let blobLine = null;
			if (ghBlobMatch) {
				const blobUrl = ghBlobMatch[0];
				const afterBlob = ghBlobMatch[1];
				blobLine = ghBlobMatch[2] ? ghBlobMatch[2].replace(GH_LINE_RANGE_SEPARATOR_REGEX, '-') : null;

				const root = getRepoRoot();
				const segments = afterBlob.split('/');
				const splits = [];
				for (let s = 1; s < segments.length; s++) {
					const refCandidate = segments.slice(0, s).join('/');
					const resolved = resolveExistingPath(segments.slice(s).join('/'), refCandidate);
					if (resolved) splits.push({ refCandidate, resolved });
				}
				const localMatch = splits.find(({ refCandidate, resolved }) => !root || fileExistsInRef(refCandidate, resolved));
				const prMatches = root && prRef ? splits.filter(({ resolved }) => fileExistsInRef(prRef, resolved)) : [];
				if (localMatch) blobFilePath = localMatch.resolved;
				else if (prMatches.length === 1) blobFilePath = prMatches[0].resolved;
				else blobFilePath = blobUrl;
			}

			if (!filePath && blobFilePath)
				filePath = blobFilePath;

			if (filePath && blobFilePath === filePath && !line && blobLine)
				line = blobLine;

			const prefixMatch = itemBlock.match(CLEAN_BODY_PREFIX_PATTERN);
			const headerRegion = (item.summary || '') + '\n' + itemBlock.slice(0, prefixMatch ? prefixMatch[0].length + 200 : 300);

			if (!filePath) {
				const backtickMatches = Array.from(itemBlock.matchAll(BACKTICK_FILE_PATH_PATTERN));
				for (const backtickMatch of backtickMatches) {
					const candidate = backtickMatch[1];
					if (candidate.includes('/')) {
						const resolved = resolveExistingPath(candidate, prRef);
						if (resolved) {
							filePath = resolved;
							if (backtickMatch[2] && !line) line = backtickMatch[2];
							break;
						}
					}
				}
				if (!filePath) {
					for (const backtickMatch of backtickMatches) {
						const candidate = backtickMatch[1];
						const isNested = candidate.includes('/');
						const isAttributed = !isNested && ALLOWED_ROOT_EXT_PATTERN.test(candidate) && Boolean(backtickMatch[2]) && (
							LEADING_BODY_MARKUP_PATTERN.test(itemBlock.slice(0, backtickMatch.index)) ||
							(item.summary || '').includes(`${candidate}:${backtickMatch[2]}`)
						);
						if (isAttributed) {
							const resolved = resolveExistingPath(candidate, prRef);
							if (resolved) {
								filePath = resolved;
								if (backtickMatch[2] && !line) line = backtickMatch[2];
								break;
							}
						}
					}
				}
			}

			if (!line) {
				const lineMatch = headerRegion.match(INLINE_LINE_NUMBER_PATTERN);
				if (lineMatch) line = lineMatch[1];
			}

			if (!filePath) continue;

			const crId = itemBlock.match(CR_COMMENT_ID_PATTERN);
			const commentId = crId ? `cr_${crId[1]}` : null;

			const cleanBody = itemBlock
				.replace(CLEAN_BODY_PREFIX_PATTERN, '')
				.replace(CLEAN_BODY_SUFFIX_PATTERN, '')
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
 * Fetches and displays unresolved CodeRabbit review findings from the open PR,
 * or resolves/replies to specific review threads.
 *
 * Usage:
 *   tempo-cli review-pr [--json]
 *   tempo-cli review-pr --resolve <threadId>
 *   tempo-cli review-pr --reply <threadId> "<bodyText>"
 */
export async function reviewPr(args = []) {
	const resolveIndex = args.indexOf('--resolve');
	if (resolveIndex !== -1) {
		const targetThreadId = args[resolveIndex + 1];
		if (!targetThreadId || targetThreadId.startsWith('--')) {
			console.error('Usage: tempo-cli review-pr --resolve <threadId>');
			process.exit(1);
		}
		const mutation = `
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread { id isResolved }
  }
}`;
		try {
			runGh(['api', 'graphql', '-f', `query=${mutation}`, '-f', `threadId=${targetThreadId}`]);
			console.log(`✅ Successfully resolved review thread ${targetThreadId}`);
			return;
		} catch (err) {
			console.error(`Error resolving review thread ${targetThreadId}: ${err.message}`);
			process.exit(1);
		}
	}

	const replyIndex = args.indexOf('--reply');
	if (replyIndex !== -1) {
		const targetThreadId = args[replyIndex + 1];
		const body = args[replyIndex + 2];
		if (!targetThreadId || !body || targetThreadId.startsWith('--') || body.startsWith('--')) {
			console.error('Usage: tempo-cli review-pr --reply <threadId> "<bodyText>"');
			process.exit(1);
		}
		const mutation = `
mutation($threadId: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) {
    comment { id }
  }
}`;
		try {
			runGh(['api', 'graphql', '-f', `query=${mutation}`, '-f', `threadId=${targetThreadId}`, '-f', `body=${body}`]);
			console.log(`✅ Successfully replied to review thread ${targetThreadId}`);
			return;
		} catch (err) {
			console.error(`Error replying to review thread ${targetThreadId}: ${err.message}`);
			process.exit(1);
		}
	}

	const jsonOutput = args.includes('--json');

	try {
		const prInfoRaw = runGh(['pr', 'view', '--json', 'number,title,headRefName,url,headRepository,headRepositoryOwner']);
		const prInfo = JSON.parse(prInfoRaw);

		const urlMatch = prInfo.url?.match(PR_URL_PATTERN);
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
          isOutdated
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
					isOutdated: Boolean(t.isOutdated),
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

		const prRef = prInfo.headRefName || 'HEAD';
		const topLevelFindings = latestCrReview ? parseTopLevelReviewComments(latestCrReview.body, prRef) : [];

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
			const statusTag = f.isOutdated ? ' [OUTDATED]' : '';
			console.log(`--- [Finding ${i + 1}/${findings.length}${typeTag}${statusTag}] ---`);
			console.log(`File: ${f.path}${f.line ? `:${f.line}` : ''}`);
			if (f.threadId) console.log(`Thread ID: ${f.threadId}`);
			if (f.isOutdated !== undefined) console.log(`Outdated: ${f.isOutdated}`);
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
