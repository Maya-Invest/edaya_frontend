import type { BootstrapSessionResult } from '$lib/auth/bootstrap';
import { acceptInvitation } from '$lib/api/invitation-data';
import {
	bootstrapSession,
	resetBootstrapSession,

} from '$lib/auth/bootstrap';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import {
	clearPendingInviteToken,
	readPendingInviteToken,
} from '$lib/auth/pending-invite-token';
import { ApiError } from '@maya-invest/edaya-api-client';

function invitationAlreadySettled(error: unknown): boolean {
	if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') {
		return false;
	}
	const code = (error.body as { code?: string }).code;
	return code === 'INVITATION_ALREADY_ACCEPTED' || code === 'SUBJECT_ALREADY_LINKED';
}

export async function acceptPendingInviteIfPresent(): Promise<boolean> {
	const token = readPendingInviteToken();
	if (!token) {
		return false;
	}

	try {
		await acceptInvitation(token);
		clearPendingInviteToken();
		return true;
	}
	catch (error) {
		if (invitationAlreadySettled(error)) {
			clearPendingInviteToken();
			return true;
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
