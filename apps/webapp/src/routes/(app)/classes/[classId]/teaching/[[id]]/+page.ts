import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/classes/:classId/teaching/:id` opens the default progression tab. */
export const load: PageLoad = ({ url }) => {
	throw redirect(307, `./progression${url.search}`);
};
