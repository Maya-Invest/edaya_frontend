import type { components } from '$lib/api/schema';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';

type StaffMember = components['schemas']['StaffMember'];
type Subject = components['schemas']['Subject'];
type StudentNote = components['schemas']['StudentNote'];
type ReportCardDefinition = components['schemas']['ReportCardDefinition'];
type ClassSubject = components['schemas']['ClassSubject'];
type LessonSession = components['schemas']['LessonSession'];
type Assessment = components['schemas']['Assessment'];

const HUMAN_STAFF_DEFAULTS = {
	accountKind: 'human' as const,
	serviceElevated: false,
	isActive: true,
};

export function staffMember(
	overrides: Partial<StaffMember> & Pick<StaffMember, 'id' | 'firstName' | 'lastName'>,
): StaffMember {
	return {
		...HUMAN_STAFF_DEFAULTS,
		schoolId: SEED_SCHOOL_ID,
		...overrides,
	};
}

export function subject(
	overrides: Partial<Subject> & Pick<Subject, 'id' | 'name'>,
): Subject {
	return {
		schoolId: SEED_SCHOOL_ID,
		code: null,
		defaultCoefficient: 1,
		category: 'Scientifique',
		color: 'mint',
		...overrides,
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

export function reportCardDefinition(
	overrides: Partial<ReportCardDefinition> & Pick<ReportCardDefinition, 'id' | 'name'>,
): ReportCardDefinition {
	return {
		schoolId: SEED_SCHOOL_ID,
		academicYearId: '2025',
		gradeLevelId: 'gl-6',
		gradeScaleId: 'gs-20',
		kind: 'custom',
		status: 'published',
		isDefault: false,
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
		startsAt: '2026-05-22T08:00:00.000Z',
		endsAt: '2026-05-22T09:00:00.000Z',
		...overrides,
	};
}

export function homeworkAssessment(
	overrides: Partial<Assessment> & Pick<Assessment, 'id' | 'classGroupId' | 'classSubjectId' | 'periodId' | 'title'>,
): Assessment {
	return {
		kind: 'homework',
		maxScore: 20,
		coefficient: 1,
		attachments: [],
		dueAt: '2026-05-18',
		createdAt: '2026-05-11',
		...overrides,
	};
}
