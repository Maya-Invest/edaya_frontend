/** Best-effort storage for non-secret preferences, never authentication authority. */
export type PreferenceStorage = 'local' | 'session';

const pending = new Map<string, string | null>();

function storage(kind: PreferenceStorage): Storage | undefined {
	return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
}

export function readPreference(kind: PreferenceStorage, key: string): string | null {
	const memoryKey = `${kind}:${key}`;
	if (pending.has(memoryKey)) {
		return pending.get(memoryKey) ?? null;
	}
	try {
		return storage(kind)?.getItem(key) ?? null;
	}
	catch {
		return null;
	}
}

export function writePreference(kind: PreferenceStorage, key: string, value: string | null): void {
	const memoryKey = `${kind}:${key}`;
	try {
		const target = storage(kind);
		if (!target) {
			pending.set(memoryKey, value);
			return;
		}
		if (value === null) {
			target.removeItem(key);
		}
		else {
			target.setItem(key, value);
		}
		pending.delete(memoryKey);
	}
	catch {
		pending.set(memoryKey, value);
	}
}
