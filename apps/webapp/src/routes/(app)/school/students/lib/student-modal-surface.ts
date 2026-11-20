export function isStudentProfileRouteId(routeId: string | null | undefined): boolean {
	return routeId?.endsWith('/students/[[id]]/(tabs)/profile') ?? false;
}

export function shouldCloseStudentHealthModal(
	activeModal: string | null,
	routeId: string | null | undefined,
	canUpdateHealth: boolean,
): boolean {
	return activeModal === 'edit-health'
		&& (!isStudentProfileRouteId(routeId) || !canUpdateHealth);
}
