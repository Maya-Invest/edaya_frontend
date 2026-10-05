import { acceptInvitation, fetchInvitationPreview } from '$lib/api/invitation-data';
import { bootstrapSessionAfterInvite } from '$lib/auth/accept-pending-invite';
import { getAuthenticatedAuthUser, resetBootstrapSession } from '$lib/auth/bootstrap';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';

/** Invitation I/O; the view keeps credentials and URL-driven authentication stages. */
export class InvitationPageState {
	loadPreview = (token: string) => fetchInvitationPreview(token);
	accept = (token: string) => acceptInvitation(token);

	async authenticate() {
		const user = await getAuthenticatedAuthUser();
		if (!user)
			return false;
		authSession.setAuthAccountOnly({ authUserId: user.id, loginEmail: user.email ?? null });
		return true;
	}

	async logout() {
		await authSession.logout();
		this.resetSession();
	}

	resetSession() {
		resetAppShellBootstrap();
		resetBootstrapSession();
	}

	reloadLinkedSession() {
		this.resetSession();
		return bootstrapSessionAfterInvite();
	}
}
