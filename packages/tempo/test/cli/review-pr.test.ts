import { extractThreadFinding, parseTopLevelReviewComments } from '../../../tempo-cli/commands/review-pr.js';

const finding = `<details>
<summary>packages/tempo/src/tempo.class.ts:10: Preserve configuration</summary>
<blockquote>
Review comment at @packages/tempo/src/tempo.class.ts at line 10
Keep inherited configuration available.
<!-- cr-comment:v1:abc123 -->
</blockquote>
</details>`;

describe('review parser outside diff sections', () => {
	it('does not recognize a section inside a tilde fence', () => {
		const body = ['~~~markdown', '**Outside diff range comments (1)**', finding, '~~~'].join('\n');
		expect(parseTopLevelReviewComments(body)).toEqual([]);
	});

	it('ignores a fenced heading while parsing a later real section', () => {
		const body = ['```markdown', '**Outside diff range comments (1)**', finding, '```',
			'**Outside diff range comments (1)**', finding.replace('abc123', 'def456'),
		].join('\n');
		const results = parseTopLevelReviewComments(body);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ category: 'OutsideDiff', commentId: 'cr_def456' });
	});

	it.each([
		'**Outside diff range comments**',
		'**Outside diff range comments (1)**',
		'  **⚠️ Outside diff range comments (1)**  ',
		'<details><summary>Outside diff range comments (1)</summary>',
		'<details><summary><picture><img src="icon.svg"></picture>⚠️ Outside diff range comments (1)</summary>',
	])('recognizes heading %s', heading => {
		const results = parseTopLevelReviewComments(`${heading}\n${finding}\n</details>`);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			path: 'packages/tempo/src/tempo.class.ts',
			line: '10',
			category: 'OutsideDiff',
			commentId: 'cr_abc123',
			isFollowUp: true,
		});
		expect(results[0].body).toContain('Keep inherited configuration available.');
	});

	it('does not recognize a heading embedded in a fenced example', () => {
		const body = ['```markdown', '**Outside diff range comments (1)**', finding, '```'].join('\n');
		expect(parseTopLevelReviewComments(body)).toEqual([]);
	});

	it('does not treat an inline mention as a section heading', () => {
		expect(parseTopLevelReviewComments(`See **Outside diff range comments** below.\n${finding}`)).toEqual([]);
	});

	it('keeps subsequent additional comments in their own category', () => {
		const body = `**Outside diff range comments (1)**\n${finding}
<details><summary>Additional comments (1)</summary>
${finding.replace('abc123', 'def456')}
</details>`;
		const results = parseTopLevelReviewComments(body);
		expect(results.map(result => result.category)).toEqual(['OutsideDiff', 'Additional']);
		expect(results.map(result => result.commentId)).toEqual(['cr_abc123', 'cr_def456']);
	});

	it('extracts multiple nested findings inside an HTML Outside diff range comments wrapper', () => {
		const secondFinding = finding
			.replaceAll('packages/tempo/src/tempo.class.ts', 'packages/tempo/src/module/module.parse.ts')
			.replace('abc123', 'def456');
		const body = `<details><summary>Outside diff range comments (2)</summary>\n${finding}\n${secondFinding}\n</details>`;
		const results = parseTopLevelReviewComments(body);
		expect(results).toHaveLength(2);
		expect(results.map(result => result.category)).toEqual(['OutsideDiff', 'OutsideDiff']);
		expect(results.map(result => result.path)).toEqual(['packages/tempo/src/tempo.class.ts', 'packages/tempo/src/module/module.parse.ts']);
		expect(results.map(result => result.commentId)).toEqual(['cr_abc123', 'cr_def456']);
	});

	it('extracts subsequent CodeRabbit follow-up replies on unresolved threads and strips <details> blocks', () => {
		const findingResult = extractThreadFinding({
			id: 'PRRT_1',
			path: 'packages/plugins/signals/src/functions/watch-system.ts',
			line: 97,
			isOutdated: false,
			comments: {
				nodes: [
					{ id: 'c1', author: { login: 'coderabbitai' }, createdAt: '2026-11-20T05:00:00Z', body: 'Initial finding' },
					{ id: 'c2', author: { login: 'magmacomputing' }, createdAt: '2026-11-20T06:00:00Z', body: '@coderabbitai fixed' },
					{
						id: 'c3',
						author: { login: 'coderabbitai' },
						createdAt: '2026-11-20T06:01:00Z',
						body: '<details><summary>Analysis chain</summary>outer<details>inner</details>tail</details>\n\nPlease also preserve `parse.mode`.',
					},
				],
			},
		});

		expect(findingResult).not.toBeNull();
		expect(findingResult!.commentId).toBe('c1');
		expect(findingResult!.followUpReplies).toEqual([
			{
				commentId: 'c3',
				createdAt: '2026-11-20T06:01:00Z',
				body: 'Please also preserve `parse.mode`.',
			},
		]);
		expect(findingResult!.latestReply).toEqual(findingResult!.followUpReplies![0]);
	});

	it('preserves HTML <details> tag literals inside inline-code and fenced-code spans', () => {
		const findingResult = extractThreadFinding({
			id: 'PRRT_2',
			path: 'packages/tempo-cli/commands/review-pr.js',
			line: 10,
			isOutdated: false,
			comments: {
				nodes: [
					{ id: 'c1', author: { login: 'coderabbitai' }, createdAt: '2026-11-20T05:00:00Z', body: 'Initial finding' },
					{
						id: 'c2',
						author: { login: 'coderabbitai' },
						createdAt: '2026-11-20T06:00:00Z',
						body: '<details><summary>Analysis</summary>hidden</details>\n\nUse `<details open>` and keep the closing tag.',
					},
				],
			},
		});

		expect(findingResult!.latestReply?.body).toBe('Use `<details open>` and keep the closing tag.');
	});

	it('preserves longer Markdown fences containing inner fences and literal <details> tags', () => {
		const findingResult = extractThreadFinding({
			id: 'PRRT_3',
			path: 'packages/tempo-cli/commands/review-pr.js',
			line: 10,
			isOutdated: false,
			comments: {
				nodes: [
					{ id: 'c1', author: { login: 'coderabbitai' }, createdAt: '2026-11-20T05:00:00Z', body: 'Initial finding' },
					{
						id: 'c2',
						author: { login: 'coderabbitai' },
						createdAt: '2026-11-20T06:00:00Z',
						body: '<details><summary>Analysis</summary>hidden</details>\n\n````markdown\n```html\n<details>keep me</details>\n```\n````',
					},
				],
			},
		});

		expect(findingResult!.latestReply?.body).toBe('````markdown\n```html\n<details>keep me</details>\n```\n````');
	});

	it('does not let an unmatched backtick swallow a closing </details> block boundary', () => {
		const findingResult = extractThreadFinding({
			id: 'PRRT_4',
			path: 'packages/tempo-cli/commands/review-pr.js',
			line: 10,
			isOutdated: false,
			comments: {
				nodes: [
					{ id: 'c1', author: { login: 'coderabbitai' }, createdAt: '2026-11-20T05:00:00Z', body: 'Initial finding' },
					{
						id: 'c2',
						author: { login: 'coderabbitai' },
						createdAt: '2026-11-20T06:00:00Z',
						body: '<details><summary>Analysis</summary>\nA lone backtick: `\n</details>\n\nUse `value`.',
					},
				],
			},
		});

		expect(findingResult!.latestReply?.body).toBe('Use `value`.');
	});

	it('does not end a fenced code block early on a mixed-character closing line', () => {
		const findingResult = extractThreadFinding({
			id: 'PRRT_5',
			path: 'packages/tempo-cli/commands/review-pr.js',
			line: 10,
			isOutdated: false,
			comments: {
				nodes: [
					{ id: 'c1', author: { login: 'coderabbitai' }, createdAt: '2026-11-20T05:00:00Z', body: 'Initial finding' },
					{
						id: 'c2',
						author: { login: 'coderabbitai' },
						createdAt: '2026-11-20T06:00:00Z',
						body: '```html\nx\n```~~~\n<details open>\n```\nKeep this instruction.',
					},
				],
			},
		});

		expect(findingResult!.latestReply?.body).toBe('```html\nx\n```~~~\n<details open>\n```\nKeep this instruction.');
	});
});
