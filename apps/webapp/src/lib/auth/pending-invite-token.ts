const STORAGE_KEY = 'edaya:pending-invite-token';

function readStore(store: Storage | undefined): string | null {
	try {
		return store?.getItem(STORAGE_KEY) ?? null;
	}
	catch {
		return null;
	}
}

function writeStore(store: Storage | undefined, value: string | null): void {
	try {
		if (!store) {
			return;
		}
		if (value) {
			store.setItem(STORAGE_KEY, value);
			return;
		}
		store.removeItem(STORAGE_KEY);
	}
	catch {
		// Private mode can deny web storage.
	}
}

export function persistPendingInviteToken(token: string): void {
	const value = token.trim();
	if (!value) {
		return;
	}
	// localStorage survives the email-verification tab that sessionStorage does not share.
	writeStore(globalThis.localStorage, value);
	writeStore(globalThis.sessionStorage, value);
}

export function readPendingInviteToken(): string | null {
	return readStore(globalThis.localStorage) ?? readStore(globalThis.sessionStorage);
}

export function clearPendingInviteToken(): void {
	writeStore(globalThis.localStorage, null);
	writeStore(globalThis.sessionStorage, null);
}

export function pendingInvitePath(token?: string | null): string | null {
	const value = token?.trim() || readPendingInviteToken();
	if (!value) {
		return null;
	}
	return `/invite/${encodeURIComponent(value)}`;
}
