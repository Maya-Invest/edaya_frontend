<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { createReportCardDefinitionMutation } from '$lib/api/mutations/report-cards.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (definitionId: string) => void;
	} = $props();

	let busy = $state(false);
	let name = $state('');
	let gradeLevelId = $state('');
	let gradeScaleId = $state('');

	const gradeLevels = $derived(academicContext.gradeLevels);
	const scales = $derived(reportCardsContext.scales);

	const canSubmit = $derived(
		name.trim().length > 0 && gradeLevelId !== '' && gradeScaleId !== '',
	);

	function resetForm() {
		name = '';
		gradeLevelId = gradeLevels[0]?.id ?? '';
		gradeScaleId = scales[0]?.id ?? '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		const id = await createReportCardDefinitionMutation({
			name,
			gradeLevelId,
			gradeScaleId,
			successMessage: get(t)('reportCards.toastModelCreated', { name: name.trim() }),
		});
		busy = false;
		if (id) {
			open = false;
			onCreated?.(id);
		}
	}
</script>

<FormModal
	bind:open
	title={$t('reportCards.createModel')}
	description={$t('reportCards.subtitle')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label>{$t('gradeScales.name')}</Label>
			<Input bind:value={name} />
		</div>
		<div class="space-y-1.5">
			<Label>{$t('classGroups.subtitle')}</Label>
			<Select.Root type="single" bind:value={gradeLevelId}>
				<Select.Trigger class="w-full">
					{gradeLevels.find(level => level.id === gradeLevelId)?.name ?? '—'}
				</Select.Trigger>
				<Select.Content>
					{#each gradeLevels as level (level.id)}
						<Select.Item value={level.id}>{level.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label>{$t('gradeScales.subtitle')}</Label>
			<Select.Root type="single" bind:value={gradeScaleId}>
				<Select.Trigger class="w-full">
					{scales.find(scale => scale.id === gradeScaleId)?.name ?? '—'}
				</Select.Trigger>
				<Select.Content>
					{#each scales as scale (scale.id)}
						<Select.Item value={scale.id}>{scale.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</FormModal>
