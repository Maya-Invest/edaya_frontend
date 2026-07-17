import type { Incident } from '$lib/types/school';

export function summarizeStudentIncidents(incidents: readonly Incident[]): {
	sorted: Incident[];
	high: number;
	med: number;
	low: number;
} {
	const sorted = [...incidents].sort((left, right) => right.date.localeCompare(left.date));
	return {
		sorted,
		high: sorted.filter(incident => incident.severity === 'high').length,
		med: sorted.filter(incident => incident.severity === 'medium').length,
		low: sorted.filter(incident => incident.severity === 'low').length,
	};
}
