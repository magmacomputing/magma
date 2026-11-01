import { execFileSync } from 'node:child_process';

/**
 * Executes a gh CLI command and returns trimmed stdout.
 */
function runGh(args) {
	try {
		return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
	} catch (err) {
		const stderr = err.stderr ? err.stderr.toString().trim() : '';
		throw new Error(stderr || err.message);
	}
}

/**
 * Parses ## Follow-up Comments from a top-level review body.
 */
function parseFollowUpComments(reviewBody) {
	if (!reviewBody) return [];
	const startIdx = reviewBody.indexOf('## Follow-up Comments');
	if (startIdx === -1) return [];

	let endIdx = reviewBody.indexOf('<!-- autofix_checkbox_start -->', startIdx);
	if (endIdx === -1) endIdx = reviewBody.indexOf('<summary><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/info.svg"', startIdx);
	if (endIdx === -1) endIdx = reviewBody.indexOf('\n## Review metadata', startIdx);
	if (endIdx === -1) endIdx = reviewBody.length;

	const section = reviewBody.slice(startIdx, endIdx);
	const findings = [];
	const commentRegex = /<details>\s*<summary>(?:<sub>.*?<\/sub>\s*)?(.*?)<\/summary><blockquote>([\s\S]*?)<\/blockquote><\/details>/g;
	let match;

	while ((match = commentRegex.exec(section)) !== null) {
		const rawTitle = match[1].replace(/<[^>]+>/g, '').trim();
		const content = match[2];

		let filePath = '';
		let line = null;

		const sourceLocMatch = content.match(/\[Open the source location\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-fA-F]+\/([^#]+)(?:#L(\d+)(?:-L?(\d+))?)?\)/);
		if (sourceLocMatch) {
			filePath = sourceLocMatch[1];
			if (sourceLocMatch[2]) {
				line = sourceLocMatch[3] ? `${sourceLocMatch[2]}-${sourceLocMatch[3]}` : sourceLocMatch[2];
			}
		} else {
			const reviewAtMatch = content.match(/Review comment at\s+@([^\s]+)(?:\s+around lines|\s+at line)\s+(\d+)(?:\s*-\s*(\d+))?/);
			if (reviewAtMatch) {
				filePath = reviewAtMatch[1];
				line = reviewAtMatch[3] ? `${reviewAtMatch[2]}-${reviewAtMatch[3]}` : reviewAtMatch[2];
			}
		}

		const idMatch = content.match(/<!-- cr-comment:v1:([0-9a-fA-F]+) -->/);
		const commentId = idMatch ? `cr_${idMatch[1]}` : null;

		findings.push({
			path: filePath,
			line: line,
			title: rawTitle,
			commentId: commentId,
			body: content.trim(),
			isFollowUp: true,
		});
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

		// Parse follow-up comments from the latest review by CodeRabbit
		const latestReviewWithFollowUps = allReviews
			.slice()
			.reverse()
			.find(r => (r.author?.login === 'coderabbitai' || r.author?.login === 'coderabbitai[bot]') && r.body && r.body.includes('## Follow-up Comments'));

		const followUpFindings = latestReviewWithFollowUps ? parseFollowUpComments(latestReviewWithFollowUps.body) : [];

		const findings = [...threadFindings, ...followUpFindings];

		if (jsonOutput) {
			console.log(JSON.stringify({ pr: prInfo, findingsCount: findings.length, findings }, null, 2));
			return;
		}

		console.log(`\n======================================================`);
		console.log(`CodeRabbit PR Findings: PR #${prInfo.number} (${prInfo.title})`);
		console.log(`Branch: ${prInfo.headRefName} | URL: ${prInfo.url}`);
		console.log(`Unresolved Findings Count: ${findings.length} (${threadFindings.length} inline threads, ${followUpFindings.length} follow-up comments)`);
		console.log(`======================================================\n`);

		if (findings.length === 0) {
			console.log('✅ No unresolved CodeRabbit findings found on this PR.\n');
			return;
		}

		for (let i = 0; i < findings.length; i++) {
			const f = findings[i];
			const typeTag = f.isFollowUp ? ' (Follow-up Comment)' : '';
			console.log(`--- [Finding ${i + 1}/${findings.length}${typeTag}] ---`);
			console.log(`File: ${f.path}${f.line ? `:${f.line}` : ''}`);
			if (f.threadId) console.log(`Thread ID: ${f.threadId}`);
			if (f.commentId) console.log(`Comment ID: ${f.commentId}`);
			if (f.title) console.log(`Title: ${f.title}`);
			console.log(`\n${f.body.trim()}\n`);
		}
	} catch (err) {
		console.error(`Error fetching PR review findings: ${err.message}`);
		process.exit(1);
	}
}
