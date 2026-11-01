import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = ({ url }) => {
	redirect(307, `${url.pathname.replace(/\/enrollments\/?$/, '/profile')}${url.search}#schooling`);
};
