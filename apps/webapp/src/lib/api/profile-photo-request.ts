function readSession(key: string): string | undefined {
	try {
		return sessionStorage.getItem(key) ?? undefined;
	}
	catch {
		return undefined;
	}
}

function writeSession(key: string, value: string) {
	try {
		sessionStorage.setItem(key, value);
	}
	catch {
		// Private mode may reject sessionStorage; commands still send a fresh id.
	}
}

export function profilePhotoAttachmentStorageKey(ownerKind: string, ownerId: string): string {
	return `edaya.profile-photo.attachment.${ownerKind}.${ownerId}`;
}

export function studentPhotoCommandStorageKey(command: 'submit' | 'publish' | 'review', studentId: string): string {
	return `edaya.student-photo.${command}.${studentId}`;
}

export function readStoredId(key: string): string | undefined {
	const value = readSession(key)?.trim();
	return value || undefined;
}

export function persistStoredId(key: string, value: string) {
	writeSession(key, value);
}

export function stableRequestId(key: string): string {
	const existing = readStoredId(key);
	if (existing) {
		return existing;
	}
	const next = crypto.randomUUID();
	persistStoredId(key, next);
	return next;
}
