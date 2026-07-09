export interface LogEntry {
	id: string;
	classId: string;
	date: string;
	subject: string;
	teacher: string;
	chapter: string;
	content: string;
	objectives: string[];
	homework?: string;
	attachments?: string[];
	progress: number;
}
