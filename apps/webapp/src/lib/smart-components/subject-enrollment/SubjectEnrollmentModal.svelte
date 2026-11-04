<script lang="ts">
	import type { EnrollmentEditorContext } from '$lib/subjects/enrollment-editor';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import SubjectSelectionFields from '$lib/subjects/SubjectSelectionFields.svelte';
	import { onDestroy, untrack } from 'svelte';
	import { SubjectEnrollmentState } from './subject-enrollment-state.svelte';

	const { context, onClose, onSaved }: {
		context: EnrollmentEditorContext | null;
		onClose: () => void;
		onSaved?: () => void | Promise<void>;
	} = $props();
	const workflow = new SubjectEnrollmentState();
	let lastContext = '';
	$effect(() => {
		const key = JSON.stringify(context);
		if (key === lastContext)
			return;
		lastContext = key;
		const captured = context;
		untrack(() => captured ? void workflow.open(captured) : workflow.close());
	});
	onDestroy(() => workflow.close());
	async function save() {
		if (await workflow.save()) {
			onClose();
			await workflow.refreshAfterSave(onSaved);
		}
	}
	const description = $derived.by(() => {
		if (!context) return '';
		const parts = [context.className, context.yearName];
		if (!context.chooseStudents) parts.push($t('list.selectedCount', { n: context.students.length }));
		return parts.join(' · ');
	});
	const submitLabel = $derived($t(workflow.operations.length > 0 && workflow.withdrawalCount === workflow.operations.length ? 'participation.withdraw' : 'participation.apply'));
	function currentLabel(subjectId: string) {
		const selection = workflow.common(subjectId);
		if (!selection)
			return $t('participation.mixedSelections');
		if (selection.scope !== 'periods')
			return $t(selection.scope === 'annual' ? 'participation.annual' : 'participation.notEnrolled');
		return selection.periodIds.map(id => workflow.periods.find(period => period.id === id)?.name ?? id).join(', ');
	}
</script>

<FormModal open={Boolean(context)} onOpenChange={(open) => {
	if (!open)
		onClose();
}}
	title={$t('participation.enrolments')} {description}
	busy={workflow.busy} dirty={workflow.dirty} submitDisabled={!workflow.canSave}
	{submitLabel}
	onSubmit={save}>
	{#if !workflow.allowed}
		<p role="alert">{$t('participation.permission')}</p>
	{:else if workflow.loading}
		<p role="status">{$t('participation.loading')}</p>
	{:else if workflow.loadError}
		<p role="alert" class="text-sm text-destructive">{workflow.loadError}</p>
		<Button variant="outline" onclick={() => void workflow.reload(true)}>{$t('dataState.retry')}</Button>
	{:else}
		{#if context?.chooseStudents}
			<p class="font-medium">{$t('list.selectedCount', { n: workflow.selectedIds.length })}</p>
			<fieldset disabled={workflow.busy} class="space-y-2">
				<legend class="text-sm font-medium">{$t('participation.selectStudents')}</legend>
				{#each context.students as student (student.id)}
					<label class="flex min-h-11 items-center gap-3"><Checkbox checked={workflow.selectedIds.includes(student.id)} onCheckedChange={checked => workflow.toggleStudent(student.id, checked)} />{student.name}</label>
				{/each}
			</fieldset>
		{/if}
		{#each workflow.offerings as offering (offering.id)}
			{@const draft = workflow.drafts[offering.id]}
			{#if draft}
				<fieldset disabled={workflow.busy || workflow.selectedIds.length === 0} class="space-y-3 rounded-collection border border-border p-3">
					<legend class="px-1 font-medium">{offering.name}</legend>
					<p class="text-sm text-muted-foreground">{currentLabel(offering.id)}</p>
					{#if !context?.classSubjectId}
						<label class="flex min-h-11 items-center gap-3"><Checkbox checked={draft.enabled} onCheckedChange={checked => workflow.editSubject(offering.id, checked)} />{$t('participation.changeSubject', { subject: offering.name })}</label>
					{/if}
					{#if draft.enabled}
						{#if !draft.explicit}<p class="text-sm text-muted-foreground">{$t('participation.chooseReplacement')}</p>{/if}
						<SubjectSelectionFields showWithdrawalTools={context?.chooseStudents} bind:selection={draft.selection} periods={workflow.periods} completedPeriodIds={workflow.completedPeriodIds(offering.id)} zone={context?.zone ?? 'UTC'} onChange={() => workflow.choose(offering.id, draft.selection)} />
					{:else}
						<p class="text-sm text-muted-foreground">{$t('participation.unchanged')}</p>
					{/if}
				</fieldset>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">{$t('participation.noOptionalSubjects')}</p>
		{/each}
		{#if context?.chooseStudents && workflow.withdrawalCount}<p class="text-sm text-muted-foreground">{$t('participation.withdrawCount', { n: workflow.withdrawalCount })} {$t('participation.withdrawExplanation')}</p>{/if}
		{#if workflow.overLimit}<p role="alert" class="text-sm text-destructive">{$t('participation.limit')}</p>{/if}
	{/if}
	{#if workflow.error}<p role="alert" class="text-sm text-destructive">{workflow.error}</p>{/if}
	{#snippet footer({ close, busy, submitDisabled })}
		<div class="w-full space-y-3">
			{#if workflow.allowed && !workflow.loading && !workflow.loadError}
				<div class="space-y-1">
					<p role="status" class="text-sm">{$t('participation.changeCount', { students: workflow.affectedCount, changes: workflow.operations.length })}</p>
					{#if workflow.withdrawalCount}<p class="text-sm text-muted-foreground">{$t('participation.withdrawCount', { n: workflow.withdrawalCount })}</p>{/if}
					<p class="text-xs text-muted-foreground">{$t('participation.selectionExplanation')}</p>
				</div>
			{/if}
			<div class="flex flex-wrap justify-end gap-2">
				<Button variant="outline" data-testid="form-modal-cancel" onclick={close} disabled={busy}>{$t('common.cancel')}</Button>
				<Button data-testid="form-modal-submit" type="submit" disabled={busy || submitDisabled} aria-busy={busy}>{busy ? $t('form.saving') : submitLabel}</Button>
			</div>
		</div>
	{/snippet}
</FormModal>
