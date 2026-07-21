import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/configuration/subjects/:id` opens the default progression tab. */
export const load: PageLoad = ({ params, url }) => {
	const id = params.id;
	if (!id) {
		return;
	}
	throw redirect(307, `/configuration/subjects/${id}/progression${url.search}`);
};
