import type { Subject } from '$lib/types/school';
import type { LogEntry } from '$lib/types/teaching-log';

export interface TeachingPageSlice {
	classId: string;
	subjects: Subject[];
	logEntries: LogEntry[];
}

export function emptyTeachingSlice(classId: string): TeachingPageSlice {
	return {
		classId,
		subjects: [],
		logEntries: [],
	};
}

export function teachingDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/teaching\/([^/]+)/);
	return match?.[2];
}

export function teachingClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/teaching/);
	return match?.[1];
}

export function logEntriesForClass(classId: string, subjects: Subject[], entries: LogEntry[]): LogEntry[] {
	const subjectNames = subjects.map(subject => subject.name);
	return entries.filter(entry => entry.classId === classId && subjectNames.includes(entry.subject));
}

export function logEntriesForSubject(
	subjectName: string,
	classId: string,
	entries: LogEntry[],
): LogEntry[] {
	return entries.filter(entry => entry.subject === subjectName && entry.classId === classId);
}

export function subjectProgress(subject: Subject, _entries: LogEntry[]): number {
	return subject.completedPercentage ?? 0;
}

export function overallClassProgress(subjects: Subject[], entries: LogEntry[]): number {
	if (subjects.length === 0) {
		return 0;
	}
	const total = subjects.reduce((sum, subject) => sum + subjectProgress(subject, entries), 0);
	return Math.round(total / subjects.length);
}
