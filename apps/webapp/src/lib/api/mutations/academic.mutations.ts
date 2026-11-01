import type { ClassAttendanceMode } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { refreshAppShellData, runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { formatDateInput } from '$lib/date/format';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';
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

export function trimestersForYear(startDate: string, endDate: string) {
	const startYear = Number.parseInt(startDate.slice(0, 4), 10);
	const endYear = Number.parseInt(endDate.slice(0, 4), 10);
	const standard = [
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
	if (standard.every((period, index) => period.startDate >= startDate && period.endDate <= endDate && period.startDate <= period.endDate && (index === 0 || period.startDate > standard[index - 1]!.endDate))) {
		return standard;
	}
	const start = Date.parse(`${startDate}T00:00:00Z`);
	const days = Math.round((Date.parse(`${endDate}T00:00:00Z`) - start) / 86400000) + 1;
	const count = Math.min(3, days);
	return Array.from({ length: count }, (_, index) => ({
		id: crypto.randomUUID(),
		name: `Trimestre ${index + 1}`,
		startDate: new Date(start + Math.floor(index * days / count) * 86400000).toISOString().slice(0, 10),
		endDate: new Date(start + (Math.floor((index + 1) * days / count) - 1) * 86400000).toISOString().slice(0, 10),
	}));
}

export async function createAcademicYearMutation(
	startDate: string,
	endDate: string,
	options?: CalendarMutationOptions,
): Promise<string | null> {
	const yearId = crypto.randomUUID();
	const yearName = academicYearLabelFromDates(startDate, endDate);
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
	}, calendarMutationOptions(options));

	return created;
}

export interface CalendarMutationOptions {
	successMessage?: string;
	onRefreshed?: () => void | Promise<void>;
	onRefreshFailed?: () => void;
}

export interface AcademicCalendarFields {
	name: string;
	startDate: string;
	endDate: string;
}

export interface AcademicPeriodFields extends AcademicCalendarFields {
	type?: 'trimester' | 'semester' | 'other';
}

function calendarMutationOptions(options?: CalendarMutationOptions) {
	return {
		successMessage: options?.successMessage,
		versionKeys: ['school', 'subjectEnrollments', 'planning', 'evaluations', 'reportCards'] as ('school' | 'subjectEnrollments' | 'planning' | 'evaluations' | 'reportCards')[],
		onSuccess: async () => {
			try {
				await refreshAppShellData();
				await options?.onRefreshed?.();
			}
			catch (error) {
				options?.onRefreshFailed?.();
				throw error;
			}
		},
	};
}

export async function updateAcademicYearMutation(yearId: string, fields: AcademicCalendarFields, options?: CalendarMutationOptions): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(async () => {
		const current = await client.entities.academicYears.get(yearId);
		return client.entities.academicYears.save({ ...current, name: fields.name.trim(), startDate: fields.startDate === formatDateInput(current.startDate) ? current.startDate : fields.startDate, endDate: fields.endDate === formatDateInput(current.endDate) ? current.endDate : fields.endDate });
	}, calendarMutationOptions(options));
	return result !== null;
}

export async function createAcademicPeriodMutation(academicYearId: string, fields: AcademicPeriodFields, options?: CalendarMutationOptions): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => client.commands.createAcademicPeriod({
		id: crypto.randomUUID(),
		schoolId: schoolId(),
		academicYearId,
		name: fields.name.trim(),
		type: fields.type,
		startDate: fields.startDate,
		endDate: fields.endDate,
		isPublished: false,
	}), calendarMutationOptions(options));
	return result !== null;
}

export async function updateAcademicPeriodMutation(periodId: string, fields: AcademicPeriodFields, options?: CalendarMutationOptions): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(async () => {
		const current = await client.entities.academicPeriods.get(periodId);
		return client.entities.academicPeriods.save({ ...current, name: fields.name.trim(), type: fields.type, startDate: fields.startDate === formatDateInput(current.startDate) ? current.startDate : fields.startDate, endDate: fields.endDate === formatDateInput(current.endDate) ? current.endDate : fields.endDate });
	}, calendarMutationOptions(options));
	return result !== null;
}

export async function deleteAcademicYearMutation(id: string, options?: CalendarMutationOptions): Promise<boolean> {
	return await runMutation(() => getBrowserSchoolClient().entities.academicYears.delete({ id }), calendarMutationOptions(options)) !== null;
}

export async function deleteAcademicPeriodMutation(id: string, options?: CalendarMutationOptions): Promise<boolean> {
	return await runMutation(() => getBrowserSchoolClient().entities.academicPeriods.delete({ id }), calendarMutationOptions(options)) !== null;
}

export async function publishAcademicYearMutation(yearId: string, options?: CalendarMutationOptions): Promise<boolean> {
	return await runMutation(() => getBrowserSchoolClient().commands.publishAcademicYear({ academicYearId: yearId }), calendarMutationOptions(options)) !== null;
}

export async function archiveAcademicYearMutation(yearId: string, options?: CalendarMutationOptions): Promise<boolean> {
	return await runMutation(() => getBrowserSchoolClient().commands.archiveAcademicYear({ academicYearId: yearId }), calendarMutationOptions(options)) !== null;
}

export async function publishAcademicPeriodMutation(periodId: string, options?: CalendarMutationOptions): Promise<boolean> {
	return await runMutation(() => getBrowserSchoolClient().commands.publishAcademicPeriod({ academicPeriodId: periodId }), calendarMutationOptions(options)) !== null;
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
		name: toCanonicalCatalogText(name.trim()),
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
		name: toCanonicalCatalogText(patch.name ?? current?.name ?? ''),
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
