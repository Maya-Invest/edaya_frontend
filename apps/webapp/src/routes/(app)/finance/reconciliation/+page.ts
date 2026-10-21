import { redirect } from '@sveltejs/kit';

export function load({ url }: { url: URL }) {
	redirect(307, `/configuration/tools/finance-checks${url.search}`);
}
