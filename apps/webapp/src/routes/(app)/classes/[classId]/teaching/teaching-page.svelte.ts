import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Subject } from '$lib/types/school';
import type { LogEntry } from '$lib/types/teaching-log';
import type { TeachingPageSlice } from './lib/teaching-helpers';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { setClassSubjectOfferedMutation } from '$lib/api/mutations/grade-level-subject.mutations';
import { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
import { updateSubjectMutation, createSubjectForClassMutation } from '$lib/api/mutations/subject.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadSubjectCategories } from '$lib/api/subject-categories-data';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	emptyTeachingSlice,
	logEntriesForClass,
	logEntriesForSubject,
	overallClassProgress,
	subjectProgress,
	teachingClassIdFromUrl,
	teachingDetailIdFromUrl,
} from './lib/teaching-helpers';
import { loadTeachingSlice, queryTeachingListPage } from './lib/teaching-queries';
import { runTeachingRouteMutation } from './lib/teaching-route-mutation';

const TEACHING_VERSION_FAMILIES = ['subjects', 'planning', 'teachers', 'staff'] as const satisfies readonly EntityVersionKey[];

const TEACHING_PAGE_STATE_KEY = Symbol('teaching-page-state');

export type { TeachingPageSlice };

export class TeachingPageState {
	onLoadCategories = (schoolId: string) => loadSubjectCategories(getBrowserSchoolClient(), schoolId);

	performUpdateSubject = (...args: Parameters<typeof updateSubjectMutation>) => updateSubjectMutation(...args);

	performCreateSubjectForClass = (...args: Parameters<typeof createSubjectForClassMutation>) => createSubjectForClassMutation(...args);

	performCreateSchedule = (...args: Parameters<typeof createScheduleMutation>) => createScheduleMutation(...args);

	performSetClassSubjectOffered = (...args: Parameters<typeof setClassSubjectOfferedMutation>) => setClassSubjectOfferedMutation(...args);

	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	slice = $state<TeachingPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(TEACHING_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(classId: string, data: Partial<Omit<TeachingPageSlice, 'classId'>>) {
		this.slice = { ...emptyTeachingSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<TeachingPageSlice, 'classId'>>) {
		this.applySlice(classId, data);
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return teachingDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const classId = teachingClassIdFromUrl(this.getUrl());
		if (!classId) {
			return undefined;
		}
		return this.selectedSubject(classId, this.selectedId);
	}

	subjectsFor(classId: string) {
		return this.slice?.classId === classId ? this.slice.subjects : [];
	}

	logEntriesFor(classId: string) {
		if (this.slice?.classId !== classId) {
			return [];
		}
		return logEntriesForClass(classId, this.slice.subjects, this.slice.logEntries);
	}

	logEntriesForSubject(subject: Subject) {
		if (this.slice?.classId !== subject.classId) {
			return [];
		}
		return logEntriesForSubject(subject.name, subject.classId, this.slice.logEntries);
	}

	subjectProgress(subject: Subject) {
		if (this.slice?.classId !== subject.classId) {
			return 0;
		}
		return subjectProgress(subject, this.slice.logEntries);
	}

	overallProgress(classId: string) {
		if (this.slice?.classId !== classId) {
			return 0;
		}
		return overallClassProgress(this.slice.subjects, this.slice.logEntries);
	}

	selectedSubject(classId: string, subjectId?: string) {
		if (!subjectId || this.slice?.classId !== classId) {
			return undefined;
		}
		return this.slice.subjects.find(subject => subject.id === subjectId);
	}

	appendSubject(subject: Subject) {
		if (!this.slice || this.slice.classId !== subject.classId) {
			return;
		}
		this.slice = {
			...this.slice,
			subjects: [...this.slice.subjects, subject].sort((left, right) =>
				left.name.localeCompare(right.name, 'fr'),
			),
		};
	}

	patchSubject(id: string, patch: Partial<Subject>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			subjects: this.slice.subjects.map(subject =>
				subject.id === id ? { ...subject, ...patch } : subject,
			),
		};
	}

	removeSubject(id: string) {
		if (!this.slice) {
			return;
		}
		const removed = this.slice.subjects.find(subject => subject.id === id);
		this.slice = {
			...this.slice,
			subjects: this.slice.subjects.filter(subject => subject.id !== id),
			logEntries: removed
				? this.slice.logEntries.filter(entry => entry.subject !== removed.name)
				: this.slice.logEntries,
		};
	}

	setLogEntries(entries: LogEntry[]) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			logEntries: entries,
		};
	}

	queryListPage(classId: string) {
		return queryTeachingListPage(classId);
	}

	async refreshSlice(classId: string) {
		const data = await loadTeachingSlice(classId);
		this.applySlice(classId, data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		const classId = this.slice?.classId ?? teachingClassIdFromUrl(this.getUrl());
		if (!classId) {
			return;
		}
		await this.refreshSlice(classId);
	}

	async deleteSubject(input: {
		classSubjectId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.slice?.subjects.find(subject => subject.id === input.classSubjectId);
		const previousEntries = previous && this.slice
			? this.slice.logEntries.filter(entry => entry.subject === previous.name)
			: [];

		const result = await runTeachingRouteMutation({
			request: () => client.entities.classSubjects.delete({ id: input.classSubjectId }),
			successMessage: input.successMessage,
			versionKeys: ['subjects', 'planning', 'teachers', 'staff'],
			apply: () => {
				this.removeSubject(input.classSubjectId);
			},
			rollback: () => {
				if (previous) {
					this.appendSubject(previous);
				}
				if (previousEntries.length > 0 && this.slice) {
					this.slice = {
						...this.slice,
						logEntries: [...this.slice.logEntries, ...previousEntries],
					};
				}
			},
		});
		return result !== null;
	}
}

export function setTeachingPageState(state: TeachingPageState) {
	setContext(TEACHING_PAGE_STATE_KEY, state);
}

export function getTeachingPageState() {
	return getContext<TeachingPageState>(TEACHING_PAGE_STATE_KEY);
}
