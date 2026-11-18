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

export function subjectProgress(subject: Subject, _entries: LogEntry[]): number {
	return subject.completedPercentage ?? 0;
}
