/** Store date-only expiry inputs as end-of-day UTC so publish-time validation matches user intent. */
export function announcementExpiresAtIso(dateOnly: string | undefined): string | undefined {
	const trimmed = dateOnly?.trim();
	if (!trimmed) {
		return undefined;
	}
	return `${trimmed}T23:59:59.999Z`;
}
