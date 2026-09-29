import { PUBLIC_API_URL, PUBLIC_AUTH_URL } from '$env/static/public';
import { resolveApiUrl } from './http';

const authBaseUrl = PUBLIC_AUTH_URL.trim();
if (!authBaseUrl) {
	throw new Error('PUBLIC_AUTH_URL is required');
}

export async function checkBrowserApiHealth(): Promise<
	{ connected: true; message: string } | { connected: false }
> {
	try {
		const identity = await fetch(resolveApiUrl(authBaseUrl, '/auth/edaya/methods'), { credentials: 'omit' });
		if (!identity.ok) {
			return { connected: false };
		}
		const schoolProbe = PUBLIC_API_URL.trim()
			? resolveApiUrl(PUBLIC_API_URL.trim(), '/reference')
			: '/reference';
		const school = await fetch(schoolProbe, { credentials: 'omit' });
		if (!school.ok) {
			return { connected: false };
		}
		return { connected: true, message: 'Edaya Identity' };
	}
	catch {
		return { connected: false };
	}
}
