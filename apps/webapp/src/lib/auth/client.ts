import { PUBLIC_AUTH_URL } from '$env/static/public';
import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { accessTokens } from './bearer-fetch';

const authBaseUrl = PUBLIC_AUTH_URL.trim();
if (!authBaseUrl) {
	throw new Error('PUBLIC_AUTH_URL is required');
}

export const authClient = createAuthClient({
	baseURL: authBaseUrl,
	basePath: '/auth',
	fetchOptions: {
		credentials: 'include',
		onSuccess(context) {
			const path = new URL(context.request.url, window.location.origin).pathname;
			if (/\/auth\/(?:sign-in|sign-up|sign-out)/.test(path)) {
				accessTokens.clear();
			}
		},
	},
	plugins: [emailOTPClient()],
});
