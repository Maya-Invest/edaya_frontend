export interface InvitationSessionPreview {
	kind: string;
	targetId: string;
	contactEmail?: string;
}

export interface InvitationSessionSnapshot {
	isLoggedIn: boolean;
	hasAuthAccount: boolean;
	userId: string | null;
	sessionKind: string | null;
	loginEmail: string | null;
}

function normalizeEmail(value: string | null | undefined): string | undefined {
	const normalized = value?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : undefined;
}

export function invitationEmailMatchesSession(
	preview: Pick<InvitationSessionPreview, 'contactEmail'>,
	loginEmail: string | null | undefined,
): boolean {
	const invited = normalizeEmail(preview.contactEmail);
	const current = normalizeEmail(loginEmail);
	return Boolean(invited && current && invited === current);
}

export function sessionBlocksInvitationAccept(
	preview: InvitationSessionPreview,
	session: InvitationSessionSnapshot,
): boolean {
	const invited = normalizeEmail(preview.contactEmail);
	const current = normalizeEmail(session.loginEmail);
	if (invited && current && invited !== current) {
		return true;
	}

	if (
		session.isLoggedIn
		&& session.sessionKind
		&& session.userId
		&& session.sessionKind === preview.kind
		&& session.userId !== preview.targetId
	) {
		return true;
	}

	return false;
}

export function canAcceptInvitationWithCurrentSession(
	preview: Pick<InvitationSessionPreview, 'contactEmail'>,
	session: Pick<InvitationSessionSnapshot, 'hasAuthAccount' | 'isLoggedIn' | 'loginEmail'>,
): boolean {
	if (!session.hasAuthAccount && !session.isLoggedIn) {
		return false;
	}
	return invitationEmailMatchesSession(preview, session.loginEmail);
}
