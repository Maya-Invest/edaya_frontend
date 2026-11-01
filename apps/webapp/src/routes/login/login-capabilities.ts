import { checkBrowserApiHealth } from '$lib/api/check-api-health';
import { authClient } from '$lib/auth/client';

export async function loadLoginCapabilities() {
	const [health, methods] = await Promise.all([checkBrowserApiHealth(), authClient.methods()]);
	return { connected: health.connected, publicSignup: methods.data?.publicAccountRegistration === true };
}
