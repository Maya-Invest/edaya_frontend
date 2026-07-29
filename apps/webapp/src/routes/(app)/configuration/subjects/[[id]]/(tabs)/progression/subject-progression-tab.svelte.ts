import type { SubjectMatterDrawerRow } from '$lib/api/mutations/subject-matter.mutations';
import type { Subject } from '$lib/types/school';
import {
	loadCatalogSubjectMatterRows,
	loadSubjectMatterDrawerRows,
} from '$lib/api/mutations/subject-matter.mutations';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';

const SUBJECT_PROGRESSION_TAB_KEY = Symbol('config-subject-progression-tab');

export interface SubjectProgressionTabSlice {
	subjectKey: string;
	classSubjectId: string;
	catalogSubjectId: string;
	gradeLevelSubjectId?: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
	isCatalogSubject: boolean;
}

export class SubjectProgressionTabState {
	slice = $state<SubjectProgressionTabSlice | null>(null);

	clear() {
		this.slice = null;
	}

	rowsFor(subjectKey: string): SubjectMatterDrawerRow[] {
		if (this.slice?.subjectKey !== subjectKey) {
			return [];
		}
		return this.slice.rows;
	}

	matterContextFor(subjectKey: string) {
		if (this.slice?.subjectKey !== subjectKey) {
			return null;
		}
		return {
			catalogSubjectId: this.slice.catalogSubjectId,
			gradeLevelSubjectId: this.slice.gradeLevelSubjectId,
			classGroupId: this.slice.classGroupId,
			classSubjectId: this.slice.classSubjectId,
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

	query(subject: Subject) {
		const subjectKey = subject.id;
		const isCatalogSubject = Boolean(subject.gradeLevelId);

		return (url: URL) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async () => {
				if (isCatalogSubject) {
					const loaded = await loadCatalogSubjectMatterRows(subjectKey);
					this.slice = {
						subjectKey,
						classSubjectId: loaded.classSubjectId,
						catalogSubjectId: loaded.catalogSubjectId,
						gradeLevelSubjectId: loaded.gradeLevelSubjectId,
						classGroupId: loaded.classGroupId,
						rows: loaded.rows,
						isCatalogSubject: true,
					};
					return {};
				}

				const loaded = await loadSubjectMatterDrawerRows(subjectKey);
				this.slice = {
					subjectKey,
					classSubjectId: subjectKey,
					catalogSubjectId: loaded.catalogSubjectId,
					gradeLevelSubjectId: loaded.gradeLevelSubjectId,
					classGroupId: loaded.classGroupId,
					rows: loaded.rows,
					isCatalogSubject: false,
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load subject progression data.',
		});
	}
}

export function setSubjectProgressionTabState(state: SubjectProgressionTabState) {
	setContext(SUBJECT_PROGRESSION_TAB_KEY, state);
}

export function getSubjectProgressionTabState(): SubjectProgressionTabState {
	return getContext<SubjectProgressionTabState>(SUBJECT_PROGRESSION_TAB_KEY);
}
