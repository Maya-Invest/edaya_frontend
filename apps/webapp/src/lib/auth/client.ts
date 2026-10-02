import { PUBLIC_AUTH_URL } from '$env/static/public';
import { accessTokens } from './bearer-fetch';

export interface AccountIdentifier { id: string; kind: 'email' | 'phone'; value: string; recoveryEligible: boolean }
export interface AccountUser { id: string; accountId: string; email: string | null; phone: string | null; name: string; emailVerified: boolean }
export interface AuthSnapshot { user: AccountUser; account: { id: string; identifiers: AccountIdentifier[] }; session: { id: string; expiresAt: string; createdAt: string } }
export interface PrimaryStatus { state: 'primary_required'; challenge: string; channel: 'email' | 'whatsapp' | 'sms'; lifecycle: 'pending' | 'expired' | 'superseded' | 'completed' | 'exhausted'; delivery: 'pending' | 'accepted' | 'uncertain' | 'failed' | 'sent' | 'delivered' | 'read'; expiresAt: number; nextResendAt: number; serverNow: number; actions: { resend: boolean; sms: boolean } }
export interface OtpStart { kind: 'email' | 'phone'; value: string; locale?: 'fr' | 'en'; requestId?: string }
export type AuthOutcome = PrimaryStatus | (AuthSnapshot & { state: 'complete'; recoveryCodes?: string[] }) | { state: 'linked'; account: AuthSnapshot['account'] } | { state: 'totp_required' | 'enrollment_required'; challenge: string; secret?: string; uri?: string };
export interface AuthFailure { code?: string; message: string; status?: number; nextResendAt?: number; serverNow?: number }
const base = PUBLIC_AUTH_URL.trim();
if (!base)
	throw new Error('PUBLIC_AUTH_URL is required');

export async function authRequest<T>(path: string, body: object = {}, method = 'POST'): Promise<{ data: T | null; error: AuthFailure | null }> {
	try {
		const response = await fetch(new URL(`/auth/edaya/${path}`, base), { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
		const value = await response.json() as { code?: string; message?: string; state?: string; nextResendAt?: number; serverNow?: number };
		if (!response.ok)
			return { data: null, error: { code: value.code, status: response.status, message: value.message ?? value.code ?? 'Authentication failed', nextResendAt: value.nextResendAt, serverNow: value.serverNow } };
		if (value.state === 'complete' || path.startsWith('sign-out'))
			accessTokens.clear();
		return { data: value as T, error: null };
	}
	catch { return { data: null, error: { code: 'network_error', message: 'Unable to reach the authentication service' } }; }
}

export const authClient = {
	security: () => authRequest<{ totpEnabled: boolean; totpRequired: boolean }>('security'),
	disableTotp: () => authRequest('totp/disable'),
	getSession: () => authRequest<AuthSnapshot>('session'),
	signOut: () => authRequest('sign-out'),
	methods: () => authRequest<{ methods: { kind: string; available?: boolean; countries?: string[] }[] }>('methods', {}, 'GET'),
	statusOtp: (challenge: string) => authRequest<PrimaryStatus>('otp/status', { challenge }),
	resendOtp: (challenge: string, action: 'resend' | 'sms', requestId: string) => authRequest<AuthOutcome>('otp/resend', { challenge, action, requestId }),
	startOtp: (input: OtpStart) => authRequest<AuthOutcome>('otp/start', input),
	verifyOtp: (challenge: string, code: string) => authRequest<AuthOutcome>('otp/verify', { challenge, code }),
	verifyTotp: (challenge: string, code: string) => authRequest<AuthOutcome>('totp/verify', { challenge, code }),
	recover: (challenge: string, code: string) => authRequest<AuthOutcome>('recovery', { challenge, code }),
	enroll: (challenge?: string) => authRequest<AuthOutcome>('totp/enroll', challenge ? { challenge } : {}),
	confirmEnrollment: (challenge: string, code: string) => authRequest<AuthOutcome>('totp/confirm', { challenge, code }),
	linkIdentifier: (input: OtpStart & { recoveryEligible: boolean }) => authRequest<AuthOutcome>('identifiers/start', input),
	unlinkIdentifier: (identifierId: string) => authRequest('identifiers/unlink', { identifierId }),
};
