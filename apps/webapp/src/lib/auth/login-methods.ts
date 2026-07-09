export type LoginMethodId = 'password' | 'email-otp';

export interface LoginMethodDefinition {
	id: LoginMethodId;
	labelKey: string;
	enabled: boolean;
}

/**
 * Registry of sign-in methods shown on `/login`.
 * Add new entries here when enabling OAuth, magic link, etc.
 */
export const LOGIN_METHODS = [
	{
		id: 'password',
		labelKey: 'auth.method.password',
		enabled: true,
	},
	{
		id: 'email-otp',
		labelKey: 'auth.method.emailOtp',
		enabled: true,
	},
] as const satisfies readonly LoginMethodDefinition[];

export const ENABLED_LOGIN_METHODS = LOGIN_METHODS.filter(method => method.enabled);

export const DEFAULT_LOGIN_METHOD_ID = ENABLED_LOGIN_METHODS[0]?.id ?? 'password';

export function isLoginMethodId(value: string): value is LoginMethodId {
	return ENABLED_LOGIN_METHODS.some(method => method.id === value);
}
