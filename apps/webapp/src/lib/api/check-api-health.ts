import { PUBLIC_API_URL } from '$env/static/public';
import { resolveApiUrl } from './http';

export async function checkBrowserApiHealth(): Promise<{ connected: true; message: string } | { connected: false }> {
	try {
		const response = await fetch(resolveApiUrl(PUBLIC_API_URL.trim(), '/reference'), { credentials: 'omit' });
		return response.ok ? { connected: true, message: 'EDaya API' } : { connected: false };
	}
	catch { return { connected: false }; }
}
