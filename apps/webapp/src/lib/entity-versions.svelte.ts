export const ENTITY_VERSION_KEYS = [
  'school',
  'periodDefinitions',
  'students',
  'guardians',
  'staff',
  'teachers',
  'teacherUnavailabilities',
  'incidents',
  'activities',
  'announcements',
  'familyFeedback',
  'schoolYearEvents',
  'evaluations',
  'attendance',
  'enrollments',
  'subjectEnrollments',
  'reportCards',
  'planning',
  'subjects',
  'billing',
  'fees',
  'payments',
  'inbox',
  'documents',
] as const;

export type EntityVersionKey = (typeof ENTITY_VERSION_KEYS)[number];

export class EntityVersions {
  school = $state(0);
  periodDefinitions = $state(0);
  students = $state(0);
  guardians = $state(0);
  staff = $state(0);
  teachers = $state(0);
  teacherUnavailabilities = $state(0);
  incidents = $state(0);
  activities = $state(0);
  announcements = $state(0);
  familyFeedback = $state(0);
  schoolYearEvents = $state(0);
  evaluations = $state(0);
  attendance = $state(0);
  enrollments = $state(0);
  subjectEnrollments = $state(0);
  reportCards = $state(0);
  planning = $state(0);
  subjects = $state(0);
  billing = $state(0);
  fees = $state(0);
  payments = $state(0);
  inbox = $state(0);
  documents = $state(0);

  bump(key: EntityVersionKey) {
    this[key]++;
  }
}

export const entityVersions = new EntityVersions();
