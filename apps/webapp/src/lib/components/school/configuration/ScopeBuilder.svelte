<script lang="ts">
	import type { ScopeGrain } from '$lib/api/scope-ids';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		composeActivityScopeIds,
		composeClassGroupScopeIds,
		composeClassSubjectScopeIds,
		composeGradeLevelScopeIds,
		composeStudentScopeIds,
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

	const classOptions = $derived(academicContext.classes);
	const gradeOptions = $derived(academicContext.gradeLevels);
	const studentOptions = $derived(detailDataContext.students);
	const activityOptions = $derived(detailDataContext.activities);

	function subjectsForClass(classGroupId: string) {
		return detailDataContext.subjects.filter(subject => subject.classId === classGroupId);
	}

	function classLabel(classGroupId: string): string {
		return classOptions.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
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
		classSubjectRows = [
			...classSubjectRows,
			{ classGroupId: classOptions[0]?.id ?? '', classSubjectId: '', wildcard: false },
		];
	}

	function updateClassSubjectRow(index: number, patch: Partial<{ classGroupId: string; classSubjectId: string; wildcard: boolean }>) {
		classSubjectRows = classSubjectRows.map((row, rowIndex) =>
			rowIndex === index ? { ...row, ...patch } : row,
		);
		syncScopeIds();
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
				<Select.Value placeholder={$t('roles.selectGradeLevel')} />
			</Select.Trigger>
			<Select.Content>
				{#each gradeOptions as grade (grade.id)}
					<Select.Item value={grade.id}>{grade.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else if grain === 'class_subject' || grain === 'grade_level_subject'}
		<div class="space-y-3">
			{#each classSubjectRows as row, index (index)}
				<div class="space-y-2 rounded-xl border border-border p-3">
					<div class="space-y-1">
						<Label class="text-xs">{$t('roles.scopeClassGroup')}</Label>
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
								<Select.Value placeholder={$t('roles.selectClassGroup')} />
							</Select.Trigger>
							<Select.Content>
								{#each classOptions as classGroup (classGroup.id)}
									<Select.Item value={classGroup.id}>{classGroup.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<label class="flex items-center gap-2 text-xs text-muted-foreground">
						<Checkbox
							checked={row.wildcard ?? false}
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
									<Select.Value placeholder={$t('roles.selectClassSubject')} />
								</Select.Trigger>
								<Select.Content>
									{#each subjectsForClass(row.classGroupId) as subject (subject.id)}
										<Select.Item value={subject.id}>{subject.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/if}
				</div>
			{/each}
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
						<Select.Value placeholder={$t('roles.selectActivity')} />
					</Select.Trigger>
					<Select.Content>
						{#each activityOptions as activity (activity.id)}
							<Select.Item value={activity.id}>{activity.name}</Select.Item>
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
						<Select.Value placeholder={$t('roles.scopeSchoolWideActivity')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">{$t('roles.scopeSchoolWideActivity')}</Select.Item>
						{#each classOptions as classGroup (classGroup.id)}
							<Select.Item value={classGroup.id}>{classGroup.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	{/if}
</div>
