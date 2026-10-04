import { redirect } from '@sveltejs/kit';

export function load({ url }: { url: URL }) {
	const query = new URLSearchParams(url.searchParams);
	query.set('workflow', 'grades');
	redirect(307, `/school/corrections?${query}`);
}
