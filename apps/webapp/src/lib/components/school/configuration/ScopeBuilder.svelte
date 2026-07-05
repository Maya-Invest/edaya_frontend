<script lang="ts">
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
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';

	let {
		grain,
		scopeIds = $bindable(''),
	}: {
		grain: ScopeGrain;
		scopeIds?: string;
	} = $props();

	let selectedClassGroups = $state<string[]>([]);
	let gradeLevelId = $state('');
	let classSubjectRows = $state<Array<{ classGroupId: string; classSubjectId: string; wildcard: boolean }>>([]);
	let selectedStudents = $state<string[]>([]);
	let activityId = $state('');
	let activityClassGroupId = $state('');
	let hydratedKey = $state('');
	let duplicateScopeWarning = $state(false);

	const classOptions = $derived(academicContext.classes);
	const gradeOptions = $derived(academicContext.gradeLevels);
	const studentOptions = $derived(detailDataContext.students);
	const activityOptions = $derived(detailDataContext.activities);
	const selectedGradeLabel = $derived(
		gradeOptions.find(grade => grade.id === gradeLevelId)?.name ?? '',
	);
	const selectedActivityLabel = $derived(
		activityOptions.find(activity => activity.id === activityId)?.name ?? '',
	);
	const selectedActivityClassLabel = $derived(
		activityClassGroupId ? classLabel(activityClassGroupId) : '',
	);

	function subjectsForClass(classGroupId: string) {
		return detailDataContext.subjectsForClass(classGroupId);
	}

	function classLabel(classGroupId: string): string {
		return classOptions.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function subjectLabel(classGroupId: string, classSubjectId: string): string {
		return subjectsForClass(classGroupId).find(subject => subject.id === classSubjectId)?.name ?? '';
	}

	function hydrateFromScopeIds() {
		const key = `${grain}:${scopeIds}`;
		if (hydratedKey === key) {
			return;
		}
		hydratedKey = key;

		switch (grain) {
			case 'class_group':
				selectedClassGroups = parseClassGroupScopeIds(scopeIds);
				break;
			case 'grade_level':
				gradeLevelId = parseGradeLevelScopeIds(scopeIds);
				break;
			case 'class_subject':
				classSubjectRows = parseClassSubjectScopeIds(scopeIds).map(row => ({
					classGroupId: row.classGroupId,
					classSubjectId: row.classSubjectId ?? '',
					wildcard: Boolean(row.wildcard),
				}));
				if (classSubjectRows.length === 0) {
					classSubjectRows = [{ classGroupId: classOptions[0]?.id ?? '', classSubjectId: '', wildcard: false }];
				}
				break;
			case 'student':
				selectedStudents = parseStudentScopeIds(scopeIds);
				break;
			case 'activity': {
				const parsed = parseActivityScopeIds(scopeIds);
				activityId = parsed.activityId;
				activityClassGroupId = parsed.classGroupId ?? '';
				break;
			}
		}
	}

	function syncScopeIds() {
		switch (grain) {
			case 'class_group':
				scopeIds = composeClassGroupScopeIds(selectedClassGroups);
				break;
			case 'grade_level':
				scopeIds = composeGradeLevelScopeIds(gradeLevelId);
				break;
			case 'class_subject':
				scopeIds = composeClassSubjectScopeIds(classSubjectRows);
				break;
			case 'student':
				scopeIds = composeStudentScopeIds(selectedStudents);
				break;
			case 'activity':
				scopeIds = composeActivityScopeIds(activityId, activityClassGroupId || undefined);
				break;
		}
	}

	$effect(() => {
		hydrateFromScopeIds();
	});

	function toggleClassGroup(classGroupId: string, checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') {
			return;
		}
		selectedClassGroups = checked
			? [...new Set([...selectedClassGroups, classGroupId])]
			: selectedClassGroups.filter(id => id !== classGroupId);
		syncScopeIds();
	}

	function toggleStudent(studentId: string, checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') {
			return;
		}
		selectedStudents = checked
			? [...new Set([...selectedStudents, studentId])]
			: selectedStudents.filter(id => id !== studentId);
		syncScopeIds();
	}

	function addClassSubjectRow() {
		duplicateScopeWarning = false;
		classSubjectRows = [
			...classSubjectRows,
			{ classGroupId: classOptions[0]?.id ?? '', classSubjectId: '', wildcard: false },
		];
	}

	function removeClassSubjectRow(index: number) {
		if (classSubjectRows.length <= 1) {
			return;
		}
		duplicateScopeWarning = false;
		classSubjectRows = classSubjectRows.filter((_, rowIndex) => rowIndex !== index);
		syncScopeIds();
	}

	function updateClassSubjectRow(index: number, patch: Partial<{ classGroupId: string; classSubjectId: string; wildcard: boolean }>) {
		const candidate = { ...classSubjectRows[index], ...patch };
		if (findConflictingClassSubjectScopePathIndex(classSubjectRows, index, candidate) !== -1) {
			duplicateScopeWarning = true;
			return;
		}
		duplicateScopeWarning = false;
		classSubjectRows = classSubjectRows.map((row, rowIndex) =>
			rowIndex === index ? candidate : row,
		);
		syncScopeIds();
	}

	function isClassFullyCoveredByWildcard(classGroupId: string, rowIndex: number): boolean {
		return classSubjectRows.some(
			(row, index) => index !== rowIndex && row.classGroupId === classGroupId && row.wildcard,
		);
	}

	function isClassWildcardBlocked(classGroupId: string, rowIndex: number): boolean {
		return classSubjectRows.some(
			(row, index) =>
				index !== rowIndex
				&& row.classGroupId === classGroupId
				&& (row.wildcard || Boolean(row.classSubjectId?.trim())),
		);
	}

	function isClassGroupOptionDisabled(
		classGroupId: string,
		rowIndex: number,
		row: { wildcard: boolean },
	): boolean {
		if (row.wildcard) {
			return isClassWildcardBlocked(classGroupId, rowIndex);
		}
		return isClassFullyCoveredByWildcard(classGroupId, rowIndex);
	}

	function isSubjectScopeTaken(classGroupId: string, classSubjectId: string, rowIndex: number): boolean {
		if (isClassFullyCoveredByWildcard(classGroupId, rowIndex)) {
			return true;
		}
		return classSubjectRows.some(
			(row, index) =>
				index !== rowIndex
				&& row.classGroupId === classGroupId
				&& !row.wildcard
				&& row.classSubjectId === classSubjectId,
		);
	}
</script>

<div class="space-y-3">
	<p class="text-xs text-muted-foreground">
		{$t('roles.scopeGrain', { grain: $t(`scope.grain.${grain}`) })}
	</p>

	{#if grain === 'class_group'}
		<div class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
			{#each classOptions as classGroup (classGroup.id)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						checked={selectedClassGroups.includes(classGroup.id)}
						onCheckedChange={checked => toggleClassGroup(classGroup.id, checked)}
					/>
					<span>{classGroup.name}</span>
				</label>
			{/each}
			{#if classOptions.length === 0}
				<p class="text-xs text-muted-foreground">{$t('roles.scopeNoClasses')}</p>
			{/if}
		</div>
	{:else if grain === 'grade_level'}
		<Select.Root
			type="single"
			value={gradeLevelId}
			onValueChange={(value) => {
				if (!value) {
					return;
				}
				gradeLevelId = value;
				syncScopeIds();
			}}
		>
			<Select.Trigger class="h-10 w-full rounded-xl">
				<Select.Value placeholder={$t('roles.selectGradeLevel')}>
					{selectedGradeLabel || $t('roles.selectGradeLevel')}
				</Select.Value>
			</Select.Trigger>
			<Select.Content>
				{#each gradeOptions as grade (grade.id)}
					<Select.Item value={grade.id} label={grade.name}>{grade.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else if grain === 'class_subject' || grain === 'grade_level_subject'}
		<div class="space-y-3">
			{#each classSubjectRows as row, index (index)}
				<div class="space-y-2 rounded-xl border border-border p-3">
					<div class="flex items-center justify-between gap-2">
						<Label class="text-xs">{$t('roles.scopeClassGroup')}</Label>
						{#if classSubjectRows.length > 1}
							<button
								type="button"
								class="text-[11px] font-medium text-muted-foreground hover:text-foreground"
								onclick={() => removeClassSubjectRow(index)}
							>
								{$t('roles.removeScopePath')}
							</button>
						{/if}
					</div>
					<div class="space-y-1">
						<Select.Root
							type="single"
							value={row.classGroupId}
							onValueChange={(value) => {
								if (!value) {
									return;
								}
								updateClassSubjectRow(index, { classGroupId: value, classSubjectId: '' });
							}}
						>
							<Select.Trigger class="h-9 w-full rounded-lg">
								<Select.Value placeholder={$t('roles.selectClassGroup')}>
									{classLabel(row.classGroupId) || $t('roles.selectClassGroup')}
								</Select.Value>
							</Select.Trigger>
							<Select.Content>
								{#each classOptions as classGroup (classGroup.id)}
									{@const classDisabled = isClassGroupOptionDisabled(classGroup.id, index, row)}
									<Select.Item
										value={classGroup.id}
										label={classGroup.name}
										disabled={classDisabled}
									>
										{classGroup.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<label class="flex items-center gap-2 text-xs text-muted-foreground">
						<Checkbox
							checked={row.wildcard ?? false}
							disabled={!row.wildcard && isClassWildcardBlocked(row.classGroupId, index)}
							onCheckedChange={(checked) => {
								if (typeof checked !== 'boolean') {
									return;
								}
								updateClassSubjectRow(index, { wildcard: checked, classSubjectId: '' });
							}}
						/>
						{$t('roles.scopeWildcardSubjects', { classGroup: classLabel(row.classGroupId) })}
					</label>
					{#if !row.wildcard}
						<div class="space-y-1">
							<Label class="text-xs">{$t('roles.scopeClassSubject')}</Label>
							<Select.Root
								type="single"
								value={row.classSubjectId}
								onValueChange={(value) => {
									if (!value) {
										return;
									}
									updateClassSubjectRow(index, { classSubjectId: value });
								}}
							>
								<Select.Trigger class="h-9 w-full rounded-lg">
									<Select.Value placeholder={$t('roles.selectClassSubject')}>
										{subjectLabel(row.classGroupId, row.classSubjectId) || $t('roles.selectClassSubject')}
									</Select.Value>
								</Select.Trigger>
								<Select.Content>
									{#each subjectsForClass(row.classGroupId) as subject (subject.id)}
										{@const subjectTaken = isSubjectScopeTaken(row.classGroupId, subject.id, index)}
										<Select.Item
											value={subject.id}
											label={subject.name}
											disabled={subjectTaken}
										>
											{subject.name}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/if}
				</div>
			{/each}
			{#if duplicateScopeWarning}
				<p class="text-xs text-amber-600">{$t('roles.scopePathDuplicate')}</p>
			{/if}
			<button
				type="button"
				class={cn('text-xs font-medium text-primary hover:underline')}
				onclick={addClassSubjectRow}
			>
				{$t('roles.addScopePath')}
			</button>
		</div>
	{:else if grain === 'student'}
		<div class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
			{#each studentOptions as student (student.id)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						checked={selectedStudents.includes(student.id)}
						onCheckedChange={checked => toggleStudent(student.id, checked)}
					/>
					<span>{student.name}</span>
				</label>
			{/each}
			{#if studentOptions.length === 0}
				<p class="text-xs text-muted-foreground">{$t('roles.scopeNoStudents')}</p>
			{/if}
		</div>
	{:else if grain === 'activity'}
		<div class="space-y-3">
			<div class="space-y-1">
				<Label class="text-xs">{$t('roles.scopeActivity')}</Label>
				<Select.Root
					type="single"
					value={activityId}
					onValueChange={(value) => {
						if (!value) {
							return;
						}
						activityId = value;
						syncScopeIds();
					}}
				>
					<Select.Trigger class="h-9 w-full rounded-lg">
						<Select.Value placeholder={$t('roles.selectActivity')}>
							{selectedActivityLabel || $t('roles.selectActivity')}
						</Select.Value>
					</Select.Trigger>
					<Select.Content>
						{#each activityOptions as activity (activity.id)}
							<Select.Item value={activity.id} label={activity.name}>{activity.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-1">
				<Label class="text-xs">{$t('roles.scopeActivityClassOptional')}</Label>
				<Select.Root
					type="single"
					value={activityClassGroupId}
					onValueChange={(value) => {
						activityClassGroupId = value ?? '';
						syncScopeIds();
					}}
				>
					<Select.Trigger class="h-9 w-full rounded-lg">
						<Select.Value placeholder={$t('roles.scopeSchoolWideActivity')}>
							{selectedActivityClassLabel || $t('roles.scopeSchoolWideActivity')}
						</Select.Value>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label={$t('roles.scopeSchoolWideActivity')}>
							{$t('roles.scopeSchoolWideActivity')}
						</Select.Item>
						{#each classOptions as classGroup (classGroup.id)}
							<Select.Item value={classGroup.id} label={classGroup.name}>{classGroup.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	{/if}
</div>
