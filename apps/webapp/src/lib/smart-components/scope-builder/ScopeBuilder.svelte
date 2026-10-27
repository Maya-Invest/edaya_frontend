<script lang="ts">
	import type { GrantScope, ScopeGrain } from '$lib/api/grant-scopes';
	import { academicContext } from '$lib/academic/context.svelte';
	import { emptyGrantScope } from '$lib/api/grant-scopes';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { LoaderCircle } from '$lib/icons';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { ScopeBuilderDataState } from './scope-builder-data-state.svelte';

	let { grain, scopes = $bindable([]), active = true, subjectClassRequired = false }: {
		grain: ScopeGrain;
		scopes?: GrantScope[];
		active?: boolean;
		subjectClassRequired?: boolean;
	} = $props();

	const data = new ScopeBuilderDataState();
	const allSelected = $derived(scopes.some(scope => scope.kind === 'all' && scope.grain === grain));
	const parentOptions = $derived(grain === 'student'
		? data.students
		: grain === 'activity'
		? data.activities
		: grain === 'grade_level' || grain === 'subject'
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
			case 'class_group': return scope.classGroupId;
			case 'grade_level': case 'subject': return scope.gradeLevelId;
			case 'student': return scope.studentId;
			case 'activity': return scope.activityId ?? '';
			default: return '';
		}
	}

	function setParent(index: number, id: string) {
		switch (grain) {
			case 'class_group': replace(index, { kind: grain, classGroupId: id });
				break;
			case 'grade_level': replace(index, { kind: grain, gradeLevelId: id });
				break;
			case 'subject': {
				const previous = scopes[index];
				replace(index, { kind: grain, gradeLevelId: id, ...(subjectClassRequired || (previous?.kind === 'subject' && previous.classGroupId !== undefined) ? { classGroupId: '' } : {}) });
			}
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
		if (scope?.kind === 'subject') {
			const { subjectId: _, ...placement } = scope;
			replace(index, { ...placement, ...(id ? { subjectId: id } : {}) });
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
	{#if grain !== 'subject' || !subjectClassRequired}
		<label class="flex items-center gap-2 text-sm">
			<Checkbox checked={allSelected} onCheckedChange={(checked) => {
				if (typeof checked === 'boolean')
					scopes = checked ? [{ kind: 'all', grain }] : [];
			}} />
			{grain === 'subject' ? $t('roles.scopeAllSubjects') : $t('roles.scopeAll', { grain: $t(`scope.grain.${grain}`) })}
		</label>
	{:else}
		<p class="text-xs text-muted-foreground">{$t('roles.scopeClassRequired')}</p>
	{/if}
	{#if data.loading && !data.loaded}
		<div class="flex justify-center py-8" role="status"><LoaderCircle class="h-5 w-5 animate-spin text-primary" /></div>
	{:else if !allSelected || (grain === 'subject' && subjectClassRequired)}
		{#each scopes as scope, index (index)}
			<div class="space-y-3 rounded-collection border border-border p-3">
				<label class="block space-y-1 text-xs">
					<span>{$t(`scope.grain.${grain === 'subject' ? 'grade_level' : grain}`)}</span>
					{#if scope.kind === 'student'}
						<StudentPicker value={scope.studentId} {active} onValueChange={value => setParent(index, value)} />
					{:else}
						<SelectField class="w-full border border-border bg-background text-sm"
							value={parentId(scope)} onchange={event => setParent(index, event.currentTarget.value)}>
							<option value="">{grain === 'activity' ? $t('roles.scopeAllActivities') : $t('roles.selectScopeTarget')}</option>
							{#each parentOptions as option (option.id)}
								<option value={option.id}>{option.name}</option>
							{/each}
						</SelectField>
					{/if}
				</label>
				{#if scope.kind === 'subject'}
					{@const subjects = data.subjectsForGrade(scope.gradeLevelId)}
					<label class="block space-y-1 text-xs">
						<span>{$t('scope.grain.subject')}</span>
						<SelectField class="w-full border border-border bg-background text-sm"
							value={scope.subjectId ?? ''}
							onchange={event => setSubject(index, event.currentTarget.value)}>
							<option value="">{$t('roles.scopeAllSubjects')}</option>
							{#each subjects as subject (subject.id)}
								<option value={subject.id}>{catalogSubjectName(subject.name, $lang, subject.code)}</option>
							{/each}
						</SelectField>
					</label>

					<label class="block space-y-1 text-xs">
						<span>{$t('scope.grain.class_group')}</span>
						<SelectField class="w-full border border-border bg-background text-sm"
							value={scope.classGroupId === undefined ? 'all' : 'selected'}
							onchange={(event) => {
								const { classGroupId: _, ...subject } = scope;
								replace(index, { ...subject, ...(event.currentTarget.value === 'selected' ? { classGroupId: '' } : {}) });
							}}>
							<option value="all" disabled={subjectClassRequired}>{$t('roles.scopeAllClasses')}</option>
							<option value="selected">{$t('roles.scopeSelectedClasses')}</option>
						</SelectField>
					</label>
					{#if scope.classGroupId !== undefined}
						<SelectField aria-label={$t('roles.scopeSelectedClasses')} class="w-full border border-border bg-background text-sm"
							value={scope.classGroupId} onchange={event => replace(index, { ...scope, classGroupId: event.currentTarget.value })}>
							<option value="">{$t('roles.selectScopeTarget')}</option>
							{#each academicContext.classes.filter(group => group.gradeLevelId === scope.gradeLevelId) as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</SelectField>
					{/if}
				{:else if scope.kind === 'activity'}
					<label class="block space-y-1 text-xs">
						<span>{$t('roles.scopeActivityClassOptional')}</span>
						<SelectField class="w-full border border-border bg-background text-sm"
							value={scope.classGroupId ?? ''} onchange={event => setActivityClass(index, event.currentTarget.value)}>
							<option value="">{$t('roles.scopeSchoolWideActivity')}</option>
							{#each academicContext.classes as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</SelectField>
					</label>
				{/if}
				<button type="button" class="text-xs font-medium text-muted-foreground hover:text-foreground"
					onclick={() => scopes = scopes.filter((_, i) => i !== index)}>{$t('roles.removeScopePath')}</button>
			</div>
		{/each}
		<button type="button" class="text-xs font-medium text-primary hover:underline"
			onclick={() => scopes = [...scopes, { ...emptyGrantScope(grain), ...(grain === 'subject' && subjectClassRequired ? { classGroupId: '' } : {}) }]}>{$t('roles.addScopePath')}</button>
	{/if}
</div>
