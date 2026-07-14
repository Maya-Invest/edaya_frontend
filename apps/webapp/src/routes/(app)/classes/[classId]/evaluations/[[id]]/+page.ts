import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/evaluations/:id` opens the default details tab. */
export const load: PageLoad = ({ params, url }) => {
	const classId = params.classId;
	const id = params.id;
	if (!classId || !id) {
		return;
	}
	throw redirect(307, `/classes/${classId}/evaluations/${id}/details${url.search}`);
};
