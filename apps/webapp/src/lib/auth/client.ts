import { PUBLIC_AUTH_URL } from '$env/static/public';
import { accessTokens } from './bearer-fetch';

export interface AccountIdentifier { id: string; kind: 'email' | 'phone'; value: string; recoveryEligible: boolean }
export interface AccountUser { id: string; accountId: string; email: string | null; phone: string | null; name: string; emailVerified: boolean }
export interface AuthSnapshot { user: AccountUser; account: { id: string; identifiers: AccountIdentifier[] }; session: { id: string; expiresAt: string; createdAt: string } }
export type AuthOutcome = (AuthSnapshot & { state: 'complete'; recoveryCodes?: string[] }) | { state: 'linked'; account: AuthSnapshot['account'] } | { state: 'primary_required' | 'totp_required' | 'enrollment_required'; challenge: string; secret?: string; uri?: string };
export interface AuthFailure { code?: string; message: string }
const base = PUBLIC_AUTH_URL.trim();
if (!base)
	throw new Error('PUBLIC_AUTH_URL is required');

async function request<T>(path: string, body: object = {}): Promise<{ data: T | null; error: AuthFailure | null }> {
	try {
		const response = await fetch(new URL(`/auth/edaya/${path}`, base), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const value = await response.json() as { code?: string; message?: string; state?: string };
		if (!response.ok)
			return { data: null, error: { code: value.code, message: value.message ?? value.code ?? 'Authentication failed' } };
		if (value.state === 'complete' || path.startsWith('sign-out'))
			accessTokens.clear();
		return { data: value as T, error: null };
	}
	catch { return { data: null, error: { code: 'network_error', message: 'Unable to reach the authentication service' } }; }
}

export const authClient = {
	security: () => request<{ totpEnabled: boolean; totpRequired: boolean }>('security'),
	disableTotp: () => request('totp/disable'),
	getSession: () => request<AuthSnapshot>('session'),
	signOut: () => request('sign-out'),
	startOtp: (input: { kind: 'email' | 'phone'; value: string; channel: 'email' | 'telegram' | 'whatsapp' }) => request<AuthOutcome>('otp/start', input),
	verifyOtp: (challenge: string, code: string) => request<AuthOutcome>('otp/verify', { challenge, code }),
	verifyTotp: (challenge: string, code: string) => request<AuthOutcome>('totp/verify', { challenge, code }),
	recover: (challenge: string, code: string) => request<AuthOutcome>('recovery', { challenge, code }),
	enroll: (challenge?: string) => request<AuthOutcome>('totp/enroll', challenge ? { challenge } : {}),
	confirmEnrollment: (challenge: string, code: string) => request<AuthOutcome>('totp/confirm', { challenge, code }),
	linkIdentifier: (input: { kind: 'email' | 'phone'; value: string; channel: 'email' | 'telegram' | 'whatsapp'; recoveryEligible: boolean }) => request<AuthOutcome>('identifiers/start', input),
	unlinkIdentifier: (identifierId: string) => request('identifiers/unlink', { identifierId }),
};
