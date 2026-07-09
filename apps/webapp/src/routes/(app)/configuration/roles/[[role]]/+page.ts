import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Legacy route — permissions live on School → Staff drawer (Permissions tab). */
export const load: PageLoad = ({ params }) => {
	const staffId = params.role;
	if (staffId) {
		throw redirect(301, `/school/staff/${staffId}`);
	}
	throw redirect(301, '/school/staff');
};
