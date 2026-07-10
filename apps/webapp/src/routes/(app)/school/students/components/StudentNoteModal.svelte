<script lang="ts">
	import type { PedagogicalNote, Student } from '$lib/types/school';
	import { getStudentsPageState } from '../students-page.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { get } from 'svelte/store';

	let {
		s,
		note,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		s: Student;
		note?: PedagogicalNote;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();

	type Category = 'behavior' | 'work' | 'progress' | 'encouragement';

	const CATEGORIES: Category[] = ['work', 'behavior', 'progress', 'encouragement'];

	const uiToApiCategory: Record<PedagogicalNote['category'], Category> = {
		Comportement: 'behavior',
		Travail: 'work',
		Progression: 'progress',
		Encouragement: 'encouragement',
	};

	let busy = $state(false);
	let wasOpen = $state(false);
	let category = $state<Category>('work');
	let body = $state('');

	const categoryLabel = $derived($t(`note.category.${category}`));
	const canSubmit = $derived(body.trim().length > 0);

	function resetForm() {
		category = note ? uiToApiCategory[note.category] : 'work';
		body = note?.content ?? '';
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	const studentsPage = getStudentsPageState();

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = note
			? await studentsPage.updateNote({
				noteId: note.id,
				studentId: s.id,
				category,
				body,
				successMessage: get(t)('note.updateSuccess', { name: s.name }),
			})
			: await studentsPage.createNote({
				studentId: s.id,
				category,
				body,
				successMessage: get(t)('note.createSuccess', { name: s.name }),
			});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class={note ? 'h-7 rounded-full px-2 text-[11px]' : 'w-full rounded-full border border-dashed border-border'}
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{#if note}
			{$t('common.edit')}
		{:else}
			<Plus class="mr-1 h-4 w-4" />
			{$t('note.add')}
		{/if}
	</Button>
{/if}

<FormModal
	bind:open
	title={note ? $t('note.editTitle', { name: s.name }) : $t('note.createTitle', { name: s.name })}
	description={$t('note.createDescription')}
	submitLabel={note ? $t('common.save') : $t('note.add')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('note.categoryLabel')}
		</Label>
		<Select.Root type="single" value={category} onValueChange={v => v && (category = v as Category)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('note.selectCategory')}>
					{categoryLabel}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each CATEGORIES as cat (cat)}
					<Select.Item value={cat} label={$t(`note.category.${cat}`)}>
						{$t(`note.category.${cat}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('note.bodyLabel')}
		</Label>
		<Textarea bind:value={body} rows={5} />
	</div>
</FormModal>
