import type { SubjectMatterDrawerRow } from '$lib/api/mutations/subject-matter.mutations';
import { loadSubjectMatterDrawerRows } from '$lib/api/mutations/subject-matter.mutations';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';

const SUBJECT_PROGRESSION_TAB_KEY = Symbol('config-subject-progression-tab');

export interface SubjectProgressionTabSlice {
	classSubjectId: string;
	catalogSubjectId: string;
	gradeLevelSubjectId?: string;
	classGroupId: string;
	rows: SubjectMatterDrawerRow[];
}

export class SubjectProgressionTabState {
	slice = $state<SubjectProgressionTabSlice | null>(null);

	clear() {
		this.slice = null;
	}

	rowsFor(classSubjectId: string): SubjectMatterDrawerRow[] {
		if (this.slice?.classSubjectId !== classSubjectId) {
			return [];
		}
		return this.slice.rows;
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
		return (url: URL) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const loaded = await loadSubjectMatterDrawerRows(classSubjectId);
				this.slice = {
					classSubjectId,
					catalogSubjectId: loaded.catalogSubjectId,
					gradeLevelSubjectId: loaded.gradeLevelSubjectId,
					classGroupId: loaded.classGroupId,
					rows: loaded.rows,
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
