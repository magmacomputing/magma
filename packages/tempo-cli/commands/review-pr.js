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

		const repoOwner = prInfo.headRepositoryOwner?.login;
		const repoName = prInfo.headRepository?.name;

		if (!repoOwner || !repoName) {
			throw new Error('Could not determine repository owner and name from selected PR.');
		}

		const query = `
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

		let hasNextPage = true;
		let afterCursor = null;
		const allThreads = [];

		while (hasNextPage) {
			const gqlArgs = [
				'api',
				'graphql',
				'-f', `query=${query}`,
				'-f', `owner=${repoOwner}`,
				'-f', `repo=${repoName}`,
				'-F', `pr=${prInfo.number}`,
			];
			if (afterCursor) {
				gqlArgs.push('-f', `after=${afterCursor}`);
			}

			let gqlRaw;
			try {
				gqlRaw = runGh(gqlArgs);
			} catch (err) {
				if (allThreads.length > 0) {
					console.warn(`Warning: Could not fetch additional review threads: ${err.message}`);
					break;
				}
				throw err;
			}

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
				console.warn('Warning: hasNextPage is true but no endCursor was provided; pagination could not complete.');
				break;
			}
		}

		const unresolved = allThreads.filter(t => !t.isResolved);

		const findings = [];
		for (const t of unresolved) {
			const crComment = t.comments.nodes.find(
				c => c.author?.login === 'coderabbitai' || c.author?.login === 'coderabbitai[bot]'
			);
			if (crComment) {
				findings.push({
					threadId: t.id,
					path: t.path,
					line: t.line,
					commentId: crComment.id,
					body: crComment.body,
				});
			}
		}

		if (jsonOutput) {
			console.log(JSON.stringify({ pr: prInfo, findingsCount: findings.length, findings }, null, 2));
			return;
		}

		console.log(`\n======================================================`);
		console.log(`CodeRabbit Unresolved PR Findings: PR #${prInfo.number} (${prInfo.title})`);
		console.log(`Branch: ${prInfo.headRefName} | URL: ${prInfo.url}`);
		console.log(`Unresolved Findings Count: ${findings.length}`);
		console.log(`======================================================\n`);

		if (findings.length === 0) {
			console.log('✅ No unresolved CodeRabbit findings found on this PR.\n');
			return;
		}

		for (let i = 0; i < findings.length; i++) {
			const f = findings[i];
			console.log(`--- [Finding ${i + 1}/${findings.length}] ---`);
			console.log(`File: ${f.path}${f.line ? `:${f.line}` : ''}`);
			console.log(`Thread ID: ${f.threadId}`);
			console.log(`\n${f.body.trim()}\n`);
		}
	} catch (err) {
		console.error(`Error fetching PR review findings: ${err.message}`);
		process.exit(1);
	}
}
