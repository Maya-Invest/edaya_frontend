export type InvitationAuthMode = 'signUp' | 'signIn';
export type InvitationAuthStage = 'form' | 'verification';

export interface InvitationAuthUrlState {
	mode: InvitationAuthMode;
	stage: InvitationAuthStage;
}

export function canonicalInvitationAuthUrlState(
	state: InvitationAuthUrlState,
	options: { hasEmailIdentity: boolean },
): InvitationAuthUrlState {
	if (state.stage === 'verification' && !options.hasEmailIdentity) {
		return { ...state, stage: 'form' };
	}
	return state;
}

export function readInvitationAuthUrlState(url: URL): InvitationAuthUrlState {
	const mode: InvitationAuthMode = url.searchParams.get('auth') === 'signIn' ? 'signIn' : 'signUp';
	return {
		mode,
		stage: mode === 'signUp' && url.searchParams.get('stage') === 'verification'
			? 'verification'
			: 'form',
	};
}

export function writeInvitationAuthUrlState(
	url: URL,
	state: InvitationAuthUrlState,
): string {
	const next = new URL(url);
	next.searchParams.set('auth', state.mode);
	next.searchParams.set('stage', state.mode === 'signUp' ? state.stage : 'form');
	for (const sensitiveKey of ['email', 'password', 'otp', 'code']) {
		next.searchParams.delete(sensitiveKey);
	}
	return `${next.pathname}${next.search}`;
}
