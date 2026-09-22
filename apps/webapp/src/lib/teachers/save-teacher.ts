import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface SaveTeacherInput {
	schoolId: string;
	teacherId: string;
	firstName: string;
	lastName: string;
	code?: string;
	email?: string;
	phone?: string;
	subjectId?: string | null;
}

export async function saveTeacher(
	client: SchoolClient,
	input: SaveTeacherInput,
): Promise<void> {
	const email = input.email?.trim() ?? '';
	const phone = input.phone?.trim() ?? '';
	const code = input.code?.trim() || undefined;

	await client.commands.registerTeacher({
		id: input.teacherId,
		schoolId: input.schoolId,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		...(code ? { code } : {}),
		email: email || null,
		phone: phone || null,
		subjectId: input.subjectId ?? null,
		isActive: true,
	});
}

export function createTeacherImportIds(index: number, seed = Date.now().toString(36)): { teacherId: string } {
	return {
		teacherId: `tch-${seed}-${index}`,
	};
}
