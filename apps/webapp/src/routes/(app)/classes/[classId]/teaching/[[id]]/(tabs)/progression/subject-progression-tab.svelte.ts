import type { SubjectMatterDrawerRow } from '$lib/api/mutations/subject-matter.mutations';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { updateClassSubjectTimetableMutation } from '$lib/api/mutations/class-subject.mutations';
import { saveSubjectMatterMutation, deleteSubjectMatterMutation, loadTeachingSubjectProgressionRows } from '$lib/api/mutations/subject-matter.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { teachingClassIdFromUrl } from '../../../lib/teaching-helpers';

const SUBJECT_PROGRESSION_TAB_KEY = Symbol('subject-progression-tab');

export interface SubjectProgressionTabSlice {
	classSubjectId: string;
	catalogSubjectId: string;
	gradeLevelSubjectId?: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
	chaptersReadOnly: boolean;
	/** Chapitres issus du catalogue (non modifiables en classe). */
	catalogMatterIds: string[];
}

export class SubjectProgressionTabState {
	private readonly versionedQuery = new VersionedRouteQuery(new RouteVersionSnapshot(['subjects', 'planning']));
	invalidateIfStale = () => this.versionedQuery.invalidateIfStale();

	onLoadClassSubject = (id: string) => getBrowserSchoolClient().entities.classSubjects.get(id);

	performUpdateClassSubjectTimetable = (...args: Parameters<typeof updateClassSubjectTimetableMutation>) => updateClassSubjectTimetableMutation(...args);

	performSaveSubjectMatter = (...args: Parameters<typeof saveSubjectMatterMutation>) => saveSubjectMatterMutation(...args);

	performDeleteSubjectMatter = (...args: Parameters<typeof deleteSubjectMatterMutation>) => deleteSubjectMatterMutation(...args);

	slice = $state<SubjectProgressionTabSlice | null>(null);

	clear() {
		this.versionedQuery.clear();
		this.slice = null;
	}

	rowsFor(classSubjectId: string): SubjectMatterDrawerRow[] {
		if (this.slice?.classSubjectId !== classSubjectId) {
			return [];
		}
		return this.slice.rows;
	}

	chaptersReadOnlyFor(classSubjectId: string): boolean {
		if (this.slice?.classSubjectId !== classSubjectId) {
			return false;
		}
		return this.slice.chaptersReadOnly;
	}

	isCatalogChapter(classSubjectId: string, matterId: string): boolean {
		if (this.slice?.classSubjectId !== classSubjectId || !this.slice.chaptersReadOnly) {
			return false;
		}
		return this.slice.catalogMatterIds.includes(matterId);
	}

	matterContextFor(classSubjectId: string) {
		if (this.slice?.classSubjectId !== classSubjectId) {
			return null;
		}
		return {
			catalogSubjectId: this.slice.catalogSubjectId,
			gradeLevelSubjectId: this.slice.gradeLevelSubjectId,
			classGroupId: this.slice.classGroupId,
		};
	}

	upsertRow(row: SubjectMatterDrawerRow) {
		if (!this.slice) {
			return;
		}
		const index = this.slice.rows.findIndex(entry => entry.id === row.id);
		this.slice = {
			...this.slice,
			rows: index >= 0
				? this.slice.rows.map(entry => (entry.id === row.id ? row : entry))
				: [...this.slice.rows, row].sort((left, right) => left.sequenceOrder - right.sequenceOrder),
		};
	}

	removeRow(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			rows: this.slice.rows.filter(entry => entry.id !== id),
		};
	}

	query(classSubjectId: string) {
		return this.versionedQuery.track((url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const classId = teachingClassIdFromUrl(url);
				if (!classId) {
					signal.throwIfAborted();
					this.slice = null;
					return {};
				}
				const loaded = await loadTeachingSubjectProgressionRows(classSubjectId);
				signal.throwIfAborted();
				this.slice = {
					classSubjectId,
					catalogSubjectId: loaded.catalogSubjectId,
					gradeLevelSubjectId: loaded.gradeLevelSubjectId,
					classGroupId: loaded.classGroupId,
					rows: loaded.rows,
					chaptersReadOnly: loaded.chaptersReadOnly,
					catalogMatterIds: loaded.chaptersReadOnly
						? loaded.rows.map(row => row.id)
						: [],
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load subject progression data.',
		}, request));
	}
}

export function setSubjectProgressionTabState(state: SubjectProgressionTabState) {
	setContext(SUBJECT_PROGRESSION_TAB_KEY, state);
}

export function getSubjectProgressionTabState(): SubjectProgressionTabState {
	return getContext<SubjectProgressionTabState>(SUBJECT_PROGRESSION_TAB_KEY);
}
