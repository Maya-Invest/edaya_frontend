import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/school/family-feedback/:id` opens the setup tab. */
export const load: PageLoad = ({ params, url }) => {
	const id = params.id;
	if (!id) {
		return;
	}
	throw redirect(307, `/school/family-feedback/${id}/setup${url.search}`);
};
