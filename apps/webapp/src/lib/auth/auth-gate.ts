const AUTH_GATE_KEY = 'edaya:auth-gate';

export function markAuthGatePassed(): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.setItem(AUTH_GATE_KEY, '1');
}

export function hasAuthGatePassed(): boolean {
	if (typeof sessionStorage === 'undefined') {
		return false;
	}
	return sessionStorage.getItem(AUTH_GATE_KEY) === '1';
}

export function clearAuthGate(): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(AUTH_GATE_KEY);
}
