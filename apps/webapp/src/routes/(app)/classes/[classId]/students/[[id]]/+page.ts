import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/students/:id` opens the default profile tab. */
export const load: PageLoad = ({ params, url }) => {
	const classId = params.classId;
	const id = params.id;
	if (!classId || !id) {
		return;
	}
	throw redirect(307, `/classes/${classId}/students/${id}/profile${url.search}`);
};
