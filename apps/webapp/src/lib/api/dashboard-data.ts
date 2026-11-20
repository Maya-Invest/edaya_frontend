import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { academicContext } from '$lib/academic/context.svelte';
import { authSession } from '$lib/auth/session.svelte';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
export type SchoolOverviewResponse = components['schemas']['SchoolOverviewResponse'];

export async function fetchSchoolOverview(
	client: SchoolClient,
	signal?: AbortSignal,
): Promise<SchoolOverviewResponse | null> {
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		throw new Error('Missing school context for dashboard overview');
	}

	const academicYearId = academicContext.resolveAcademicYearIdForApi();
	if (!academicYearId) {
		return null;
	}

	const selection = academicContext.resolveSelectionForApi();
	return await client.queries.getSchoolOverview({
		schoolId,
		academicYearId,
		...(selection ? { academicPeriodId: selection.academicPeriodId } : {}),
	}, { signal });
}
