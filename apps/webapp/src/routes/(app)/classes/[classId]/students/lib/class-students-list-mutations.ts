import type { ClassStudentsPageState } from '../class-students-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso } from '$lib/date/format';
import { humanCreationInput } from '$lib/people-profile-fields';
import { runStudentRouteMutation } from '../../../../school/students/lib/student-route-mutation';

function schoolId(): string {
	return authSession.schoolId ?? '';
}

export async function createClassStudentOnPage(state: ClassStudentsPageState, input: {
	firstName: string;
	profile?: Record<string, string>;
	lastName: string;
	classGroupId: string;
	birthDate?: string;
	sendAccountInvitation?: boolean;
	inviteEmail?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId) {
		return null;
	}

	const creation = humanCreationInput(input.profile);
	const studentId = creation.id;
	const enrollmentId = `enr-${studentId}`;
	const now = new Date().toISOString();
	const birthDate = dateInputToIso(input.birthDate ?? '');

	const result = await runStudentRouteMutation({
		request: async () => {
			await client.commands.registerStudent({
				...creation,
				schoolId: resolvedSchoolId,
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				birthDate,
				sendAccountInvitation: input.sendAccountInvitation ?? true,
				...(input.inviteEmail?.trim() ? { inviteEmail: input.inviteEmail.trim() } : {}),
			});
			await client.commands.enrollStudent({
				id: enrollmentId,
				studentId,
				classGroupId: input.classGroupId,
				createdAt: now,
			});
			return studentId;
		},
		successMessage: input.successMessage,
		versionKeys: ['students', 'enrollments'],
	});

	if (result === null) {
		return null;
	}

	await state.ensureSelectedStudent(studentId);
	return studentId;
}
