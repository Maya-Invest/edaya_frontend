import type { PageQueryRequest } from '$lib/queries/page-status';
import type { SubjectsPageState } from '../subjects-page.svelte';
import type { SubjectsPageSlice } from './subjects-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { sortGradeLevels } from '$lib/academic/grade-level-sort';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { selectedStructureLevel } from '../../lib/structure-navigation';
import { loadLevelSubjects } from './level-subjects-data';
import { emptySubjectsSlice, subjectIdFromUrl } from './subjects-helpers';

export async function loadSubjectsSlice(url: URL): Promise<SubjectsPageSlice> {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id;
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId)
		return emptySubjectsSlice();
	const client = getBrowserSchoolClient();
	let levelId = selectedStructureLevel(sortGradeLevels(academicContext.gradeLevels), url.searchParams.get('gradeLevel'))?.id;
	const selectedId = subjectIdFromUrl(url);
	if (selectedId) {
		const selected = await client.entities.gradeLevelSubjects.get(selectedId);
		if (!selected || selected.academicYearId !== academicYearId || !academicContext.gradeLevels.some(level => level.id === selected.gradeLevelId))
			return emptySubjectsSlice();
		levelId = selected.gradeLevelId;
	}
	if (!levelId)
		return emptySubjectsSlice();
	return loadLevelSubjects(client, { schoolId, levelId, academicYearId });
}

export function querySubjectsListPage(state: SubjectsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptySubjectsSlice(),
		load: async (signal) => {
			const data = await loadSubjectsSlice(url);
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: () => true,
	}, request);
}
