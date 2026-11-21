export interface TopLevelReviewComment {
	path: string;
	line: string | null;
	title: string;
	category: 'Follow-up' | 'Nitpick' | 'Additional' | 'OutsideDiff';
	commentId: string | null;
	body: string;
	isFollowUp: boolean;
}

export interface ThreadReply {
	commentId: string;
	createdAt: string | null;
	body: string;
}

export interface ThreadFinding {
	threadId: string;
	path: string;
	line: number | null;
	isOutdated: boolean;
	commentId: string;
	body: string;
	isFollowUp: false;
	latestReply?: ThreadReply;
	followUpReplies?: ThreadReply[];
}

export function extractThreadFinding(thread: any): ThreadFinding | null;
export function parseTopLevelReviewComments(rawBody: string, prRef?: string): TopLevelReviewComment[];
export function reviewPr(args?: string[]): Promise<void>;
