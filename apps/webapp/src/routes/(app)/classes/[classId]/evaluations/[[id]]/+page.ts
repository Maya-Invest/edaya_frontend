import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/evaluations/:id` opens the default details tab. */
export const load: PageLoad = ({ url }) => {
	throw redirect(307, `./details${url.search}`);
};
