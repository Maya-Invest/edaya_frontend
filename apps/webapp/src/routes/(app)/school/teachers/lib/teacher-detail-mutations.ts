import type { components } from '$lib/api/schema';
import type { Teacher } from '$lib/types/school';
import type { TeachersPageState, TeacherUnavailability } from '../teachers-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { sendAccountInvitationMutation } from '$lib/api/mutations/invitation.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapTeacher } from '$lib/api/teachers-data';
import { authSession } from '$lib/auth/session.svelte';
import { runTeacherRouteMutation } from './teacher-route-mutation';
import { buildTeacherUnavailabilityPayload } from './teacher-unavailability';

type TeacherAssignment = components['schemas']['TeacherAssignment'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId
		|| academicContext.year?.id
		|| academicContext.years[0]?.id
		|| '';
}

function teacherInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

function buildOptimisticTeacher(input: {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
}): Teacher {
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	return {
		id: input.id,
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: teacherInitials(input.firstName, input.lastName),
		photoUrl: null,
		email,
		phone,
		isActive: true,
		subjectId: null,
	};
}

export async function createTeacherOnPage(
	state: TeachersPageState,
	input: {
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		sendAccountInvitation?: boolean;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = `tch-${Date.now().toString(36)}`;
	const email = input.email?.trim() ?? '';
	const optimistic = buildOptimisticTeacher({ id, ...input });

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teachers.save({
			id,
			schoolId: schoolId(),
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			email: email || null,
			phone: input.phone?.trim() || null,
			isActive: true,
		}),
		apply: () => {
			state.appendTeacher(optimistic);
		},
		rollback: () => {
			state.removeTeacher(id);
		},
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	if (!result) {
		return null;
	}

	if (input.sendAccountInvitation && email) {
		const invitation = await sendAccountInvitationMutation({
			kind: 'teacher',
			targetId: id,
			contactValue: email,
		});
		if (!invitation) {
			return null;
		}
	}

	return id;
}

export async function updateTeacherProfileOnPage(
	state: TeachersPageState,
	input: {
		teacherId: string;
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findTeacher(input.teacherId);
	let existing: components['schemas']['Teacher'];
	try {
		existing = await client.entities.teachers.get(input.teacherId);
	}
	catch {
		return false;
	}

	const patch = {
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: input.email?.trim() || null,
		phone: input.phone?.trim() || null,
	};

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teachers.save({
			...existing,
			...patch,
		}),
		apply: () => {
			state.patchTeacher(input.teacherId, mapTeacher({ ...existing, ...patch }));
		},
		rollback: () => {
			if (previous) {
				state.patchTeacher(input.teacherId, previous);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function updateTeacherStatusOnPage(
	state: TeachersPageState,
	input: {
		teacherId: string;
		isActive: boolean;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findTeacher(input.teacherId);
	let existing: components['schemas']['Teacher'];
	try {
		existing = await client.entities.teachers.get(input.teacherId);
	}
	catch {
		return false;
	}

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teachers.save({
			...existing,
			isActive: input.isActive,
		}),
		apply: () => {
			state.patchTeacher(input.teacherId, { isActive: input.isActive });
		},
		rollback: () => {
			if (previous) {
				state.patchTeacher(input.teacherId, { isActive: previous.isActive });
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function deleteTeacherOnPage(
	state: TeachersPageState,
	teacherId: string,
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findTeacher(teacherId);

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teachers.delete({ id: teacherId }),
		apply: () => {
			state.removeTeacher(teacherId);
		},
		rollback: () => {
			if (previous) {
				state.mergeTeachers([previous]);
			}
		},
		successMessage: options?.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export function createTeacherAssignmentPayload(input: {
	id: string;
	teacherId: string;
	kind: TeacherAssignment['kind'];
	classSubjectId?: string | null;
	classGroupId?: string | null;
}): TeacherAssignment {
	return {
		id: input.id,
		teacherId: input.teacherId,
		academicYearId: academicYearId(),
		kind: input.kind,
		classSubjectId: input.kind === 'subject' ? (input.classSubjectId ?? null) : null,
		classGroupId: input.classGroupId ?? null,
		responsibility: null,
		status: 'active',
	};
}

export async function saveTeacherAssignmentOnPage(
	state: TeachersPageState,
	input: {
		assignment: TeacherAssignment;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teacherAssignments.save(input.assignment),
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function deleteTeacherAssignmentOnPage(
	state: TeachersPageState,
	input: {
		id: string;
		teacherId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runTeacherRouteMutation({
		request: () => client.entities.teacherAssignments.delete({ id: input.id }),
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export function createTeacherUnavailabilityPayload(input: {
	id?: string;
	teacherId: string;
	recurrence: TeacherUnavailability['recurrence'];
	dayOfWeek?: TeacherUnavailability['dayOfWeek'];
	startTime?: string;
	endTime?: string;
	effectiveFrom?: string;
	effectiveUntil?: string;
	startsAt?: string;
	endsAt?: string;
	reason?: string;
	isActive?: boolean;
}): TeacherUnavailability {
	return buildTeacherUnavailabilityPayload({ ...input, academicYearId: academicYearId() });
}

export async function saveTeacherUnavailabilityOnPage(
	state: TeachersPageState,
	input: { rule: TeacherUnavailability; successMessage?: string },
): Promise<boolean> {
	const previous = state.teacherUnavailabilities.find(row => row.id === input.rule.id);
	const result = await runTeacherRouteMutation({
		request: () => getBrowserSchoolClient().entities.teacherUnavailabilities.save(input.rule),
		apply: () => state.upsertTeacherUnavailability(input.rule),
		rollback: () => previous
			? state.upsertTeacherUnavailability(previous)
			: state.removeTeacherUnavailability(input.rule.id),
		onSuccess: saved => state.upsertTeacherUnavailability(saved),
		successMessage: input.successMessage,
		versionKeys: ['teacherUnavailabilities', 'planning'],
	});
	return result !== null;
}

export async function deleteTeacherUnavailabilityOnPage(
	state: TeachersPageState,
	input: { id: string; successMessage?: string },
): Promise<boolean> {
	const previous = state.teacherUnavailabilities.find(row => row.id === input.id);
	const result = await runTeacherRouteMutation({
		request: () => getBrowserSchoolClient().entities.teacherUnavailabilities.delete({ id: input.id }),
		apply: () => state.removeTeacherUnavailability(input.id),
		rollback: () => {
			if (previous)
				state.upsertTeacherUnavailability(previous);
		},
		successMessage: input.successMessage,
		versionKeys: ['teacherUnavailabilities', 'planning'],
	});
	return result !== null;
}
