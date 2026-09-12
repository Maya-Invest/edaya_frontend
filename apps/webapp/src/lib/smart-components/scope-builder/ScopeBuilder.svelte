<script lang="ts">
	import type { GrantScope, ScopeGrain } from '$lib/api/grant-scopes';
	import { academicContext } from '$lib/academic/context.svelte';
	import { emptyGrantScope } from '$lib/api/grant-scopes';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { LoaderCircle } from '$lib/icons';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { ScopeBuilderDataState } from './scope-builder-data-state.svelte';

	let { grain, scopes = $bindable([]), active = true }: {
		grain: ScopeGrain;
		scopes?: GrantScope[];
		active?: boolean;
	} = $props();

	const data = new ScopeBuilderDataState();
	const allSelected = $derived(scopes.some(scope => scope.kind === 'all' && scope.grain === grain));
	const parentOptions = $derived(grain === 'student'
		? data.students
		: grain === 'activity'
		? data.activities
		: grain === 'grade_level' || grain === 'grade_level_subject'
		? academicContext.gradeLevels
		: academicContext.classes);

	$effect(() => {
		if (active)
			void data.ensureLoaded();
	});

	function replace(index: number, scope: GrantScope) {
		scopes = scopes.map((previous, i) => i === index ? scope : previous);
	}

	function parentId(scope: GrantScope): string {
		switch (scope.kind) {
			case 'class_group': case 'class_subject': return scope.classGroupId;
			case 'grade_level': case 'grade_level_subject': return scope.gradeLevelId;
			case 'student': return scope.studentId;
			case 'activity': return scope.activityId ?? '';
			default: return '';
		}
	}

	function setParent(index: number, id: string) {
		switch (grain) {
			case 'class_group': case 'class_subject': replace(index, { kind: grain, classGroupId: id });
				break;
			case 'grade_level': case 'grade_level_subject': replace(index, { kind: grain, gradeLevelId: id });
				break;
			case 'student': replace(index, { kind: grain, studentId: id });
				break;
			case 'activity': {
				const scope = scopes[index];
				replace(index, { kind: grain, ...(id ? { activityId: id } : {}), ...(scope?.kind === 'activity' && scope.classGroupId ? { classGroupId: scope.classGroupId } : {}) });
				break;
			}
		}
	}

	function setSubject(index: number, id: string) {
		const scope = scopes[index];
		if (scope?.kind === 'class_subject') {
			replace(index, { kind: scope.kind, classGroupId: scope.classGroupId, ...(id ? { classSubjectId: id } : {}) });
		}
		if (scope?.kind === 'grade_level_subject') {
			replace(index, { kind: scope.kind, gradeLevelId: scope.gradeLevelId, ...(id ? { gradeLevelSubjectId: id } : {}) });
		}
	}

	function setActivityClass(index: number, id: string) {
		const scope = scopes[index];
		if (scope?.kind !== 'activity')
			return;
		replace(index, { kind: 'activity', ...(scope.activityId ? { activityId: scope.activityId } : {}), ...(id ? { classGroupId: id } : {}) });
	}
</script>

<div class="space-y-3">
	<p class="text-xs text-muted-foreground">{$t('roles.scopeGrain', { grain: $t(`scope.grain.${grain}`) })}</p>
	<label class="flex items-center gap-2 text-sm">
		<Checkbox checked={allSelected} onCheckedChange={(checked) => {
			if (typeof checked === 'boolean')
				scopes = checked ? [{ kind: 'all', grain }] : [];
		}} />
		{$t('roles.scopeAll', { grain: $t(`scope.grain.${grain}`) })}
	</label>
	{#if data.loading && !data.loaded}
		<div class="flex justify-center py-8" role="status"><LoaderCircle class="h-5 w-5 animate-spin text-primary" /></div>
	{:else if !allSelected}
		{#each scopes as scope, index (index)}
			<div class="space-y-3 rounded-xl border border-border p-3">
				<label class="block space-y-1 text-xs">
					<span>{$t(`scope.grain.${grain}`)}</span>
					{#if scope.kind === 'student'}
						<StudentPicker value={scope.studentId} {active} onValueChange={value => setParent(index, value)} />
					{:else}
						<select class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
							value={parentId(scope)} onchange={event => setParent(index, event.currentTarget.value)}>
							<option value="">{grain === 'activity' ? $t('roles.scopeAllActivities') : $t('roles.selectScopeTarget')}</option>
							{#each parentOptions as option (option.id)}
								<option value={option.id}>{option.name}</option>
							{/each}
						</select>
					{/if}
				</label>
				{#if scope.kind === 'class_subject' || scope.kind === 'grade_level_subject'}
					{@const subjects = scope.kind === 'class_subject' ? data.subjectsForClass(scope.classGroupId) : data.subjectsForGrade(scope.gradeLevelId)}
					<label class="block space-y-1 text-xs">
						<span>{$t('roles.scopeClassSubject')}</span>
						<select class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
							value={(scope.kind === 'class_subject' ? scope.classSubjectId : scope.gradeLevelSubjectId) ?? ''}
							onchange={event => setSubject(index, event.currentTarget.value)}>
							<option value="">{$t('roles.scopeAllSubjects')}</option>
							{#each subjects as subject (subject.id)}
								<option value={subject.id}>{catalogSubjectName(subject.name, $lang, subject.code)}</option>
							{/each}
						</select>
					</label>
				{:else if scope.kind === 'activity'}
					<label class="block space-y-1 text-xs">
						<span>{$t('roles.scopeActivityClassOptional')}</span>
						<select class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
							value={scope.classGroupId ?? ''} onchange={event => setActivityClass(index, event.currentTarget.value)}>
							<option value="">{$t('roles.scopeSchoolWideActivity')}</option>
							{#each academicContext.classes as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
					</label>
				{/if}
				<button type="button" class="text-xs font-medium text-muted-foreground hover:text-foreground"
					onclick={() => scopes = scopes.filter((_, i) => i !== index)}>{$t('roles.removeScopePath')}</button>
			</div>
		{/each}
		<button type="button" class="text-xs font-medium text-primary hover:underline"
			onclick={() => scopes = [...scopes, emptyGrantScope(grain)]}>{$t('roles.addScopePath')}</button>
	{/if}
</div>
