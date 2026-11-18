export interface TopLevelReviewComment {
	threadId?: string | null;
	path: string;
	line: string;
	isOutdated?: boolean;
	commentId?: string;
	body?: string;
	isFollowUp?: boolean;
	category: 'Follow-up' | 'Nitpick' | 'Additional' | 'OutsideDiff';
	severity: string;
	comment: string;
}

export function parseTopLevelReviewComments(body: string): TopLevelReviewComment[];
