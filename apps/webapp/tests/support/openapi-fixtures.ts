import type { components } from '$lib/api/schema';
import type { StaffMemberProfileRolePatch } from '$lib/staff/staff-profile-roles';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';

type StaffMember = components['schemas']['StaffMember'];
type Subject = components['schemas']['Subject'];
type StudentNote = components['schemas']['StudentNote'];
type ClassSubject = components['schemas']['ClassSubject'];
type LessonSession = components['schemas']['LessonSession'];
type Assessment = components['schemas']['Assessment'];

const HUMAN_STAFF_DEFAULTS = {
	accountKind: 'human' as const,
	serviceElevated: false,
	isActive: true,
};

export function staffMember(
	overrides: Partial<StaffMember> & Pick<StaffMember, 'id' | 'firstName' | 'lastName'> & StaffMemberProfileRolePatch,
): StaffMember & StaffMemberProfileRolePatch {
	return {
		...HUMAN_STAFF_DEFAULTS,
		schoolId: SEED_SCHOOL_ID,
		...overrides,
	};
}

export function subject(
	overrides: Partial<Subject> & Pick<Subject, 'id' | 'name'> & { category?: string },
): Subject {
	const { category, ...rest } = overrides;
	const categoryName = category ?? 'Scientifique';
	const slug = categoryName
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return {
		schoolId: SEED_SCHOOL_ID,
		coefficient: 1,
		reportOrder: 0,
		gradeLevelId: 'ci-gl-6',
		academicYearId: 'ci-ay-2025-2026',
		isOptional: false,
		categoryId: `${SEED_SCHOOL_ID}:subject-category:${slug || 'scientifique'}`,
		color: 'mint',
		...rest,
	};
}

export function studentNote(
	overrides: Partial<StudentNote> & Pick<StudentNote, 'id' | 'studentId' | 'authorStaffId' | 'body'>,
): StudentNote {
	return {
		schoolId: SEED_SCHOOL_ID,
		category: 'progress',
		visibility: 'staff',
		...overrides,
	};
}

export function cloneMutable<T>(value: T): T {
	return structuredClone(value);
}

export function classSubject(
	overrides: Partial<ClassSubject> & Pick<ClassSubject, 'id' | 'classGroupId' | 'subjectId'>,
): ClassSubject {
	return {
		chapterCount: 0,
		ongoingChapterCount: 0,
		completedChapterCount: 0,
		participationRevision: 0,
		completedPercentage: 0,
		isOffered: true,
		...overrides,
	};
}

export function lessonSession(
	overrides: Partial<LessonSession> & Pick<LessonSession, 'id' | 'classGroupId' | 'classSubjectId' | 'scheduleId'>,
): LessonSession {
	return {
		schoolId: SEED_SCHOOL_ID,
		displayLabel: 'Session',
		status: 'pending',
		isException: false,
		timetableGenerated: false,
		timetableTeacherIds: [],
		startsAt: '2026-05-22T08:00:00.000Z',
		endsAt: '2026-05-22T09:00:00.000Z',
		...overrides,
	};
}

export function homeworkAssessment(
	overrides: Partial<Assessment> & Pick<Assessment, 'id' | 'classGroupId' | 'classSubjectId' | 'periodId' | 'title'>,
): Assessment {
	return {
		marksStatus: 'draft',
		marksRevision: 0,
		marksReview: { rosterStudentIds: [], markEditorSubjectIds: {}, editedBySubjectIds: [], history: [] },
		kind: 'homework',
		maxScore: 20,
		coefficient: 1,
		attachments: [],
		dueAt: '2026-05-18',
		createdAt: '2026-05-11',
		...overrides,
	};
}
