import type { ScopeGrain } from '$lib/api/scope-ids';
import { academicContext } from '$lib/academic/context.svelte';
import {
	composeActivityScopeIds,
	composeClassGroupScopeIds,
	composeClassSubjectScopeIds,
	composeGradeLevelScopeIds,
	composeStudentScopeIds,
	findConflictingClassSubjectScopePathIndex,
	parseActivityScopeIds,
	parseClassGroupScopeIds,
	parseClassSubjectScopeIds,
	parseGradeLevelScopeIds,
	parseStudentScopeIds,
} from '$lib/api/scope-ids';
import { detailDataContext } from '$lib/detail-data/context.svelte';

export interface ClassSubjectScopeRow {
	classGroupId: string;
	classSubjectId: string;
	wildcard: boolean;
}

export class ScopeBuilderState {
	grain = $state<ScopeGrain>('class_group');
	scopeIds = $state('');
	selectedClassGroups = $state<string[]>([]);
	gradeLevelId = $state('');
	classSubjectRows = $state<ClassSubjectScopeRow[]>([]);
	selectedStudents = $state<string[]>([]);
	activityId = $state('');
	activityClassGroupId = $state('');
	duplicateScopeWarning = $state(false);

	private hydratedKey = $state('');

	constructor(
		private readonly getDefaultClassGroupId: () => string = () => academicContext.classes[0]?.id ?? '',
	) {}

	syncFromParent(grain: ScopeGrain, externalScopeIds: string) {
		this.grain = grain;
		const key = `${grain}:${externalScopeIds}`;
		if (this.hydratedKey === key) {
			return;
		}
		this.scopeIds = externalScopeIds;
		this.hydrateFromScopeIds();
	}

	subjectsForClass(classGroupId: string) {
		return detailDataContext.subjectsForClass(classGroupId);
	}

	classLabel(classGroupId: string): string {
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	subjectLabel(classGroupId: string, classSubjectId: string): string {
		return this.subjectsForClass(classGroupId).find(subject => subject.id === classSubjectId)?.name ?? '';
	}

	hydrateFromScopeIds() {
		const key = `${this.grain}:${this.scopeIds}`;
		if (this.hydratedKey === key) {
			return;
		}
		this.hydratedKey = key;

		switch (this.grain) {
			case 'class_group':
				this.selectedClassGroups = parseClassGroupScopeIds(this.scopeIds);
				break;
			case 'grade_level':
				this.gradeLevelId = parseGradeLevelScopeIds(this.scopeIds);
				break;
			case 'class_subject':
				this.classSubjectRows = parseClassSubjectScopeIds(this.scopeIds).map(row => ({
					classGroupId: row.classGroupId,
					classSubjectId: row.classSubjectId ?? '',
					wildcard: Boolean(row.wildcard),
				}));
				if (this.classSubjectRows.length === 0) {
					this.classSubjectRows = [{
						classGroupId: this.getDefaultClassGroupId(),
						classSubjectId: '',
						wildcard: false,
					}];
				}
				break;
			case 'student':
				this.selectedStudents = parseStudentScopeIds(this.scopeIds);
				break;
			case 'activity': {
				const parsed = parseActivityScopeIds(this.scopeIds);
				this.activityId = parsed.activityId;
				this.activityClassGroupId = parsed.classGroupId ?? '';
				break;
			}
		}
	}

	syncScopeIds() {
		switch (this.grain) {
			case 'class_group':
				this.scopeIds = composeClassGroupScopeIds(this.selectedClassGroups);
				break;
			case 'grade_level':
				this.scopeIds = composeGradeLevelScopeIds(this.gradeLevelId);
				break;
			case 'class_subject':
				this.scopeIds = composeClassSubjectScopeIds(this.classSubjectRows);
				break;
			case 'student':
				this.scopeIds = composeStudentScopeIds(this.selectedStudents);
				break;
			case 'activity':
				this.scopeIds = composeActivityScopeIds(
					this.activityId,
					this.activityClassGroupId || undefined,
				);
				break;
		}
	}

	toggleClassGroup(classGroupId: string, checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') {
			return;
		}
		this.selectedClassGroups = checked
			? this.selectedClassGroups.includes(classGroupId)
				? this.selectedClassGroups
				: [...this.selectedClassGroups, classGroupId]
			: this.selectedClassGroups.filter(id => id !== classGroupId);
		this.syncScopeIds();
	}

	toggleStudent(studentId: string, checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') {
			return;
		}
		this.selectedStudents = checked
			? this.selectedStudents.includes(studentId)
				? this.selectedStudents
				: [...this.selectedStudents, studentId]
			: this.selectedStudents.filter(id => id !== studentId);
		this.syncScopeIds();
	}

	addClassSubjectRow() {
		this.duplicateScopeWarning = false;
		this.classSubjectRows = [
			...this.classSubjectRows,
			{ classGroupId: this.getDefaultClassGroupId(), classSubjectId: '', wildcard: false },
		];
	}

	removeClassSubjectRow(index: number) {
		if (this.classSubjectRows.length <= 1) {
			return;
		}
		this.duplicateScopeWarning = false;
		this.classSubjectRows = this.classSubjectRows.filter((_, rowIndex) => rowIndex !== index);
		this.syncScopeIds();
	}

	updateClassSubjectRow(
		index: number,
		patch: Partial<{ classGroupId: string; classSubjectId: string; wildcard: boolean }>,
	) {
		const candidate = { ...this.classSubjectRows[index], ...patch };
		if (findConflictingClassSubjectScopePathIndex(this.classSubjectRows, index, candidate) !== -1) {
			this.duplicateScopeWarning = true;
			return;
		}
		this.duplicateScopeWarning = false;
		this.classSubjectRows = this.classSubjectRows.map((row, rowIndex) =>
			rowIndex === index ? candidate : row,
		);
		this.syncScopeIds();
	}

	isClassFullyCoveredByWildcard(classGroupId: string, rowIndex: number): boolean {
		return this.classSubjectRows.some(
			(row, index) => index !== rowIndex && row.classGroupId === classGroupId && row.wildcard,
		);
	}

	isClassWildcardBlocked(classGroupId: string, rowIndex: number): boolean {
		return this.classSubjectRows.some(
			(row, index) =>
				index !== rowIndex
				&& row.classGroupId === classGroupId
				&& (row.wildcard || Boolean(row.classSubjectId?.trim())),
		);
	}

	isClassGroupOptionDisabled(
		classGroupId: string,
		rowIndex: number,
		row: { wildcard: boolean },
	): boolean {
		if (row.wildcard) {
			return this.isClassWildcardBlocked(classGroupId, rowIndex);
		}
		return this.isClassFullyCoveredByWildcard(classGroupId, rowIndex);
	}

	isSubjectScopeTaken(classGroupId: string, classSubjectId: string, rowIndex: number): boolean {
		if (this.isClassFullyCoveredByWildcard(classGroupId, rowIndex)) {
			return true;
		}
		return this.classSubjectRows.some(
			(row, index) =>
				index !== rowIndex
				&& row.classGroupId === classGroupId
				&& !row.wildcard
				&& row.classSubjectId === classSubjectId,
		);
	}

	setGradeLevelId(gradeLevelId: string) {
		this.gradeLevelId = gradeLevelId;
		this.syncScopeIds();
	}

	setActivityId(activityId: string) {
		this.activityId = activityId;
		this.syncScopeIds();
	}

	setActivityClassGroupId(activityClassGroupId: string) {
		this.activityClassGroupId = activityClassGroupId;
		this.syncScopeIds();
	}
}
