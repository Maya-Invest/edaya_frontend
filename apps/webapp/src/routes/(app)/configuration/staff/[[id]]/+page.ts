import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
	const id = params.id;
	const base = '/school/staff';
	redirect(307, id ? `${base}/${id}${url.search}` : `${base}${url.search}`);
}
