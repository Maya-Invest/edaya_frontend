/** demo-ci seeded activity — asserts list row render (not just page shell). */
export const DEMO_ACTIVITY_NAME = /Club Robotique|Chorale scolaire/i;

/** Browser extension / devtools noise — do not fail the run. */
export const IGNORED_BROWSER_ERROR =
	/contentscript|ObjectMultiplex|MaxListenersExceededWarning|chrome-extension/i;

export const DEMO_PASSWORD = 'DevPassword1!';
export const STAFF_EMAIL = 'j.aka@ecole-ci.edaya.dev';
export const COORDINATOR_EMAIL = 'f.assi@ecole-ci.edaya.dev';
export const OWNER_EMAIL = 'a.kone@ecole-ci.edaya.dev';

export const CLASS_6A = 'ci-6a';
export const CLASS_6B = 'ci-6b';
export const CLASS_SUBJECT_ID = 'ci-cs-6a-math';
/** Config subjects list uses grade-level catalog ids (not class-subject ids). */
export const CATALOG_SUBJECT_ID = 'gls-ci-gl-6-ci-math';
export const EVALUATION_ID = 'ci-asm-6a-t1-math';
/** Monday inside demo-ci T1 — recurring maths slots are visible this week. */
export const SEEDED_TIMETABLE_WEEK = '2025-11-10';
export const T1_PERIOD_ID = 'ci-2025-t1';
export const T1_PERIOD_LABEL = /Trimestre 1|Term 1|T1/i;
export const STUDENT_ID = 'ci-s1';
export const TEACHER_ID = 'ci-t1';
export const STAFF_ID = 'ci-st3';
export const GUARDIAN_ID = 'ci-g1';
export const BILLING_ID = 'ci-b1';
export const ACTIVITY_ID = 'ci-act-robot';

/** Routes without a `<main>` shell — finance uses layout + DataState only. */
export const APP_SHELL_SELECTOR = 'aside#app-sidebar';

/** Bilingual drawer tab button labels keyed by URL segment. */
export const DRAWER_TAB_LABELS = {
	profile: /^(Profile|Profil)$/i,
	grades: /^(Grades|Notes)$/i,
	attendance: /^(Attendance|Assiduité)$/i,
	incidents: /^(Incidents)$/i,
	finances: /^(Finance|Finances)$/i,
	enrollments: /^(Enrollments|Inscriptions)$/i,
	assignments: /^(Assignments|Affectations|Staff assignments)$/i,
	permissions: /^(Permissions)$/i,
	availability: /^(Availability|Disponibilités)$/i,
	progression: /^(Chapters|Chapitres)$/i,
	logbook: /^(Lessons|Leçons)$/i,
	details: /^(Details|Détails)$/i,
	grading: /^(Grading|Saisie des notes|Correction)$/i,
	students: /^(Students|Élèves|Participants)$/i,
	classes: /^(Classes)$/i,
	'report-card': /^(Report card|Bulletin|Bulletin scolaire)$/i,
} as const satisfies Record<string, RegExp>;

export type DrawerTabKey = keyof typeof DRAWER_TAB_LABELS;
