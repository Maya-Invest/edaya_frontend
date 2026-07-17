import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/timetable/:id` opens the default details tab. */
export const load: PageLoad = ({ params, url }) => {
	const classId = params.classId;
	const id = params.id;
	if (!classId || !id) {
		return;
	}
	throw redirect(307, `/classes/${classId}/timetable/${id}/details${url.search}`);
};
