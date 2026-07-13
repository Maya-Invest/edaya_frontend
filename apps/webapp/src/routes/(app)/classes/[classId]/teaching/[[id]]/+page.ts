import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/teaching/:id` opens the default progression tab. */
export const load: PageLoad = ({ params, url }) => {
	const classId = params.classId;
	const id = params.id;
	if (!classId || !id) {
		return;
	}
	throw redirect(307, `/classes/${classId}/teaching/${id}/progression${url.search}`);
};
