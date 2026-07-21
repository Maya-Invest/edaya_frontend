<script lang="ts">
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (yearId: string) => void;
	} = $props();

	const academicPage = getAcademicPageState();

	let busy = $state(false);
	let label = $state('');
	let startDate = $state('2027-09-01');
	let endDate = $state('2028-07-02');

	const canSubmit = $derived(label.trim().length > 0);

	function resetForm() {
		label = '';
		startDate = '2027-09-01';
		endDate = '2028-07-02';
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
			const trimmedLabel = label.trim();
			const yearId = await academicPage.createYear({
				label,
				startDate,
				endDate,
				successMessage: get(t)('academic.toastYearCreated', { label: trimmedLabel }),
			});
			if (yearId) {
				open = false;
				resetForm();
				onCreated?.(yearId);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('academic.createYear')}
	description={$t('academic.subtitle')}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-4 sm:grid-cols-3">
		<label class="space-y-1.5 text-sm sm:col-span-3">
			<span class="text-muted-foreground">{$t('academic.yearLabel')}</span>
			<Input bind:value={label} placeholder="2027 — 2028" class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('academic.startDate')}</span>
			<Input type="date" bind:value={startDate} class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('academic.endDate')}</span>
			<Input type="date" bind:value={endDate} class="rounded-xl" />
		</label>
	</div>
</FormModal>
