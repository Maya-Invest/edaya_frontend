<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { academicContext } from '$lib/academic/context.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	let { open = $bindable(false), definition, onCreated }: { open?: boolean; definition?: ReportCardDefinition; onCreated?: (id: string) => void } = $props();
	const owner = getReportCardsPageState();
	let name = $state('');
	let description = $state('');
	let gradeLevelId = $state('');
	let busy = $state(false);
	let wasOpen = false;
	let openedIdentity = '';
	let revision = 0;
	const policy = $derived(academicContext.gradeLevelById(gradeLevelId)?.gradingPolicies?.filter(row => row.academicYearId === (definition?.academicYearId ?? academicContext.yearId)).toSorted((a, b) => b.revision - a.revision)[0]);
	const scaleId = $derived(policy?.scale.id ?? definition?.gradeScaleId ?? owner.scales.find(scale => scale.isDefault && scale.ranges?.length)?.id ?? owner.scales.find(scale => scale.ranges?.length)?.id ?? '');
	const valid = $derived(!!name.trim() && !!gradeLevelId && (!!definition || owner.scales.some(scale => scale.id === scaleId && scale.ranges?.length)));
	$effect.pre(() => {
		if (open && (!wasOpen || openedIdentity !== (definition?.id ?? 'new'))) {
			openedIdentity = definition?.id ?? 'new';
			name = definition?.name ?? '';
			description = definition?.description ?? '';
			gradeLevelId = definition?.gradeLevelId ?? academicContext.gradeLevels[0]?.id ?? '';
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
				if (await owner.configureDefinition({ id: definition.id, expectedRevision: revision, action: 'metadata', metadata: { name: name.trim(), description: description.trim() || null } }))
					open = false;
			}
			else {
				const id = await owner.createDefinition({ name, description, gradeLevelId, gradeScaleId: scaleId });
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
	<div class="space-y-1.5 text-sm"><span>{$t('classGroups.gradeLevel')}</span>{#if definition}<p>{academicContext.gradeLevelById(gradeLevelId)?.name ?? gradeLevelId}</p>{:else}<FilterSelect class="w-full" aria-label={$t('classGroups.gradeLevel')} bind:value={gradeLevelId} options={academicContext.gradeLevels.map(level => ({ value: level.id, label: level.name }))} />{/if}</div>
	<div class="space-y-1.5 text-sm"><span>{$t('grading.scale')}</span><p>{policy?.scale.name ?? owner.scales.find(row => row.id === scaleId)?.name ?? '—'} · {$t('grading.inherit')}</p>{#if policy}<p>{policy.aggregateLabel} · {$t(policy.mode === 'mention-first' ? 'grading.mention' : 'grading.numeric')}</p>{/if}</div>
</FormModal>
