import type { SchoolYearEvent } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';
import { refreshReportCardCatalog } from '$lib/queries/report-cards.queries';

interface DeleteOpts {
	successMessage?: string;
	/** Navigate back to list route (default true). */
	navigate?: boolean;
}

async function deleteWithStore(
	deleteFn: () => Promise<unknown>,
	apply: () => void,
	rollback: () => void,
	opts?: DeleteOpts,
): Promise<boolean> {
	const result = await runMutation(deleteFn, {
		successMessage: opts?.successMessage,
		apply,
		rollback,
		onSuccess: opts?.navigate === false ? undefined : navigateToListAfterEntityDelete,
	});
	return result !== null;
}

function snapshot<T>(list: T[], id: string, key: keyof T & string): T | undefined {
	return list.find(entry => entry[key as keyof T] === id);
}

export async function deleteHomeworkMutation(
	assignmentId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.deadlines, assignmentId, 'id');
	return deleteWithStore(
		() => client.entities.homeworkAssignments.delete({ id: assignmentId }),
		() => detailDataContext.removeDeadline(assignmentId),
		() => {
			if (previous)
				detailDataContext.appendDeadline(previous);
		},
		opts,
	);
}

export async function deleteAssessmentMutation(
	assessmentId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.evaluations, assessmentId, 'id');
	return deleteWithStore(
		() => client.entities.assessments.delete({ id: assessmentId }),
		() => detailDataContext.removeEvaluation(assessmentId),
		() => {
			if (previous)
				detailDataContext.appendEvaluation(previous);
		},
		opts,
	);
}

export async function deleteActivityMutation(
	activityId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.activities, activityId, 'id');
	return deleteWithStore(
		() => client.entities.activities.delete({ id: activityId }),
		() => detailDataContext.removeActivity(activityId),
		() => {
			if (previous)
				detailDataContext.appendActivity(previous);
		},
		opts,
	);
}

export async function deleteAnnouncementMutation(
	announcementId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.announcements, announcementId, 'id');
	return deleteWithStore(
		() => client.entities.announcements.delete({ id: announcementId }),
		() => detailDataContext.removeAnnouncement(announcementId),
		() => {
			if (previous)
				detailDataContext.appendAnnouncement(previous);
		},
		opts,
	);
}

export async function deleteFeeMutation(feeId: string, opts?: DeleteOpts): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.fees, feeId, 'id');
	return deleteWithStore(
		() => client.entities.fees.delete({ id: feeId }),
		() => detailDataContext.removeFee(feeId),
		() => {
			if (previous)
				detailDataContext.appendFee(previous);
		},
		opts,
	);
}

export async function deleteStudentFeeMutation(
	studentFeeId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.billing, studentFeeId, 'id');
	return deleteWithStore(
		() => client.entities.studentFees.delete({ id: studentFeeId }),
		() => detailDataContext.removeBilling(studentFeeId),
		() => {
			if (previous)
				detailDataContext.appendBilling(previous);
		},
		opts,
	);
}

export async function deleteSessionMutation(
	sessionId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.planning, sessionId, 'id');
	return deleteWithStore(
		() => client.entities.sessions.delete({ id: sessionId }),
		() => detailDataContext.removePlanningEvent(sessionId),
		() => {
			if (previous)
				detailDataContext.appendPlanningEvent(previous);
		},
		opts,
	);
}

export async function deleteGuardianMutation(
	guardianId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.guardians, guardianId, 'id');
	return deleteWithStore(
		() => client.entities.guardians.delete({ id: guardianId }),
		() => detailDataContext.removeGuardian(guardianId),
		() => {
			if (previous)
				detailDataContext.seedGuardians([previous]);
		},
		opts,
	);
}

export async function deleteStaffMemberMutation(
	staffId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.staff, staffId, 'id');
	return deleteWithStore(
		() => client.entities.staffMembers.delete({ id: staffId }),
		() => detailDataContext.removeStaff(staffId),
		() => {
			if (previous)
				detailDataContext.seedStaff([previous]);
		},
		opts,
	);
}

export async function deleteIncidentMutation(
	incidentId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.incidents, incidentId, 'id');
	return deleteWithStore(
		() => client.entities.incidents.delete({ id: incidentId }),
		() => detailDataContext.removeIncident(incidentId),
		() => {
			if (previous)
				detailDataContext.appendIncident(previous);
		},
		opts,
	);
}

export async function deleteClassSubjectMutation(
	classSubjectId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = snapshot(detailDataContext.subjects, classSubjectId, 'id');
	return deleteWithStore(
		() => client.entities.classSubjects.delete({ id: classSubjectId }),
		() => detailDataContext.removeSubject(classSubjectId),
		() => {
			if (previous)
				detailDataContext.seedSubjects([previous], { classId: previous.classId });
		},
		opts,
	);
}

export async function deleteReportCardDefinitionMutation(
	definitionId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.definitions.delete({ id: definitionId }),
		{
			successMessage: opts?.successMessage,
			onSuccess: async () => {
				await refreshReportCardCatalog();
				if (opts?.navigate !== false) {
					await navigateToListAfterEntityDelete();
				}
			},
		},
	);
	return result !== null;
}

export async function deleteGradeScaleMutation(
	gradeScaleId: string,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.gradeScales.delete({ id: gradeScaleId }),
		{
			successMessage: opts?.successMessage,
			onSuccess: async () => {
				await refreshReportCardCatalog();
			},
		},
	);
	return result !== null;
}

export async function deleteSchoolYearEventMutation(
	event: Pick<SchoolYearEvent, 'id' | 'linkedIds'>,
	opts?: DeleteOpts,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const ids = event.linkedIds?.length ? [...event.linkedIds] : [event.id];
	const previous = ids
		.map(id => snapshot(detailDataContext.schoolYearEvents, id, 'id'))
		.filter((entry): entry is SchoolYearEvent => entry !== undefined);

	return deleteWithStore(
		() => (ids.length === 1
			? client.entities.calendarEvents.delete({ id: ids[0] })
			: client.entities.calendarEvents.batchDelete({ ids })),
		() => {
			for (const id of ids) {
				detailDataContext.removeSchoolYearEvent(id);
			}
		},
		() => {
			for (const entry of previous) {
				detailDataContext.appendSchoolYearEvent(entry);
			}
		},
		opts,
	);
}
