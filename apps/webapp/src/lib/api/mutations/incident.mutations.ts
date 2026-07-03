import type { components } from '$lib/api/schema';
import type { Incident } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';
type ApiIncident = components['schemas']['Incident'];
export type IncidentInvolvementRole = 'subject' | 'witness' | 'victim';

export interface ResolveIncidentStudentInput {
	studentId: string;
	role: IncidentInvolvementRole;
	notes?: string;
	involvementId?: string;
	disciplinaryActionId?: string;
}

function incidentCategoryFromKind(kind: IncidentKind): Incident['category'] {
	switch (kind) {
		case 'positive':
			return 'Behavior';
		case 'minor_infraction':
			return 'Tardiness';
		case 'major_infraction':
			return 'Conflict';
		default:
			return 'Other';
	}
}

function incidentSeverityFromKind(kind: IncidentKind): Incident['severity'] {
	switch (kind) {
		case 'positive':
			return 'low';
		case 'minor_infraction':
			return 'low';
		case 'major_infraction':
			return 'medium';
		default:
			return 'high';
	}
}

function incidentSnapshot(incidentId: string): Incident | undefined {
	return detailDataContext.incidents.find(incident => incident.id === incidentId);
}

function buildStoreIncident(input: {
	studentId: string;
	title: string;
	description: string;
	kind: IncidentKind;
	date?: string;
}, incidentId: string): Incident {
	return {
		id: incidentId,
		studentId: input.studentId,
		date: input.date ?? new Date().toISOString().slice(0, 10),
		category: incidentCategoryFromKind(input.kind),
		severity: incidentSeverityFromKind(input.kind),
		summary: input.title.trim(),
		status: 'open',
	};
}

export async function recordIncidentMutation(input: {
	schoolId: string;
	studentId: string;
	classGroupId?: string;
	title: string;
	description: string;
	kind: IncidentKind;
	date?: string;
	incidentId?: string;
	successMessage?: string;
	apply?: () => void;
	rollback?: () => void;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const incidentDate = input.date ?? now.slice(0, 10);
	const incidentId = input.incidentId ?? `inc-${input.studentId}-${Date.now().toString(36)}`;
	const involvementId = `involv-${incidentId}-${input.studentId}`;
	const optimistic = buildStoreIncident(input, incidentId);

	const result = await runMutation(async () => {
		await client.commands.recordIncident({
			id: incidentId,
			schoolId: input.schoolId,
			title: input.title.trim(),
			description: input.description.trim(),
			date: incidentDate,
			kind: input.kind,
			classGroupId: input.classGroupId ?? null,
			lessonSessionId: null,
			createdAt: now,
		});
		return client.commands.addStudentInvolvement({
			id: involvementId,
			incidentId,
			studentId: input.studentId,
			role: 'subject',
			notes: null,
			createdAt: now,
		});
	}, {
		successMessage: input.successMessage,
		apply: input.apply ?? (() => {
			detailDataContext.appendIncident(optimistic);
		}),
		rollback: input.rollback ?? (() => {
			detailDataContext.removeIncident(incidentId);
		}),
	});
	return result ? incidentId : null;
}

export async function updateIncidentMutation(input: {
	incidentId: string;
	title: string;
	description: string;
	kind: IncidentKind;
	date?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = incidentSnapshot(input.incidentId);
	const patch = {
		summary: input.title.trim(),
		date: input.date ?? previous?.date ?? new Date().toISOString().slice(0, 10),
		category: incidentCategoryFromKind(input.kind),
		severity: incidentSeverityFromKind(input.kind),
	};

	const result = await runMutation(async () => {
		const existing = await client.entities.incidents.get(input.incidentId);
		const payload: ApiIncident = {
			...existing,
			title: input.title.trim(),
			description: input.description.trim(),
			kind: input.kind,
			date: input.date ?? existing.date,
			updatedAt: new Date().toISOString(),
		};
		return client.entities.incidents.save(payload);
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchIncident(input.incidentId, patch);
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchIncident(input.incidentId, previous);
			}
		},
	});
	return result !== null;
}

export async function resolveIncidentWithOutcomesMutation(input: {
	incidentId: string;
	resolutionNotes?: string;
	involvedStudents: ResolveIncidentStudentInput[];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const involvedStudents = input.involvedStudents.map((entry) => ({
		id: entry.involvementId ?? `involv-${input.incidentId}-${entry.studentId}`,
		studentId: entry.studentId,
		role: entry.role,
		notes: entry.notes?.trim() || undefined,
		createdAt: now,
	}));
	const sanctions = input.involvedStudents
		.filter(entry => entry.disciplinaryActionId)
		.map((entry, index) => ({
			id: `sda-${input.incidentId}-${entry.studentId}-${index}`,
			studentId: entry.studentId,
			disciplinaryActionId: entry.disciplinaryActionId!,
			createdAt: now,
		}));

	const result = await runMutation(() => client.commands.resolveIncidentWithOutcomes({
		incidentId: input.incidentId,
		resolutionNotes: input.resolutionNotes?.trim() || undefined,
		involvedStudents,
		sanctions: sanctions.length > 0 ? sanctions : undefined,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchIncident(input.incidentId, { status: 'resolved' });
		},
	});
	return result !== null;
}

export async function resolveIncidentMutation(input: {
	incidentId: string;
	resolutionNotes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.resolveIncident({
		incidentId: input.incidentId,
		resolutionNotes: input.resolutionNotes?.trim() || undefined,
		resolvedAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchIncident(input.incidentId, { status: 'resolved' });
		},
	});
	return result !== null;
}
