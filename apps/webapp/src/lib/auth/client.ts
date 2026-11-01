import type { components } from '@maya-invest/edaya-api-client/schema';
import { ApiError, createAuthClient } from '@maya-invest/edaya-api-client';
import { accessTokens } from './bearer-fetch';
import { authTransport } from './transport';

export interface AccountIdentifier { id: string; kind: 'email' | 'phone'; value: string; recoveryEligible: boolean }
export interface AccountUser { id: string; accountId: string; email: string | null; phone: string | null; name: string; emailVerified: boolean }
export interface AuthSnapshot { user: AccountUser; account: { id: string; identifiers: AccountIdentifier[] }; session: { id: string; expiresAt: string; createdAt: string } }
export type PrimaryStatus = components['schemas']['AuthPrimaryStatus'];
export type AuthTerms = components['schemas']['AuthTerms'];
export type OtpStart = components['schemas']['AuthStart'];
export type AuthOutcome = components['schemas']['AuthRegistrationOffer'] | PrimaryStatus | (AuthSnapshot & { state: 'complete'; recoveryCodes?: string[] }) | { state: 'linked'; account: AuthSnapshot['account'] } | { state: 'totp_required' | 'enrollment_required'; challenge: string; secret?: string; uri?: string };
export interface AuthFailure { code?: string; message: string; status?: number; nextResendAt?: number; serverNow?: number }
const generated = createAuthClient(authTransport);
async function result<T>(operation: () => Promise<T>): Promise<{ data: T | null; error: AuthFailure | null }> {
	try {
		const data = await operation();
		if (data && typeof data === 'object' && 'state' in data && data.state === 'complete')
			accessTokens.clear();
		return { data, error: null };
	}
	catch (error) {
		if (error instanceof ApiError) {
			const value = error.body as components['schemas']['AuthFailure'];
			return { data: null, error: { ...value, status: error.status, message: value.message ?? value.code ?? 'Authentication failed' } };
		}
		return { data: null, error: { code: 'network_error', message: 'Unable to reach the authentication service' } };
	}
}
/** Only the explicit local testing entry supplies these private capture routes. */
export function authRequest<T>(path: string, body: object = {}, method = 'POST') {
	return result(() => authTransport.request<T>(method, `/auth/edaya/${path}`, method === 'GET' ? undefined : { body }));
}
export const authClient = {
	terms: (locale: 'fr' | 'en') => result(() => authTransport.request<AuthTerms>('GET', `/auth/edaya/terms?locale=${locale}`)),
	security: () => result(() => generated.security({})),
	disableTotp: () => result(() => generated.disableTotp({})),
	getSession: () => result(() => generated.getSession({})),
	signOut: () => {
		accessTokens.clear();
		return result(() => generated.signOut({}));
	},
	methods: () => result(() => generated.methods()),
	statusOtp: (challenge: string) => result(() => generated.statusOtp({ challenge })),
	resendOtp: (challenge: string, action: 'resend' | 'sms', requestId: string) => result(() => generated.resendOtp({ challenge, action, requestId })),
	startOtp: (input: OtpStart) => result(() => generated.startOtp(input)),
	completeRegistration: (input: components['schemas']['AuthRegistrationInput']) => result(() => generated.completeRegistration(input)),
	verifyOtp: (challenge: string, code: string) => result(() => generated.verifyOtp({ challenge, code })),
	verifyTotp: (challenge: string, code: string) => result(() => generated.verifyTotp({ challenge, code })),
	recover: (challenge: string, code: string) => result(() => generated.recover({ challenge, code })),
	enroll: (challenge?: string) => result(() => generated.enroll(challenge ? { challenge } : {})),
	confirmEnrollment: (challenge: string, code: string) => result(() => generated.confirmEnrollment({ challenge, code })),
	linkIdentifier: (input: OtpStart & { recoveryEligible: boolean }) => result(() => generated.linkIdentifier(input)),
	unlinkIdentifier: (identifierId: string) => result(() => generated.unlinkIdentifier({ identifierId })),
};
