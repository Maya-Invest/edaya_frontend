import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Bare `/school/teachers/:id` opens the default profile tab. */
export const load: PageLoad = ({ url }) => {
	throw redirect(307, `profile${url.search}`);
};
