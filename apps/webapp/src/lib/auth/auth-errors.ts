export function isExistingAccountAuthError(
	error: { message?: string | null; code?: string | null } | null | undefined,
): boolean {
	if (!error) {
		return false;
	}

	const code = error.code ?? '';
	const message = error.message ?? '';
	return code.includes('USER_ALREADY_EXISTS') || /already exists/i.test(message);
}
