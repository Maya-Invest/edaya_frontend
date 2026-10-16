<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { academicContext } from '$lib/academic/context.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	let { open = $bindable(false), definition, gradeLevelId: scopedLevelId, onCreated }: { open?: boolean; definition?: ReportCardDefinition; gradeLevelId?: string; onCreated?: (id: string) => void } = $props();
	const owner = getReportCardsPageState();
	let name = $state('');
	let description = $state('');
	let passThreshold = $state('');
	let gradeLevelId = $state('');
	let academicYearId = $state('');
	let busy = $state(false);
	let wasOpen = false;
	let openedIdentity = '';
	let revision = 0;
	const policy = $derived(academicContext.gradeLevelById(gradeLevelId)?.gradingPolicies?.filter(row => row.academicYearId === academicYearId).toSorted((a, b) => b.revision - a.revision)[0]);
	const scaleId = $derived(policy?.scale.id ?? definition?.gradeScaleId ?? owner.scales.find(scale => scale.isDefault && scale.ranges?.length)?.id ?? owner.scales.find(scale => scale.ranges?.length)?.id ?? '');
	const scale = $derived(policy?.scale ?? owner.scales.find(row => row.id === scaleId));
	const thresholdValid = $derived(!passThreshold.trim() || (!!scale && Number.isFinite(Number(passThreshold)) && Number(passThreshold) >= scale.minScore && Number(passThreshold) <= scale.maxScore && Math.abs(Number(passThreshold) * 10 ** scale.decimalPlaces - Math.round(Number(passThreshold) * 10 ** scale.decimalPlaces)) <= Number.EPSILON * Math.max(1, Math.abs(Number(passThreshold) * 10 ** scale.decimalPlaces)) * 4));
	const valid = $derived(academicYearId === academicContext.yearId && thresholdValid && !!name.trim() && !!gradeLevelId && (!!definition || owner.scales.some(scale => scale.id === scaleId && scale.ranges?.length)));
	$effect.pre(() => {
		if (open && (!wasOpen || openedIdentity !== (definition?.id ?? 'new'))) {
			openedIdentity = definition?.id ?? 'new';
			name = definition?.name ?? '';
			description = definition?.description ?? '';
			passThreshold = definition?.passThreshold == null ? '' : String(definition.passThreshold);
			gradeLevelId = definition?.gradeLevelId ?? scopedLevelId ?? '';
			academicYearId = definition?.academicYearId ?? academicContext.yearId;
			revision = definition?.revision ?? 0;
		}
		wasOpen = open;
	});
	async function save() {
		if (!valid || busy || !hasAnyPermission(['REPORT_CARD_CONFIGURE']))
			return;
		busy = true;
		try {
			if (definition) {
				if (await owner.configureDefinition({ id: definition.id, expectedRevision: revision, action: 'metadata', metadata: { name: name.trim(), description: description.trim() || null, passThreshold: passThreshold.trim() ? Number(passThreshold) : null } }))
					open = false;
			}
			else {
				const id = await owner.createDefinition({ name, description, gradeLevelId, academicYearId, gradeScaleId: scaleId, passThreshold: passThreshold.trim() ? Number(passThreshold) : null });
				if (id) {
					open = false;
					onCreated?.(id);
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>
<FormModal bind:open title={definition ? $t('reportCards.editModel') : $t('reportCards.createModel')} description={$t('reportCards.modelEditHelp')} submitLabel={$t('common.save')} cancelLabel={$t('common.cancel')} {busy} submitDisabled={!valid || !hasAnyPermission(['REPORT_CARD_CONFIGURE'])} onSubmit={save}>
	<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.name')}</span><Input bind:value={name} required /></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.description')}</span><Input bind:value={description} /></label>
	<div class="space-y-1.5 text-sm"><span>{$t('classGroups.gradeLevel')}</span><p>{academicContext.gradeLevelById(gradeLevelId)?.name ?? gradeLevelId}</p></div>
	<div class="space-y-1.5 text-sm"><span>{$t('reportCards.academicYear')}</span><p>{academicContext.years.find(year => year.id === academicYearId)?.label ?? academicYearId}</p></div>
	<div class="space-y-1.5 text-sm"><span>{$t('grading.scale')}</span><p>{policy?.scale.name ?? owner.scales.find(row => row.id === scaleId)?.name ?? '—'} · {$t('grading.inherit')}</p>{#if policy}<p>{policy.aggregateLabel} · {$t(policy.mode === 'mention-first' ? 'grading.mention' : 'grading.numeric')}</p>{/if}</div>
	<label class="block space-y-1.5 text-sm"><span>{$t('reportCards.passThreshold')}</span><Input type="number" step={scale ? 10 ** -scale.decimalPlaces : 'any'} min={scale?.minScore} max={scale?.maxScore} bind:value={passThreshold} aria-describedby="report-pass-threshold-help" /></label>
	<p id="report-pass-threshold-help" class="text-sm text-muted-foreground">{$t('reportCards.passThresholdHelp')}</p>
	{#if !thresholdValid}<p role="alert" class="text-sm text-destructive">{$t('reportCards.invalidPassThreshold')}</p>{/if}
</FormModal>
