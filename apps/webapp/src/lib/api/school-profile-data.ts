import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { SchoolRaw } from '$lib/api/school-data';
import type { School } from '$lib/types/school';
import { fetchSchoolById, mapSchoolFromApi } from '$lib/api/school-data';
import { authSession } from '$lib/auth/session.svelte';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function fetchCurrentSchoolProfile(client: SchoolClient): Promise<{
	school: School | null;
	raw: SchoolRaw | null;
}> {
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		return { school: null, raw: null };
	}
	const raw = await fetchSchoolById(client, schoolId);
	if (!raw) {
		return { school: null, raw: null };
	}
	return { school: mapSchoolFromApi(raw), raw };
}
