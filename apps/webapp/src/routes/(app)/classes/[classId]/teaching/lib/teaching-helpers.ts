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

export function subjectProgress(subject: Subject, entries: LogEntry[]): number {
	const subjectEntries = logEntriesForSubject(subject.name, subject.classId, entries);
	const byChapter: Record<string, number> = {};
	for (const entry of subjectEntries) {
		const previous = byChapter[entry.chapter];
		if (previous === undefined || entry.progress > previous) {
			byChapter[entry.chapter] = entry.progress;
		}
	}
	const values = Object.values(byChapter);
	return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export function overallClassProgress(subjects: Subject[], entries: LogEntry[]): number {
	if (subjects.length === 0) {
		return 0;
	}
	const total = subjects.reduce((sum, subject) => sum + subjectProgress(subject, entries), 0);
	return Math.round(total / subjects.length);
}

export function chapterProgressFromEntries(entries: LogEntry[]): {
	chapters: [string, number][];
	overall: number;
} {
	const byChapter: Record<string, number> = {};
	for (const entry of entries) {
		const previous = byChapter[entry.chapter];
		if (previous === undefined || entry.progress > previous) {
			byChapter[entry.chapter] = entry.progress;
		}
	}
	const chapters = Object.entries(byChapter);
	const overall = chapters.length
		? Math.round(chapters.reduce((sum, [, progress]) => sum + progress, 0) / chapters.length)
		: 0;
	return { chapters, overall };
}
