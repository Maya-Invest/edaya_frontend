import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/configuration/classes/:id` opens the default profile tab. */
export const load: PageLoad = ({ params, url }) => {
	const id = params.id;
	if (!id) {
		return;
	}
	throw redirect(307, `/configuration/classes/${id}/profile${url.search}`);
};
