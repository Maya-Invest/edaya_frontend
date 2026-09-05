/**
 * Health-profile command mapping without Svelte `$state` modules.
 * Bun tests on Linux cannot load `run-mutation.ts` / `session.svelte.ts`.
 */
export function isoLastVisitOrNull(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed.toISOString();
}

export function studentHealthProfileCommand(input: {
	id?: string;
	studentId: string;
	allergies?: string | null;
	medicalConditions?: string | null;
	medications?: string | null;
	clinicalNotes?: string | null;
	bloodType?: string | null;
	lastVisit?: string | null;
	emergencyProtocols?: string | null;
}) {
	return {
		id: input.id ?? `shp-${input.studentId}`,
		studentId: input.studentId,
		allergies: input.allergies ?? null,
		medicalConditions: input.medicalConditions ?? null,
		medications: input.medications ?? null,
		clinicalNotes: input.clinicalNotes ?? null,
		bloodType: input.bloodType ?? null,
		lastVisit: isoLastVisitOrNull(input.lastVisit),
		emergencyProtocols: input.emergencyProtocols ?? null,
	};
}
