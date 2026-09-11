import { PUBLIC_API_URL } from '$env/static/public';
import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { accessTokens } from './bearer-fetch';

export const authClient = createAuthClient({
	baseURL: PUBLIC_API_URL || undefined,
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
