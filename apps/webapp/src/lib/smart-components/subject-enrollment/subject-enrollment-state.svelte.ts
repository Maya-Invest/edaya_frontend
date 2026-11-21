import type { components } from '$lib/api/schema';
import type { EnrollmentEditorContext, ParticipationData, SubjectDraft } from '$lib/subjects/enrollment-editor';
import type { SubjectSelection } from '$lib/subjects/subject-selection';
import { academicContext } from '$lib/academic/context.svelte';
import { mutationErrorMessage } from '$lib/api/mutations/execute-mutation';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { isoToZonedDateAndTime } from '$lib/date/format';
import { t } from '$lib/i18n';
import { hasPermission } from '$lib/permissions';
import { editorCommonSelection, editorEnrollment, editorOperations, editorPlacement, SUBJECT_ENROLLMENT_OPERATION_LIMIT } from '$lib/subjects/enrollment-editor';
import { EnrollmentRequest, isParticipationConflict } from '$lib/subjects/enrollment-request';
import { toast } from '$lib/toast.svelte';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { get } from 'svelte/store';

type Command = components['schemas']['ManageStudentSubjectEnrollmentsCommand'];
export type LoadEnrollmentCandidates = (context: EnrollmentEditorContext) => Promise<EnrollmentEditorContext['students']>;

interface Dependencies {
	load: (studentId: string, academicYearId: string) => Promise<ParticipationData>;
	submit: (command: Command) => Promise<components['schemas']['ManageStudentSubjectEnrollmentsResponse']>;
	allowed: (context: EnrollmentEditorContext) => boolean;
	identity: () => string;
}

const defaults: Dependencies = {
	load: (studentId, academicYearId) => getBrowserSchoolClient().queries.getStudentSubjectEnrollments({ studentId, academicYearId }),
	submit: command => getBrowserSchoolClient().commands.manageStudentSubjectEnrollments(command),
	allowed: context => context.schoolId === authSession.schoolId && context.academicYearId === academicContext.yearId
		&& hasPermission('ENROLLMENT_MANAGE', { classId: context.classGroupId }),
	identity: () => `${authSession.subjectId}:${authSession.schoolId}:${academicContext.yearId}`,
};

/** The single editor/save workflow used by student, teaching and collection entry points. */
export class SubjectEnrollmentState {
	context = $state<EnrollmentEditorContext | null>(null);
	data = $state<ParticipationData[]>([]);
	selectedIds = $state<string[]>([]);
	drafts = $state<Record<string, SubjectDraft>>({});
	loading = $state(false);
	busy = $state(false);
	error = $state('');
	loadError = $state('');
	private touched = $state(false);
	private generation = 0;
	private loadCandidates?: LoadEnrollmentCandidates;
	private identity = '';
	private readonly replay = new EnrollmentRequest();
	private readonly dependencies: Dependencies;
	constructor(dependencies: Partial<Dependencies> = {}) {
		this.dependencies = { ...defaults, ...dependencies };
	}

	get allowed() { return Boolean(this.context && this.identity === this.dependencies.identity() && this.dependencies.allowed(this.context)); }
	get offerings() {
		const context = this.context;
		return this.data[0]?.offerings.filter(row => row.classGroupId === context?.classGroupId && row.isOptional && row.isOffered
			&& (!context.classSubjectId || row.id === context.classSubjectId)) ?? [];
	}

	get periods() { return this.data[0]?.periods.filter(row => row.academicYearId === this.context?.academicYearId) ?? []; }
	get operations() {
		if (!this.context || this.loading || this.loadError || !this.allowed)
			return [];
		try {
			return editorOperations(this.data, this.context, this.selectedIds, this.drafts, new SvelteDate().toISOString(), isoToZonedDateAndTime(new SvelteDate().toISOString(), this.context.zone).date);
		}
		catch { return []; }
	}

	get affectedCount() { return new SvelteSet(this.operations.map(row => row.studentClassEnrollmentId)).size; }
	get withdrawalCount() { return this.operations.filter(row => row.selection.scope === 'none').length; }
	get overLimit() { return this.operations.length > SUBJECT_ENROLLMENT_OPERATION_LIMIT; }
	get dirty() { return this.touched && this.operations.length > 0; }
	get canSave() { return this.allowed && !this.busy && !this.loading && !this.loadError && this.operations.length > 0 && !this.overLimit; }
	common(subjectId: string) {
		return this.context ? editorCommonSelection(this.data, this.context, this.selectedIds, subjectId, new SvelteDate().toISOString()) : null;
	}

	completedPeriodIds(subjectId: string) {
		const context = this.context;
		if (!context)
			return [];
		return [...new SvelteSet(this.data.filter(row => this.selectedIds.includes(row.studentId)).flatMap(row => editorEnrollment(row, context, subjectId, new SvelteDate().toISOString())?.periods.map(period => period.periodId) ?? []))];
	}

	async open(context: EnrollmentEditorContext, loadCandidates?: LoadEnrollmentCandidates) {
		this.close();
		this.loadCandidates = loadCandidates;
		this.identity = this.dependencies.identity();
		this.context = { ...context, students: [...context.students] };
		this.selectedIds = context.chooseStudents ? [] : context.students.map(row => row.id);
		await this.reload();
	}

	close() {
		++this.generation;
		this.context = null;
		this.loadCandidates = undefined;
		this.data = [];
		this.selectedIds = [];
		this.drafts = {};
		this.loading = false;
		this.busy = false;
		this.error = '';
		this.loadError = '';
		this.touched = false;
		this.replay.complete();
	}

	private initializeDrafts() {
		this.drafts = Object.fromEntries(this.offerings.map((offering) => {
			const common = this.common(offering.id);
			return [offering.id, {
				enabled: Boolean(this.context?.classSubjectId),
				explicit: common !== null,
				selection: common === null ? { scope: 'none' } : common.scope === 'none' ? { scope: 'annual' } : common,
			} satisfies SubjectDraft];
		}));
	}

	toggleStudent(id: string, checked: boolean) {
		if (this.busy || !this.context?.chooseStudents || !this.context.students.some(row => row.id === id))
			return;
		this.selectedIds = checked ? [...new SvelteSet([...this.selectedIds, id])] : this.selectedIds.filter(value => value !== id);
		this.initializeDrafts();
		this.touched = true;
		this.error = '';
	}

	editSubject(id: string, enabled: boolean) {
		if (this.busy || !this.drafts[id])
			return;
		this.drafts[id].enabled = enabled;
		this.touched = true;
	}

	choose(id: string, selection: SubjectSelection) {
		if (this.busy || !this.drafts[id])
			return;
		this.drafts[id] = { enabled: true, explicit: true, selection };
		this.touched = true;
	}

	async reload(preserveDrafts = false) {
		const context = this.context;
		if (!context)
			return;
		const generation = ++this.generation;
		this.loading = true;
		this.loadError = '';
		try {
			if (!this.allowed)
				throw new Error(get(t)('participation.permission'));
			if (this.loadCandidates) {
				const candidates = await this.loadCandidates(context);
				if (generation !== this.generation || !this.allowed)
					return;
				context.students = candidates;
				const eligible = new SvelteSet(candidates.map(row => row.id));
				if (this.selectedIds.some(id => !eligible.has(id)))
					throw new Error(get(t)('participation.reselect'));
			}
			if (!context.students.length || new SvelteSet(context.students.map(row => row.id)).size !== context.students.length)
				throw new Error(get(t)('participation.reselect'));
			const data: ParticipationData[] = [];
			let cursor = 0;
			await Promise.all(Array.from({ length: Math.min(4, context.students.length) }, async () => {
				while (cursor < context.students.length && generation === this.generation && this.allowed) {
					const index = cursor++;
					const student = context.students[index]!;
					const result = await this.dependencies.load(student.id, context.academicYearId);
					if (result.studentId !== student.id || !editorPlacement(result, context, new SvelteDate().toISOString()))
						throw new Error(get(t)('participation.invalidPlacement'));
					data[index] = result;
				}
			}));
			if (generation !== this.generation || !this.allowed)
				return;
			const offerings = data[0]!.offerings.filter(row => row.classGroupId === context.classGroupId && row.isOptional && row.isOffered);
			for (const offering of offerings) {
				if (data.some(student => !student.offerings.some(row => row.id === offering.id && row.isOptional && row.isOffered && row.participationRevision === offering.participationRevision)))
					throw new Error(get(t)('participation.reloadReview'));
			}
			if (context.classSubjectId && !offerings.some(row => row.id === context.classSubjectId))
				throw new Error(get(t)('participation.unavailableSubject'));
			if (preserveDrafts && Object.entries(this.drafts).some(([id, draft]) => draft.enabled && !offerings.some(row => row.id === id)))
				throw new Error(get(t)('participation.unavailableSubject'));
			this.data = data;
			if (!preserveDrafts || !Object.keys(this.drafts).length)
				this.initializeDrafts();
		}
		catch (error) {
			if (generation === this.generation) {
				this.loadError = mutationErrorMessage(error, undefined, get(t));
				this.loading = false;
				++this.generation;
			}
		}
		finally {
			if (generation === this.generation)
				this.loading = false;
		}
	}

	async save(): Promise<boolean> {
		if (!this.canSave)
			return false;
		const context = this.context!;
		const identity = this.identity;
		const operations = $state.snapshot(this.operations);
		const command = this.replay.prepare({
			requestId: crypto.randomUUID(),
			expectedRevisions: Object.fromEntries(this.offerings.filter(row => operations.some(op => op.classSubjectId === row.id)).map(row => [row.id, row.participationRevision])),
			operations,
		});
		this.busy = true;
		this.error = '';
		try {
			const result = await runRouteMutation({
				request: async () => {
					try {
						if (!this.allowed)
							throw new Error(get(t)('participation.permission'));
						return await this.dependencies.submit(command);
					}
					catch (error) {
						if (this.context === context && this.identity === identity && this.allowed) {
							this.error = mutationErrorMessage(error, undefined, get(t));
							if (isParticipationConflict(error)) {
								await this.reload(true);
								this.error = get(t)('participation.reloadReview');
							}
						}
						throw error;
					}
				},
				versionKeys: ['subjectEnrollments', 'enrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning'],
				successMessage: get(t)('participation.saved'),
			});
			if (!result || this.context !== context || this.identity !== identity || !this.allowed)
				return false;
			this.replay.complete();
			this.drafts = {};
			return true;
		}
		finally {
			if (this.context === context && this.identity === identity)
				this.busy = false;
		}
	}

	async refreshAfterSave(refresh?: () => void | Promise<void>) {
		try {
			await refresh?.();
		}
		catch {
			toast.error(get(t)('mutation.savedRefreshFailed'));
		}
	}
}
