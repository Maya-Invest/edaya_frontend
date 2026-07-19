import type { ClassAttendanceMode } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';
import {
	cleanupClassGroupDependencies,
} from '$lib/school/delete-class-group-cleanup';

const GRADE_CLASS_PREFIX: Record<string, string> = {
	'gl-6': '6',
	'gl-5': '5',
	'gl-4': '4',
	'gl-3': '3',
	'gl-2': '2',
	'gl-1': '1st',
	'gl-t': 'term',
};

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

function nextClassId(gradeLevelId: string): string {
	const prefix = GRADE_CLASS_PREFIX[gradeLevelId] ?? 'cls';
	const siblings = academicContext.classes.filter(c => c.gradeLevelId === gradeLevelId);
	let index = siblings.length;
	let id = index === 0 && prefix === '2' ? '2nd' : `${prefix}${String.fromCharCode(97 + index)}`;
	while (academicContext.classes.some(c => c.id === id)) {
		index += 1;
		id = `${prefix}${String.fromCharCode(97 + index)}`;
	}
	return id;
}

function trimestersForYear(yearId: string, startDate: string, endDate: string) {
	const startYear = Number.parseInt(startDate.slice(0, 4), 10);
	const endYear = Number.parseInt(endDate.slice(0, 4), 10);
	return [
		{
			id: `${yearId}-t1`,
			name: 'Trimestre 1',
			startDate,
			endDate: `${startYear}-12-19`,
		},
		{
			id: `${yearId}-t2`,
			name: 'Trimestre 2',
			startDate: `${endYear}-01-05`,
			endDate: `${endYear}-04-03`,
		},
		{
			id: `${yearId}-t3`,
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
	const numericIds = academicContext.years
		.map(y => Number.parseInt(y.id, 10))
		.filter(n => !Number.isNaN(n));
	const nextNumeric = (numericIds.length ? Math.max(...numericIds) : 2025) + 1;
	const yearId = String(nextNumeric);
	const yearName = label.trim() || `${nextNumeric - 1} — ${nextNumeric}`;
	const sid = schoolId();
	const client = getBrowserSchoolClient();

	const created = await runMutation(async () => {
		await client.commands.createAcademicYear({
			id: yearId,
			schoolId: sid,
			name: yearName,
			startDate,
			endDate,
		});

		for (const period of trimestersForYear(yearId, startDate, endDate)) {
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

export async function activateAcademicYearMutation(yearId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.activateAcademicYear({ academicYearId: yearId }));
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
	const id = nextClassId(gradeLevelId);
	const result = await runMutation(() => client.commands.createClassGroup({
		id,
		schoolId: schoolId(),
		academicYearId: academicContext.yearId,
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
