import { redirect } from '@sveltejs/kit';

export function load({ url }: { url: URL }) {
	const query = new URLSearchParams();
	const level = url.searchParams.get('gradeLevel');
	if (level)
		query.set('gradeLevel', level);
	redirect(307, `/configuration/structure/subjects?${query}`);
}
