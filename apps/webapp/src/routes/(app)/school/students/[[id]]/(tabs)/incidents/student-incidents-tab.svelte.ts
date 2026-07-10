import type { Incident } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadIncidentRouteData } from '$lib/api/school-life-data';
import { authSession } from '$lib/auth/session.svelte';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { schoolStudentDetailIdFromUrl } from '../../../students-page.svelte';
import { summarizeStudentIncidents } from './student-incidents-tab.selectors';

export { summarizeStudentIncidents };

const STUDENT_INCIDENTS_TAB_KEY = Symbol('student-incidents-tab');

type IncidentKind = 'positive' | 'minor_infraction' | 'major_infraction' | 'emergency';

export interface StudentIncidentsTabSlice {
	studentId: string;
	incidents: Incident[];
}

export type StudentIncidentsTabSeed = Partial<Omit<StudentIncidentsTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentIncidentsTabSlice {
	return { studentId, incidents: [] };
}

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
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

export class StudentIncidentsTabState {
	slice = $state<StudentIncidentsTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentIncidentsTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	incidentsSummaryFor(studentId: string) {
		const incidents = (this.forStudent(studentId)?.incidents ?? [])
			.filter(incident => incident.involvedStudentIds.includes(studentId));
		return summarizeStudentIncidents(incidents);
	}

	appendIncident(incident: Incident) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			incidents: [...this.slice.incidents, incident],
		};
	}

	removeIncident(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			incidents: this.slice.incidents.filter(incident => incident.id !== id),
		};
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = schoolStudentDetailIdFromUrl(url);
				if (!studentId) {
					return {};
				}

				const resolvedSchoolId = schoolId();
				if (!resolvedSchoolId) {
					return {};
				}

				const scope = {
					schoolId: resolvedSchoolId,
					academicYearId: academicContext.yearId,
				};
				const { incidents } = await loadIncidentRouteData(getBrowserSchoolClient(), scope);
				this.seed(studentId, {
					incidents: incidents.filter(incident => incident.involvedStudentIds.includes(studentId)),
				});
				return {};
			},
			hasItems: () => true,
		});
	}

	async recordIncident(input: {
		schoolId: string;
		studentId: string;
		classGroupId?: string;
		title: string;
		description: string;
		kind: IncidentKind;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const now = new Date().toISOString();
		const incidentDate = now.slice(0, 10);
		const incidentId = `inc-${input.studentId}-${Date.now().toString(36)}`;
		const involvementId = `involv-${incidentId}-${input.studentId}`;
		const optimisticIncident: Incident = {
			id: incidentId,
			studentId: input.studentId,
			involvedStudentIds: [input.studentId],
			involvedCount: 1,
			date: incidentDate,
			category: incidentCategoryFromKind(input.kind),
			severity: incidentSeverityFromKind(input.kind),
			summary: input.title.trim(),
			status: 'open',
		};

		const result = await runStudentRouteMutation(async () => {
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
			await client.commands.addStudentInvolvement({
				id: involvementId,
				incidentId,
				studentId: input.studentId,
				role: 'subject',
				notes: null,
				createdAt: now,
			});
			return incidentId;
		}, {
			successMessage: input.successMessage,
			apply: () => {
				this.appendIncident(optimisticIncident);
			},
			rollback: () => {
				this.removeIncident(incidentId);
			},
		});
		return result !== null;
	}
}

export function setStudentIncidentsTabState(state: StudentIncidentsTabState) {
	setContext(STUDENT_INCIDENTS_TAB_KEY, state);
}

export function getStudentIncidentsTabState() {
	return getContext<StudentIncidentsTabState>(STUDENT_INCIDENTS_TAB_KEY);
}
