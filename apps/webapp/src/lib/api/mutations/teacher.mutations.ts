import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { sendAccountInvitationMutation } from '$lib/api/mutations/invitation.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { navigateToListAfterEntityDelete } from '$lib/navigation/navigate-after-delete';

type TeacherAssignment = components['schemas']['TeacherAssignment'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId;
}

export async function createTeacherMutation(input: {
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	sendAccountInvitation?: boolean;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = crypto.randomUUID();
	const email = input.email?.trim() ?? '';

	const result = await runMutation(() => client.commands.registerTeacher({
		id,
		schoolId: schoolId(),
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		phone: input.phone?.trim() || null,
		isActive: true,
	}), {
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

export async function updateTeacherProfileMutation(input: {
	teacherId: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
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

	const result = await runMutation(() => client.entities.teachers.save({
		...existing,
		...patch,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function updateTeacherStatusMutation(input: {
	teacherId: string;
	isActive: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	let existing: components['schemas']['Teacher'];
	try {
		existing = await client.entities.teachers.get(input.teacherId);
	}
	catch {
		return false;
	}

	const result = await runMutation(() => client.entities.teachers.save({
		...existing,
		isActive: input.isActive,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function deleteTeacherMutation(
	teacherId: string,
	opts?: { successMessage?: string; navigate?: boolean },
): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(() => client.entities.teachers.delete({ id: teacherId }), {
		successMessage: opts?.successMessage,
		versionKeys: ['teachers'],
		onSuccess: opts?.navigate === false ? undefined : navigateToListAfterEntityDelete,
	});

	return result !== null;
}

export async function saveTeacherAssignmentMutation(input: {
	assignment: TeacherAssignment;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(() => client.entities.teacherAssignments.save(input.assignment), {
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function deleteTeacherAssignmentMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(() => client.entities.teacherAssignments.delete({ id: input.id }), {
		successMessage: input.successMessage,
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
