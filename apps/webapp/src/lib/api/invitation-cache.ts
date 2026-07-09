const PREFIX = 'edaya:pending-invitation:';

export function cachePendingInvitation(
	kind: string,
	targetId: string,
	invitationId: string,
): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.setItem(`${PREFIX}${kind}:${targetId}`, invitationId);
}

export function readPendingInvitation(kind: string, targetId: string): string | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}
	return sessionStorage.getItem(`${PREFIX}${kind}:${targetId}`);
}

export function clearPendingInvitation(kind: string, targetId: string): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(`${PREFIX}${kind}:${targetId}`);
}
