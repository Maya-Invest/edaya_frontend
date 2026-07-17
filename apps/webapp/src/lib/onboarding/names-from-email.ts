export function namesFromInviteEmail(email: string): { firstName: string; lastName: string } {
	const local = email.split('@')[0] ?? 'invite';
	const parts = local.replace(/[._+-]+/g, ' ').split(/\s+/).filter(Boolean);

	const capitalize = (value: string) =>
		value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

	if (parts.length >= 2) {
		return {
			firstName: capitalize(parts[0]!),
			lastName: capitalize(parts.slice(1).join(' ')),
		};
	}

	return {
		firstName: capitalize(parts[0] ?? 'Invite'),
		lastName: '—',
	};
}
