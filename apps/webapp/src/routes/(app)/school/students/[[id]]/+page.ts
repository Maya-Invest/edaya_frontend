import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/school/students/:id` opens the default profile tab. */
export const load: PageLoad = ({ params, url }) => {
	const id = params.id;
	if (!id) {
		return;
	}
	throw redirect(307, `/school/students/${id}/profile${url.search}`);
};
