<script lang="ts">
	import { createGradeScaleMutation } from '$lib/api/mutations/report-cards.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();

	let busy = $state(false);
	let name = $state('');
	let minScore = $state('0');
	let maxScore = $state('20');
	let passingScore = $state('10');
	let decimalPlaces = $state('2');
	let description = $state('');

	const canSubmit = $derived(name.trim().length > 0);

	function resetForm() {
		name = '';
		minScore = '0';
		maxScore = '20';
		passingScore = '10';
		decimalPlaces = '2';
		description = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy)
			return;

		busy = true;
		try {
			const trimmedName = name.trim();
			const ok = await createGradeScaleMutation({
				name: trimmedName,
				minScore: Number(minScore),
				maxScore: Number(maxScore),
				passingScore: Number(passingScore),
				decimalPlaces: Number(decimalPlaces),
				description: description.trim() || undefined,
				successMessage: get(t)('gradeScales.toastCreated', { name: trimmedName }),
			});
			if (ok) {
				open = false;
				resetForm();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('gradeScales.add')}
	description={$t('gradeScales.subtitle')}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('gradeScales.name')}</span>
			<Input bind:value={name} placeholder="Sur 20" class="rounded-xl" required />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeScales.min')}</span>
			<Input type="number" bind:value={minScore} class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeScales.max')}</span>
			<Input type="number" bind:value={maxScore} class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeScales.passing')}</span>
			<Input type="number" bind:value={passingScore} class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeScales.decimals')}</span>
			<Input type="number" min="0" max="3" bind:value={decimalPlaces} class="rounded-xl" />
		</label>
		<label class="col-span-full space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeScales.description')}</span>
			<Input bind:value={description} class="rounded-xl" />
		</label>
	</div>
</FormModal>
