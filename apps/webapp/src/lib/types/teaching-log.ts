export interface LogEntry {
	id: string;
	classId: string;
	date: string;
	subject: string;
	teacher: string;
	chapter: string;
	content: string;
	/** Progress notes from API — not a separate objectives array. */
	notes: string;
	attachments?: string[];
	progress?: number;
	chapters?: import('./session-detail').SessionChapter[];
}
