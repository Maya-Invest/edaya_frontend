export function confirmAction(message: string): boolean {
	// eslint-disable-next-line no-alert
	return globalThis.confirm(message);
}
