import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { academicContext } from '$lib/academic/context.svelte';
import { authSession } from '$lib/auth/session.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
export type SchoolOverviewResponse = components['schemas']['SchoolOverviewResponse'];

export async function fetchSchoolOverview(
	client: SchoolClient,
): Promise<SchoolOverviewResponse | null> {
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		throw new Error('Missing school context for dashboard overview');
	}

	const scope = academicContext.resolveSelectionForApi();
	if (!scope) {
		return null;
	}

	try {
		return await client.queries.getSchoolOverview({
			schoolId,
			academicYearId: scope.academicYearId,
			academicPeriodId: scope.academicPeriodId,
		});
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 422)) {
			return null;
		}
		throw error;
	}
}
