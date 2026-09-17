import type { BootstrapSessionResult } from '$lib/auth/bootstrap';
import { acceptInvitation } from '$lib/api/invitation-data';
import {
	bootstrapSession,
	resetBootstrapSession,
} from '$lib/auth/bootstrap';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import {
	clearPendingInviteTokenIf,
	readPendingInviteToken,
} from '$lib/auth/pending-invite-token';
import { ApiError } from '@maya-invest/edaya-api-client';

const SETTLED_INVITATION_CODES = new Set([
	'INVITATION_ALREADY_ACCEPTED',
	'SUBJECT_ALREADY_LINKED',
]);

const TERMINAL_INVITATION_CODES = new Set([
	...SETTLED_INVITATION_CODES,
	'INVITATION_NOT_FOUND',
	'INVITATION_REVOKED',
	'INVITATION_EXPIRED',
]);

function invitationErrorCode(error: unknown): string | null {
	if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') {
		return null;
	}
	const code = (error.body as { code?: string }).code;
	return typeof code === 'string' ? code : null;
}

function invitationAlreadySettled(error: unknown): boolean {
	const code = invitationErrorCode(error);
	return code != null && SETTLED_INVITATION_CODES.has(code);
}

export async function acceptPendingInviteIfPresent(): Promise<boolean> {
	const token = readPendingInviteToken();
	if (!token) {
		return false;
	}

	try {
		await acceptInvitation(token);
		clearPendingInviteTokenIf(token);
		return true;
	}
	catch (error) {
		if (invitationAlreadySettled(error)) {
			clearPendingInviteTokenIf(token);
			return true;
		}
		const code = invitationErrorCode(error);
		if (code && TERMINAL_INVITATION_CODES.has(code)) {
			clearPendingInviteTokenIf(token);
		}
		return false;
	}
}

async function refreshLinkedSession(): Promise<BootstrapSessionResult> {
	for (let attempt = 0; attempt < 6; attempt++) {
		resetBootstrapSession();
		try {
			const bootstrap = await bootstrapSession({ silent: true });
			if (bootstrap.session && !bootstrap.pendingOnboarding) {
				return bootstrap;
			}
		}
		catch {
			// Linkage can lag the first grants read; retry with a fresh bootstrap.
		}
		if (attempt < 5) {
			await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
		}
	}
	resetBootstrapSession();
	return bootstrapSession();
}

async function firstBootstrapAfterInvite(): Promise<BootstrapSessionResult> {
	try {
		return await bootstrapSession();
	}
	catch (error) {
		if (!readPendingInviteToken()) {
			throw error;
		}
		return {
			session: null,
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: true,
			onboardingStatusUnknown: false,
		};
	}
}

/** Link a stored staff invite before treating the account as a new school to onboard. */
export async function bootstrapSessionAfterInvite(): Promise<BootstrapSessionResult> {
	const first = await firstBootstrapAfterInvite();
	if (!first.pendingOnboarding || !readPendingInviteToken()) {
		return first;
	}

	const accepted = await acceptPendingInviteIfPresent();
	if (!accepted) {
		return first;
	}

	resetAppShellBootstrap();
	return refreshLinkedSession();
}
