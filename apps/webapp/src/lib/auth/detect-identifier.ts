export interface LoginIdentifier { kind: 'email' | 'phone'; value: string }

/** Match the authentication service's identifier normalization and validation. */
export function detectIdentifier(input: string): LoginIdentifier | null {
	const email = input.trim().toLowerCase();
	if (email.length <= 254 && /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email))
		return { kind: 'email', value: email };
	const phone = input.trim().replace(/[ ().-]/g, '');
	if (/^\+[1-9]\d{6,14}$/.test(phone))
		return { kind: 'phone', value: phone };
	return null;
}

/** Phone use is permitted only after Identity advertises it for this session. */
export function contactError(identifier: LoginIdentifier | null, phoneAvailable: boolean): 'auth.invalidContact' | 'auth.phoneUnavailable' | null {
	if (!identifier)
		return 'auth.invalidContact';
	return identifier.kind === 'phone' && !phoneAvailable ? 'auth.phoneUnavailable' : null;
}
