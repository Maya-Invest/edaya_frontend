import { detailHref } from '$lib/detail-hrefs';
import { redirect } from '@sveltejs/kit';

export function load({ params, url }: { params: { id?: string }; url: URL }) {
	if (!params.id)
		redirect(307, '/school/staff');
	redirect(307, `${detailHref.schoolStaffTab(params.id, 'permissions')}${url.search}`);
}
