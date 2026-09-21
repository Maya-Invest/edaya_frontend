import type { components } from '$lib/api/schema';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { recordsForFieldIds, teacherAssignmentsForTeachers, uniqueIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

type Assessment = components['schemas']['Assessment'];

const TEACHER_EVALUATIONS_TAB_KEY = Symbol('teacher-evaluations-tab');

export interface TeacherEvaluationRow {
	id: string;
	classId: string;
	classSubjectId: string;
	title: string;
	kind: Assessment['kind'];
	date: string;
}

export interface TeacherEvaluationsTabSlice {
	teacherId: string;
	evaluations: TeacherEvaluationRow[];
}

function assessmentDate(assessment: Assessment): string {
	const value = assessment.startsAt ?? assessment.dueAt ?? assessment.completedAt ?? assessment.endsAt;
	return value ? String(value) : '';
}

export class TeacherEvaluationsTabState {
	slice = $state<TeacherEvaluationsTabSlice | null>(null);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.slice = null;
	}

	evaluationsFor(teacherId: string): TeacherEvaluationRow[] {
		return this.slice?.teacherId === teacherId ? this.slice.evaluations : [];
	}

	query() {
		return (url: URL) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const teacherId = teacherDetailIdFromUrl(url);
				const page = this.getPage();
				const scope = page.teacherScope();
				const periodId = academicContext.periodId;
				if (!teacherId || !scope.academicYearId || !periodId) {
					if (teacherId) {
						this.slice = { teacherId, evaluations: [] };
					}
					return {};
				}

				await page.loadSubjectsIfNeeded();
				const client = getBrowserSchoolClient();
				const assignments = await client.entities.teacherAssignments.list({
					...teacherAssignmentsForTeachers([teacherId]),
					academicYearId: scope.academicYearId,
					status: 'active',
				});
				const subjectAssignments = (assignments ?? []).filter(
					row => row.kind === 'subject' && Boolean(row.classSubjectId),
				);
				const classSubjectIds = uniqueIds(
					subjectAssignments.map(row => row.classSubjectId).filter((id): id is string => Boolean(id)),
				);
				await page.ensureClassSubjectsCached(classSubjectIds);
				const classIds = uniqueIds([
					...subjectAssignments.map(row =>
						page.subjects.find(subject => subject.id === row.classSubjectId)?.classId
						?? row.classGroupId
						?? '',
					),
					...(assignments ?? [])
						.filter(row => row.kind === 'homeroom')
						.map(row => row.classGroupId ?? ''),
				].filter(id => id.length > 0));

				const assessments = classIds.length === 0
					? []
					: await client.entities.assessments.list({
							periodId,
							...recordsForFieldIds('classGroupId', classIds),
						});
				const allowedClassSubjectIds = classSubjectIds;
				this.slice = {
					teacherId,
					evaluations: (assessments ?? [])
						.filter(row => row.classSubjectId != null && allowedClassSubjectIds.includes(row.classSubjectId))
						.map(row => ({
							id: row.id,
							classId: row.classGroupId,
							classSubjectId: row.classSubjectId ?? '',
							title: row.title,
							kind: row.kind,
							date: assessmentDate(row),
						})),
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher evaluations.',
		});
	}
}

export function setTeacherEvaluationsTabState(state: TeacherEvaluationsTabState) {
	setContext(TEACHER_EVALUATIONS_TAB_KEY, state);
}

export function getTeacherEvaluationsTabState() {
	return getContext<TeacherEvaluationsTabState>(TEACHER_EVALUATIONS_TAB_KEY);
}
