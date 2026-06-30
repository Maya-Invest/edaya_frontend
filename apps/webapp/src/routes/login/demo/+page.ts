import { isDemoLoginEnabled } from '$lib/env/app-env';
import { redirect } from '@sveltejs/kit';

export function load() {
	if (!isDemoLoginEnabled()) {
		redirect(307, '/login');
	}
}
