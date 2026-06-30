import { PUBLIC_API_URL } from '$env/static/public';
import { resolveApiUrl } from './http';

export async function checkBrowserApiHealth(): Promise<
	{ connected: true; message: string } | { connected: false }
> {
	try {
		const base = PUBLIC_API_URL || '';
		// In local dev, Vite proxies /auth to the API — not GET / (that serves the SPA).
		const response = await fetch(resolveApiUrl(base, '/auth/get-session'), { credentials: 'omit' });
		if (!response.ok) {
			return { connected: false };
		}
		return { connected: true, message: 'Edaya Core API' };
	}
	catch {
		return { connected: false };
	}
}
