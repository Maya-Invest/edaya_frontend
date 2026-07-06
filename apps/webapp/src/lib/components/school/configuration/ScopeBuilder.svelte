<script lang="ts">
	import type { ScopeGrain } from '$lib/api/scope-ids';
	import { ScopeBuilderState } from '$lib/access/scope-builder-state.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
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

	const builder = new ScopeBuilderState();

	const classOptions = $derived(academicContext.classes);
	const gradeOptions = $derived(academicContext.gradeLevels);
	const studentOptions = $derived(detailDataContext.students);
	const activityOptions = $derived(detailDataContext.activities);
	const selectedGradeLabel = $derived(
		gradeOptions.find(grade => grade.id === builder.gradeLevelId)?.name ?? '',
	);
	const selectedActivityLabel = $derived(
		activityOptions.find(activity => activity.id === builder.activityId)?.name ?? '',
	);
	const selectedActivityClassLabel = $derived(
		builder.activityClassGroupId ? builder.classLabel(builder.activityClassGroupId) : '',
	);

	$effect(() => {
		builder.syncFromParent(grain, scopeIds);
	});

	$effect(() => {
		if (builder.scopeIds !== scopeIds) {
			scopeIds = builder.scopeIds;
		}
	});
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
						checked={builder.selectedClassGroups.includes(classGroup.id)}
						onCheckedChange={checked => builder.toggleClassGroup(classGroup.id, checked)}
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
			value={builder.gradeLevelId}
			onValueChange={(value) => {
				if (!value) {
					return;
				}
				builder.setGradeLevelId(value);
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
			{#each builder.classSubjectRows as row, index (index)}
				<div class="space-y-2 rounded-xl border border-border p-3">
					<div class="flex items-center justify-between gap-2">
						<Label class="text-xs">{$t('roles.scopeClassGroup')}</Label>
						{#if builder.classSubjectRows.length > 1}
							<button
								type="button"
								class="text-[11px] font-medium text-muted-foreground hover:text-foreground"
								onclick={() => builder.removeClassSubjectRow(index)}
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
								builder.updateClassSubjectRow(index, { classGroupId: value, classSubjectId: '' });
							}}
						>
							<Select.Trigger class="h-9 w-full rounded-lg">
								<Select.Value placeholder={$t('roles.selectClassGroup')}>
									{builder.classLabel(row.classGroupId) || $t('roles.selectClassGroup')}
								</Select.Value>
							</Select.Trigger>
							<Select.Content>
								{#each classOptions as classGroup (classGroup.id)}
									{@const classDisabled = builder.isClassGroupOptionDisabled(classGroup.id, index, row)}
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
							disabled={!row.wildcard && builder.isClassWildcardBlocked(row.classGroupId, index)}
							onCheckedChange={(checked) => {
								if (typeof checked !== 'boolean') {
									return;
								}
								builder.updateClassSubjectRow(index, { wildcard: checked, classSubjectId: '' });
							}}
						/>
						{$t('roles.scopeWildcardSubjects', { classGroup: builder.classLabel(row.classGroupId) })}
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
									builder.updateClassSubjectRow(index, { classSubjectId: value });
								}}
							>
								<Select.Trigger class="h-9 w-full rounded-lg">
									<Select.Value placeholder={$t('roles.selectClassSubject')}>
										{builder.subjectLabel(row.classGroupId, row.classSubjectId) || $t('roles.selectClassSubject')}
									</Select.Value>
								</Select.Trigger>
								<Select.Content>
									{#each builder.subjectsForClass(row.classGroupId) as subject (subject.id)}
										{@const subjectTaken = builder.isSubjectScopeTaken(row.classGroupId, subject.id, index)}
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
			{#if builder.duplicateScopeWarning}
				<p class="text-xs text-amber-600">{$t('roles.scopePathDuplicate')}</p>
			{/if}
			<button
				type="button"
				class={cn('text-xs font-medium text-primary hover:underline')}
				onclick={() => builder.addClassSubjectRow()}
			>
				{$t('roles.addScopePath')}
			</button>
		</div>
	{:else if grain === 'student'}
		<div class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
			{#each studentOptions as student (student.id)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						checked={builder.selectedStudents.includes(student.id)}
						onCheckedChange={checked => builder.toggleStudent(student.id, checked)}
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
					value={builder.activityId}
					onValueChange={(value) => {
						if (!value) {
							return;
						}
						builder.setActivityId(value);
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
					value={builder.activityClassGroupId}
					onValueChange={(value) => {
						builder.setActivityClassGroupId(value ?? '');
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
