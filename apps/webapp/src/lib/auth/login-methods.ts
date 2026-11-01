export type LoginMethodId = 'email-otp' | 'phone-otp';
export interface LoginMethodDefinition { id: LoginMethodId; labelKey: string; enabled: boolean }
export const LOGIN_METHODS = [{ id: 'email-otp', labelKey: 'auth.method.emailOtp', enabled: true }, { id: 'phone-otp', labelKey: 'auth.phoneLabel', enabled: true }] as const satisfies readonly LoginMethodDefinition[];
export const ENABLED_LOGIN_METHODS = LOGIN_METHODS.filter(method => method.enabled);
export const DEFAULT_LOGIN_METHOD_ID: LoginMethodId = 'email-otp';
export function isLoginMethodId(value: string): value is LoginMethodId {
	return ENABLED_LOGIN_METHODS.some(method => method.id === value);
}
