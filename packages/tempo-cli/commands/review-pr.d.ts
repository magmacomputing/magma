export interface TopLevelReviewComment {
	path: string;
	line: string | null;
	title: string;
	category: 'Follow-up' | 'Nitpick' | 'Additional' | 'OutsideDiff';
	commentId: string | null;
	body: string;
	isFollowUp: boolean;
}

export function parseTopLevelReviewComments(rawBody: string, prRef?: string): TopLevelReviewComment[];
export function reviewPr(args?: string[]): Promise<void>;
