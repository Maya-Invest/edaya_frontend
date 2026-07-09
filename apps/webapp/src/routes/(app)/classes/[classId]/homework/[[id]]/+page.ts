import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Legacy route — homework assessments live on the evaluations screen. */
export const load: PageLoad = ({ params }) => {
	const classId = params.classId;
	const id = params.id;
	if (id) {
		throw redirect(301, `/classes/${classId}/evaluations/${id}`);
	}
	throw redirect(301, `/classes/${classId}/evaluations`);
};
