import { afterEach, expect, test } from 'bun:test';
import { checkBrowserApiHealth } from '../../../src/lib/api/check-api-health';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('service health is independent of optional phone availability discovery', async () => {
	const paths: string[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		const path = new URL(String(input)).pathname;
		paths.push(path);
		if (path === '/auth/edaya/methods') throw new Error('Availability is unavailable');
		return Response.json({ message: 'healthy' });
	}) as unknown as typeof fetch;
	expect(await checkBrowserApiHealth()).toEqual({ connected: true, message: 'EDaya API' });
	expect(paths).toEqual(['/reference']);
});
test('unhealthy API still disables authentication', async () => {
	globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
	expect(await checkBrowserApiHealth()).toEqual({ connected: false });
});
