import type { ClassAttendanceMode } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';
import {
	cleanupClassGroupDependencies,
} from '$lib/school/delete-class-group-cleanup';

function schoolId(): string {
	const sid = authSession.schoolId;
	if (!sid) {
		throw new Error('Missing school session');
	}
	return sid;
}

function yearDisplayName(label: string, startDate: string, endDate: string): string {
	const trimmed = label.trim();
	if (trimmed) {
		return trimmed;
	}
	const startYear = startDate.slice(0, 4);
	const endYear = endDate.slice(0, 4);
	return `${startYear} — ${endYear}`;
}

function trimestersForYear(startDate: string, endDate: string) {
	const startYear = Number.parseInt(startDate.slice(0, 4), 10);
	const endYear = Number.parseInt(endDate.slice(0, 4), 10);
	return [
		{
			id: crypto.randomUUID(),
			name: 'Trimestre 1',
			startDate,
			endDate: `${startYear}-12-19`,
		},
		{
			id: crypto.randomUUID(),
			name: 'Trimestre 2',
			startDate: `${endYear}-01-05`,
			endDate: `${endYear}-04-03`,
		},
		{
			id: crypto.randomUUID(),
			name: 'Trimestre 3',
			startDate: `${endYear}-04-20`,
			endDate,
		},
	];
}

export async function createAcademicYearMutation(
	label: string,
	startDate: string,
	endDate: string,
	options?: { successMessage?: string },
): Promise<string | null> {
	const yearId = crypto.randomUUID();
	const yearName = yearDisplayName(label, startDate, endDate);
	const client = getBrowserSchoolClient();

	const created = await runMutation(async () => {
		const sid = schoolId();
		await client.commands.createAcademicYear({
			id: yearId,
			schoolId: sid,
			name: yearName,
			startDate,
			endDate,
		});

		for (const period of trimestersForYear(startDate, endDate)) {
			await client.commands.createAcademicPeriod({
				id: period.id,
				schoolId: sid,
				academicYearId: yearId,
				name: period.name,
				type: 'trimester',
				startDate: period.startDate,
				endDate: period.endDate,
				isPublished: false,
			});
		}

		return yearId;
	}, { successMessage: options?.successMessage });

	return created;
}

export async function publishAcademicYearMutation(yearId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.publishAcademicYear({ academicYearId: yearId }));
	return result !== null;
}

export async function archiveAcademicYearMutation(yearId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.archiveAcademicYear({ academicYearId: yearId }));
	return result !== null;
}

export async function publishAcademicPeriodMutation(periodId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.publishAcademicPeriod({ academicPeriodId: periodId }));
	return result !== null;
}

export interface ClassGroupProfilePatch {
	name?: string;
	capacity?: number | null;
	attendanceMode?: ClassAttendanceMode;
	homeroomStaffId?: string | null;
}

export async function createClassGroupMutation(
	name: string,
	gradeLevelId: string,
	options?: {
		successMessage?: string;
		attendanceMode?: ClassAttendanceMode;
		homeroomStaffId?: string | null;
		capacity?: number | null;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const academicYearId = academicContext.resolveAcademicYearIdForApi();
	if (!academicYearId) {
		return false;
	}
	const id = crypto.randomUUID();
	const result = await runMutation(() => client.commands.createClassGroup({
		id,
		schoolId: schoolId(),
		academicYearId,
		gradeLevelId,
		name: name.trim(),
		capacity: options?.capacity ?? null,
		attendanceMode: options?.attendanceMode ?? 'session',
		homeroomStaffId: options?.homeroomStaffId ?? null,
	}), {
		successMessage: options?.successMessage,
		refresh: true,
	});
	return result !== null;
}

export async function updateClassGroupMutation(
	classGroupId: string,
	patch: ClassGroupProfilePatch,
	options?: { successMessage?: string },
): Promise<boolean> {
	const current = academicContext.classes.find(entry => entry.id === classGroupId);
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.updateClassGroupConfiguration({
		classGroupId,
		name: patch.name ?? current?.name,
		capacity: patch.capacity !== undefined ? patch.capacity : (current?.capacity ?? null),
		attendanceMode: patch.attendanceMode ?? current?.attendanceMode ?? 'session',
		homeroomStaffId: patch.homeroomStaffId !== undefined
			? patch.homeroomStaffId
			: (current?.homeroomStaffId ?? null),
	}), {
		successMessage: options?.successMessage,
		refresh: true,
	});
	return result !== null;
}

export async function deleteClassGroupMutation(
	classGroupId: string,
	options?: { successMessage?: string; errorMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		async () => {
			await cleanupClassGroupDependencies(client, classGroupId);
			await client.entities.classGroups.delete({ id: classGroupId });
		},
		{
			successMessage: options?.successMessage,
			errorMessage: options?.errorMessage,
			refresh: false,
			onSuccess: navigateToListAfterEntityDelete,
		},
	);

	return result !== null;
}
