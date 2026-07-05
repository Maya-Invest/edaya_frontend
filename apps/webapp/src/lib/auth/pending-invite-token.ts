const STORAGE_KEY = 'edaya:pending-invite-token';

export function persistPendingInviteToken(token: string): void {
	if (typeof sessionStorage === 'undefined' || !token.trim()) {
		return;
	}
	sessionStorage.setItem(STORAGE_KEY, token.trim());
}

export function readPendingInviteToken(): string | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}
	return sessionStorage.getItem(STORAGE_KEY);
}

export function clearPendingInviteToken(): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(STORAGE_KEY);
}

export function pendingInvitePath(token?: string | null): string | null {
	const value = token?.trim() || readPendingInviteToken();
	if (!value) {
		return null;
	}
	return `/invite/${encodeURIComponent(value)}`;
}
