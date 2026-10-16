<script lang="ts">
	import type { GradeScale, GradeScaleRange } from '$lib/types/report-cards';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getGradeScalesPageState } from '../grade-scales-page.svelte';

	let { open = $bindable(false), scale, interval }: { open?: boolean; scale: GradeScale; interval?: GradeScaleRange } = $props();
	const owner = getGradeScalesPageState();
	let code = $state('');
	let label = $state('');
	let minimum = $state('');
	let points = $state('');
	let busy = $state(false);
	let id = '';
	let revision = 0;
	let wasOpen = false;
	let openedIdentity = '';
	$effect.pre(() => {
		if (open && (!wasOpen || openedIdentity !== (`${scale.id}/${interval?.id ?? 'new'}`))) {
			openedIdentity = `${scale.id}/${interval?.id ?? 'new'}`;
			id = interval?.id ?? crypto.randomUUID();
			revision = scale.revision ?? 0;
			code = interval?.letter ?? '';
			label = interval?.interpretation ?? '';
			minimum = String(interval?.minScore ?? (scale.ranges?.length ? '' : scale.minScore));
			points = interval?.gpaValue == null ? '' : String(interval.gpaValue);
		}
		wasOpen = open;
	});
	const anchored = $derived(!scale.ranges?.length || interval?.minScore === scale.minScore);
	const valid = $derived(!!code.trim() && !!label.trim() && !!minimum.trim() && Number.isFinite(Number(minimum)) && Number(minimum) >= scale.minScore && Number(minimum) < scale.maxScore && !(scale.ranges ?? []).some(row => row.id !== id && (row.letter === code.trim() || row.minScore === Number(minimum))) && (!points.trim() || (Number.isFinite(Number(points)) && Number(points) >= scale.minScore && Number(points) <= scale.maxScore)));
	async function save() {
		if (!valid || busy || !hasAnyPermission(['REPORT_CARD_CONFIGURE']))
			return;
		busy = true;
		try {
			if (await owner.configureScale({ id: scale.id, expectedRevision: revision, action: 'interval', interval: { id, letter: code.trim(), interpretation: label.trim(), minScore: Number(minimum), gpaValue: points.trim() ? Number(points) : undefined } }))
				open = false;
		}
		finally {
			busy = false;
		}
	}
</script>
<FormModal bind:open title={interval ? $t('grading.editInterval') : $t('grading.addInterval')} description={$t('grading.thresholdHelp')} {busy} submitLabel={$t('common.save')} cancelLabel={$t('common.cancel')} submitDisabled={!valid || !hasAnyPermission(['REPORT_CARD_CONFIGURE'])} onSubmit={save}>
	<label class="block space-y-1.5 text-sm"><span>{$t('grading.code')}</span><Input bind:value={code} required /></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('grading.label')}</span><Input bind:value={label} required /></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('grading.minimum')}</span><Input type="number" step="any" bind:value={minimum} disabled={anchored} required /></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('grading.points')}</span><Input type="number" step="any" bind:value={points} /></label>
	{#if !valid && code.trim()}<p role="alert" class="text-sm text-destructive">{$t('grading.invalidThreshold')}</p>{/if}
</FormModal>
