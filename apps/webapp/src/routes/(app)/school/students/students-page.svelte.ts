import type {
	AbsenceRecord,
	AssessmentResultRow,
	Guardian,
	Incident,
	PedagogicalNote,
	Student,
} from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchStudentById, loadClassPeopleData, loadPeopleData, loadPeopleDataPage } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readStudentListFilters, writeStudentListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';
import {
	buildStudentGradeSummaryFromRows,
	sortPedagogicalNotes,
	summarizeStudentAttendanceHistory,
	summarizeStudentFinances,
	summarizeStudentIncidents,
} from './student-detail-selectors';
import type { StudentDetailSeed, StudentDetailSlice } from './student-detail-types';
import { emptyStudentDetailSlice } from './student-detail-types';
import { filterStudentList, studentListUsesFullRoster } from './student-list-filters';
import {
	createStudentOnPage,
	createStudentNoteOnPage,
	generateReportCardOnPage,
	linkGuardianToStudentOnPage,
	publishReportCardOnPage,
	recordStudentAssessmentResultOnPage,
	recordStudentDailyAttendanceOnPage,
	recordStudentIncidentOnPage,
	transferStudentOnPage,
	updateStudentNoteOnPage,
	updateStudentProfileOnPage,
	updateStudentProfilePhotoOnPage,
} from './students-mutations';

export const SCHOOL_STUDENTS_PAGE_SIZE = 25;

const STUDENTS_PAGE_STATE_KEY = Symbol('students-page-state');

export class StudentsPageState {
	students = $state<Student[]>([]);
	totalStudents = $state(0);
	listLoading = $state(false);
	listLoadingMore = $state(false);
	fullRosterStudents = $state<Student[]>([]);
	loadingFullRoster = $state(false);
	detail = $state<StudentDetailSlice | null>(null);
	selectedResolving = $state(false);

	private loadedVersion = 0;
	private listRequestVersion = 0;

	readonly filters: ListFiltersState<{ q: string; class: string; status: string }>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeStudentListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readStudentListFilters(getUrl()),
		);
	}

	get classes() {
		return academicContext.classes;
	}

	get hierarchy() {
		return academicContext.hierarchy;
	}

	get selectedId() {
		const match = this.getUrl().pathname.match(/\/school\/students\/([^/]+)/);
		return match?.[1];
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findStudent(id);
	}

	findStudent(id: string): Student | undefined {
		return this.students.find(student => student.id === id)
			?? this.fullRosterStudents.find(student => student.id === id);
	}

	clearDetail() {
		this.detail = null;
	}

	seedDetail(studentId: string, data: StudentDetailSeed) {
		if (!this.detail || this.detail.studentId !== studentId) {
			this.detail = { ...emptyStudentDetailSlice(studentId), ...data, studentId };
			return;
		}
		this.detail = { ...this.detail, ...data, studentId };
	}

	linkedGuardians(studentId: string) {
		return (this.detail?.studentId === studentId ? this.detail.guardians : [])
			.filter(guardian => guardian.studentIds.includes(studentId));
	}

	availableGuardians(studentId: string) {
		return (this.detail?.studentId === studentId ? this.detail.guardians : [])
			.filter(guardian => !guardian.studentIds.includes(studentId));
	}

	healthFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.health : undefined;
	}

	notesFor(studentId: string) {
		if (this.detail?.studentId !== studentId) {
			return [];
		}
		return sortPedagogicalNotes(this.detail.pedagogicalNotes, studentId);
	}

	gradesSummaryFor(studentId: string, evaluationHref?: (row: import('$lib/types/school').StudentGradeRow) => string | undefined) {
		const grades = this.detail?.studentId === studentId ? this.detail.grades : [];
		return buildStudentGradeSummaryFromRows(grades, evaluationHref);
	}

	attendanceSummaryFor(studentId: string) {
		const attendance = this.detail?.studentId === studentId ? this.detail.attendance : [];
		return summarizeStudentAttendanceHistory(attendance);
	}

	incidentsSummaryFor(studentId: string) {
		const incidents = (this.detail?.studentId === studentId ? this.detail.incidents : [])
			.filter(incident => incident.involvedStudentIds.includes(studentId));
		return summarizeStudentIncidents(incidents);
	}

	financesSummaryFor(studentId: string) {
		const billing = this.detail?.studentId === studentId ? this.detail.billing : [];
		return summarizeStudentFinances(billing, studentId);
	}

	feesFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.fees : [];
	}

	staffFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.staff : [];
	}

	evaluationsForClass(classId: string) {
		return (this.detail?.evaluations ?? [])
			.filter(evaluation => evaluation.classId === classId)
			.sort((left, right) => right.date.localeCompare(left.date));
	}

	enrollmentsFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.enrollments : [];
	}

	reportCardResultsFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.reportCardResults : [];
	}

	reportCardScalesFor(studentId: string) {
		return this.detail?.studentId === studentId ? this.detail.gradeScales : [];
	}

	patchDetailGuardian(id: string, patch: Partial<Guardian>) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			guardians: this.detail.guardians.map(guardian =>
				guardian.id === id ? { ...guardian, ...patch } : guardian,
			),
		};
	}

	appendDetailAssessmentResult(result: AssessmentResultRow) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			assessmentResults: [...this.detail.assessmentResults, result],
		};
	}

	removeDetailAssessmentResult(id: string) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			assessmentResults: this.detail.assessmentResults.filter(result => result.id !== id),
		};
	}

	appendDetailAbsence(absence: AbsenceRecord) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			absences: [...this.detail.absences, absence],
		};
	}

	removeDetailAbsence(id: string) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			absences: this.detail.absences.filter(absence => absence.id !== id),
		};
	}

	appendDetailIncident(incident: Incident) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			incidents: [...this.detail.incidents, incident],
		};
	}

	removeDetailIncident(id: string) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			incidents: this.detail.incidents.filter(incident => incident.id !== id),
		};
	}

	appendDetailNote(note: PedagogicalNote) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			pedagogicalNotes: [...this.detail.pedagogicalNotes, note],
		};
	}

	removeDetailNote(id: string) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			pedagogicalNotes: this.detail.pedagogicalNotes.filter(note => note.id !== id),
		};
	}

	patchDetailNote(id: string, patch: Partial<PedagogicalNote>) {
		if (!this.detail) {
			return;
		}
		this.detail = {
			...this.detail,
			pedagogicalNotes: this.detail.pedagogicalNotes.map(note =>
				note.id === id ? { ...note, ...patch } : note,
			),
		};
	}

	async ensureSelectedStudent(id: string): Promise<boolean> {
		if (this.findStudent(id)) {
			return true;
		}
		const student = await fetchStudentById(getBrowserSchoolClient(), id);
		if (!student) {
			return false;
		}
		this.mergeStudents([student]);
		return true;
	}

	get usesFullRoster() {
		return studentListUsesFullRoster(this.filters.values);
	}

	filterVisible(students: readonly Student[]): Student[] {
		return filterStudentList(students, this.filters.values);
	}

	get visibleStudents() {
		return this.filterVisible(this.listSourceStudents());
	}

	/** While the full roster loads, client-filter the current page instead of showing an empty list. */
	private listSourceStudents(): readonly Student[] {
		if (!this.usesFullRoster) {
			return this.students;
		}
		if (this.fullRosterStudents.length > 0) {
			return this.fullRosterStudents;
		}
		return this.students;
	}

	seedPage(students: Student[], totalStudents: number) {
		this.students = students;
		this.totalStudents = totalStudents;
		this.loadedVersion = entityVersions.students;
	}

	mergeStudents(incoming: readonly Student[]) {
		const byId = new Map(this.students.map(student => [student.id, student]));
		for (const student of incoming) {
			byId.set(student.id, student);
		}
		this.students = [...byId.values()];
	}

	patchStudent(id: string, patch: Partial<Student>) {
		const apply = (list: Student[]) => {
			const index = list.findIndex(student => student.id === id);
			if (index >= 0) {
				list[index] = { ...list[index], ...patch };
			}
		};
		apply(this.students);
		apply(this.fullRosterStudents);
	}

	appendStudent(student: Student) {
		this.mergeStudents([student]);
		this.totalStudents += 1;
	}

	async refreshList() {
		if (this.usesFullRoster) {
			return;
		}
		await this.loadFirstPage();
	}

	clearFullRoster() {
		this.fullRosterStudents = [];
		this.loadingFullRoster = false;
	}

	async loadFirstPage() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.fullRosterStudents = [];
		try {
			const classGroupId = this.filters.values.class;
			const result = await loadPeopleDataPage(getBrowserSchoolClient(), {
				offset: 0,
				limit: SCHOOL_STUDENTS_PAGE_SIZE,
				...(classGroupId !== 'all' ? { classGroupId } : {}),
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.seedPage(result.students, result.totalStudents);
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
			}
		}
	}

	async loadMore() {
		if (this.listLoading || this.listLoadingMore || this.usesFullRoster) {
			return;
		}
		if (this.students.length >= this.totalStudents) {
			return;
		}

		const version = this.listRequestVersion;
		this.listLoadingMore = true;
		try {
			const classGroupId = this.filters.values.class;
			const result = await loadPeopleDataPage(getBrowserSchoolClient(), {
				offset: this.students.length,
				limit: SCHOOL_STUDENTS_PAGE_SIZE,
				...(classGroupId !== 'all' ? { classGroupId } : {}),
			});
			if (version !== this.listRequestVersion) {
				return;
			}
			this.mergeStudents(result.students);
			this.totalStudents = result.totalStudents;
			this.loadedVersion = entityVersions.students;
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoadingMore = false;
			}
		}
	}

	async loadFullRoster() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		this.loadingFullRoster = true;
		try {
			const classGroupId = this.filters.values.class;
			const result = classGroupId === 'all'
				? await loadPeopleData(getBrowserSchoolClient())
				: await loadClassPeopleData(
						getBrowserSchoolClient(),
						classGroupId,
						academicContext.periodId,
					);
			if (version !== this.listRequestVersion) {
				return;
			}
			this.fullRosterStudents = result.students;
			this.seedPage(result.students, result.students.length);
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
				this.loadingFullRoster = false;
			}
		}
	}

	async invalidateIfStale() {
		if (this.loadedVersion === entityVersions.students) {
			return;
		}
		await this.refreshList();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readStudentListFilters(this.getUrl()));
	}

	async createStudent(...args: Parameters<typeof createStudentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return createStudentOnPage(this, ...args);
	}

	async updateProfile(...args: Parameters<typeof updateStudentProfileOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return updateStudentProfileOnPage(this, ...args);
	}

	async updateProfilePhoto(...args: Parameters<typeof updateStudentProfilePhotoOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return updateStudentProfilePhotoOnPage(this, ...args);
	}

	async transferClass(...args: Parameters<typeof transferStudentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return transferStudentOnPage(this, ...args);
	}

	async linkGuardian(...args: Parameters<typeof linkGuardianToStudentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return linkGuardianToStudentOnPage(this, ...args);
	}

	async recordGrade(...args: Parameters<typeof recordStudentAssessmentResultOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return recordStudentAssessmentResultOnPage(this, ...args);
	}

	async recordAbsence(...args: Parameters<typeof recordStudentDailyAttendanceOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return recordStudentDailyAttendanceOnPage(this, ...args);
	}

	async recordIncident(...args: Parameters<typeof recordStudentIncidentOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return recordStudentIncidentOnPage(this, ...args);
	}

	async createNote(...args: Parameters<typeof createStudentNoteOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return createStudentNoteOnPage(this, ...args);
	}

	async updateNote(...args: Parameters<typeof updateStudentNoteOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return updateStudentNoteOnPage(this, ...args);
	}

	async generateReportCard(studentId: string) {
		return generateReportCardOnPage(this, studentId);
	}

	async publishReportCard(...args: Parameters<typeof publishReportCardOnPage> extends [StudentsPageState, ...infer R] ? R : never) {
		return publishReportCardOnPage(this, ...args);
	}
}

export function setStudentsPageState(state: StudentsPageState) {
	setContext(STUDENTS_PAGE_STATE_KEY, state);
}

export function getStudentsPageState() {
	return getContext<StudentsPageState>(STUDENTS_PAGE_STATE_KEY);
}

export function schoolStudentDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/students\/([^/]+)/);
	return match?.[1];
}
