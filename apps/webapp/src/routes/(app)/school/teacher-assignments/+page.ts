import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { teacherAssignmentsCompatibilityHref } from './teacher-assignments-redirect';

/** Compatibility route — the maintained school-wide hub lives under Configuration → Tools. */
export const load: PageLoad = ({ url }) => {
	redirect(307, teacherAssignmentsCompatibilityHref(url));
};
