<script lang="ts">
	import type { PedagogicalNote, Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { get } from 'svelte/store';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	let { s, note, disabled = false, title, open = $bindable(false), showTrigger = true }: {
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
	let noteTitle = $state('');
	let visibility = $state<'staff' | 'admin_only' | 'guardian_visible'>('staff');
	const categoryLabel = $derived($t(`note.category.${category}`));
	const canSubmit = $derived(body.trim().length > 0);
	function resetForm() {
		category = note ? uiToApiCategory[note.category] : 'work';
		body = note?.content ?? '';
		noteTitle = note?.title ?? '';
		visibility = note?.visibility ?? 'staff';
	}
	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});
	const profileTab = getStudentProfileTabState();
	async function submit() {
		if (!canSubmit)
			return;
		busy = true;
		const ok = note
			? await profileTab.updateNote({
				noteId: note.id,
				studentId: s.id,
				category,
				body,
				title: noteTitle.trim() || null,
				visibility,
				successMessage: get(t)('note.updateSuccess', { name: s.name }),
			})
			: await profileTab.createNote({
				studentId: s.id,
				category,
				body,
				title: noteTitle.trim() || null,
				visibility,
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
	<label class="block space-y-1.5"><span>{$t('profile.noteTitle')}</span><Input bind:value={noteTitle} /></label>
	<label class="block space-y-1.5"><span>{$t('profile.visibility')}</span><SelectField bind:value={visibility} class="w-full border bg-background">{#each ['staff', 'admin_only', 'guardian_visible'] as value (value)}<option {value}>{$t(`profile.noteVisibility.${value}`)}</option>{/each}</SelectField></label>

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
