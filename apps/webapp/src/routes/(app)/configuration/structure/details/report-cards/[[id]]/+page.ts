import { redirect } from '@sveltejs/kit';

export function load({ params, url }: { params: { id?: string }; url: URL }) {
	if (!params.id)
		redirect(307, `/configuration/structure/details${url.search}`);
}
