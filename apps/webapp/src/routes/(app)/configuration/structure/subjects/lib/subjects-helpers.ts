import type { components } from '$lib/api/schema';
import type { Subject } from '$lib/types/school';
import type { LogEntry } from '$lib/types/teaching-log';

export interface SubjectsPageSlice {
	configuration?: components['schemas']['ReportConfigurationResponse'];
	subjects: Subject[];
	logEntries: LogEntry[];
}

export function emptySubjectsSlice(): SubjectsPageSlice {
	return {
		subjects: [],
		logEntries: [],
	};
}

export function subjectIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/^\/configuration\/structure\/subjects\/([^/]+)(?:\/|$)/);
	if (!match || match[1] === 'level') {
		return undefined;
	}
	return match[1];
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
