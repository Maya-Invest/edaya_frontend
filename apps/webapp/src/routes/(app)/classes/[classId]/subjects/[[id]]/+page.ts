import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
	const id = params.id;
	const base = `/classes/${params.classId}/teaching`;
	redirect(307, id ? `${base}/${id}${url.search}` : `${base}${url.search}`);
}
