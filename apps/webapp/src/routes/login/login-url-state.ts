import type { LoginMethodId } from '$lib/auth/login-methods';
import { DEFAULT_LOGIN_METHOD_ID, isLoginMethodId } from '$lib/auth/login-methods';

export type LoginPanel = 'signin' | 'signup';
export type LoginStage = 'form' | 'code' | 'verification';

export interface LoginUrlState {
	panel: LoginPanel;
	method: LoginMethodId;
	stage: LoginStage;
}

export function canonicalLoginUrlState(
	state: LoginUrlState,
	options: { hasEmailIdentity: boolean },
): LoginUrlState {
	if (state.stage !== 'form' && !options.hasEmailIdentity) {
		return { ...state, stage: 'form' };
	}
	return state;
}

function validStage(
	panel: LoginPanel,
	method: LoginMethodId,
	value: string | null,
): LoginStage {
	if (panel === 'signup') {
		return value === 'verification' ? value : 'form';
	}
	if (method === 'email-otp') {
		return value === 'code' ? value : 'form';
	}
	return 'form';
}

export function readLoginUrlState(
	url: URL,
	options: { showSignup: boolean },
): LoginUrlState {
	const panelValue = url.searchParams.get('panel');
	const panel: LoginPanel = options.showSignup && panelValue === 'signup' ? 'signup' : 'signin';
	const methodValue = url.searchParams.get('method');
	const method = methodValue && isLoginMethodId(methodValue)
		? methodValue
		: DEFAULT_LOGIN_METHOD_ID;
	return {
		panel,
		method,
		stage: validStage(panel, method, url.searchParams.get('stage')),
	};
}

export function writeLoginUrlState(url: URL, state: LoginUrlState): string {
	const next = new URL(url);
	next.searchParams.set('panel', state.panel);
	next.searchParams.set('method', state.method);
	next.searchParams.set('stage', state.stage);
	for (const sensitiveKey of ['email', 'password', 'otp', 'code']) {
		next.searchParams.delete(sensitiveKey);
	}
	return `${next.pathname}${next.search}`;
}
