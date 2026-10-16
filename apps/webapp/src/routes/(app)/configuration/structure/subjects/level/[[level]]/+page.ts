import type { PageLoad } from './$types';
import { academicContext } from '$lib/academic/context.svelte';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell } from '$lib/auth/bootstrap-app';
import { redirect } from '@sveltejs/kit';
import { subjectLevelCompatibilityHref } from '../../lib/subject-level-redirect';

export const load: PageLoad = async ({ params, url }) => {
	const { session } = await bootstrapSession();
	if (!session) {
		redirect(307, '/login');
	}
	await bootstrapAppShell();
	redirect(
		307,
		subjectLevelCompatibilityHref(url, params.level, academicContext.gradeLevels),
	);
};
