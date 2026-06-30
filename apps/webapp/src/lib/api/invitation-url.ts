export function buildInviteUrl(token: string): string {
	const encoded = encodeURIComponent(token);
	if (typeof window !== 'undefined') {
		return `${window.location.origin}/invite/${encoded}`;
	}
	return `/invite/${encoded}`;
}
