type TraceDetail = Record<string, unknown>;

const TRACE_FLAG_KEY = 'edaya:trace';
const DEFAULT_DEV_SCOPES = ['students.filters', 'list.filters'];

function enabledScopes(): Set<string> | 'all' | null {
	if (!import.meta.env.DEV) {
		return null;
	}
	if (typeof localStorage === 'undefined') {
		return new Set(DEFAULT_DEV_SCOPES);
	}

	const raw = localStorage.getItem(TRACE_FLAG_KEY);
	if (raw === null) {
		return new Set(DEFAULT_DEV_SCOPES);
	}
	if (raw === '' || raw === 'off') {
		return null;
	}
	if (raw === '*') {
		return 'all';
	}
	return new Set(raw.split(',').map(part => part.trim()).filter(Boolean));
}

/** Dev-only console traces. Toggle with localStorage `edaya:trace` (`*`, `off`, or comma-separated scopes). */
export function devTrace(scope: string, message: string, detail?: TraceDetail) {
	const scopes = enabledScopes();
	if (!scopes) {
		return;
	}
	if (scopes !== 'all' && !scopes.has(scope)) {
		return;
	}

	if (detail) {
		console.debug(`[edaya:${scope}] ${message}`, detail);
	}
	else {
		console.debug(`[edaya:${scope}] ${message}`);
	}
}
