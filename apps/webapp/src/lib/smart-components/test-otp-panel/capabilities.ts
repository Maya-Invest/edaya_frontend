import { authRequest } from '$lib/auth/client';

let discovery: Promise<boolean> | undefined;
export function testOtpAvailable() {
	return discovery ??= authRequest<{ otpAccess: boolean }>('testing/capabilities', {}, 'GET').then(({ data }) => data?.otpAccess === true);
}
