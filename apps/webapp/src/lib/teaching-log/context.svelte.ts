import type { LogEntry } from '$lib/types/teaching-log';

let runtimeEntries: LogEntry[] = [];
let ready = false;

export const teachingLogContext = {
	get ready() {
		return ready;
	},

	get entries(): LogEntry[] {
		return runtimeEntries;
	},

	hydrateFromServer(entries: LogEntry[]) {
		runtimeEntries = entries;
		ready = true;
	},

	reset() {
		runtimeEntries = [];
		ready = false;
	},

	forClass(classId: string, subjectNames: string[]): LogEntry[] {
		return runtimeEntries.filter(entry =>
			entry.classId === classId && subjectNames.includes(entry.subject),
		);
	},

	forSubject(subjectName: string, classId?: string): LogEntry[] {
		return runtimeEntries.filter(entry =>
			entry.subject === subjectName && (!classId || entry.classId === classId),
		);
	},

	resolveClassEntries(classId: string, classSubjects: { name: string }[]): LogEntry[] {
		return this.forClass(classId, classSubjects.map(subject => subject.name));
	},

	resolveSubjectEntries(subjectName: string, classId?: string): LogEntry[] {
		return this.forSubject(subjectName, classId);
	},
};
