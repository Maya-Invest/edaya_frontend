<script lang="ts">
	import type { ReportCardDefinition, ReportCardSection } from '$lib/types/report-cards';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	let { open = $bindable(false), definition, section }: { open?: boolean; definition: ReportCardDefinition; section?: ReportCardSection } = $props();
	const owner = getReportCardsPageState();
	function flatten(rows: ReportCardSection[]): ReportCardSection[] {
		return rows.flatMap(row => [row, ...flatten(row.children ?? [])]);
	}
	let name = $state('');
	let kind = $state('group');
	let role = $state('matieres');
	let parent = $state('');
	let subject = $state('');
	let order = $state('1');
	let weight = $state('1');
	let coefficient = $state('');
	let busy = $state(false);
	let wasOpen = false;
	let openedIdentity = '';
	let revision = 0;
	let id = '';
	$effect.pre(() => {
		if (open && (!wasOpen || openedIdentity !== (`${definition.id}/${section?.id ?? 'new'}`))) {
			openedIdentity = `${definition.id}/${section?.id ?? 'new'}`;
			const raw = section?.source;
			id = section?.id ?? crypto.randomUUID();
			revision = definition.revision ?? 0;
			name = raw?.name ?? section?.name ?? '';
			kind = raw?.kind ?? section?.sectionType ?? 'group';
			role = raw?.role ?? '';
			parent = raw?.parentSectionId ?? '';
			subject = raw?.subjectId ?? '';
			order = String(raw?.order ?? flatten(definition.sections).length + 1);
			weight = String(raw?.weight ?? 1);
			coefficient = raw?.coefficient == null ? '' : String(raw.coefficient);
		}
		wasOpen = open;
	});
	const excludedParents = $derived(new Set(section ? flatten([section]).map(row => row.id) : []));
	const parents = $derived([{ value: '', label: $t('reportCards.root') }, ...flatten(definition.sections).filter(row => row.sectionType === 'group' && !excludedParents.has(row.id)).map(row => ({ value: row.id, label: row.name }))]);
	const subjects = $derived([...owner.subjects.map(row => ({ value: row.id, label: row.name })), ...(section?.subjectId && !owner.subjects.some(row => row.id === section.subjectId) ? [{ value: section.subjectId, label: section.subjectLabel ?? section.name }] : [])]);
	const valid = $derived(!!name.trim() && Number.isInteger(Number(order)) && Number(order) > 0 && Number.isFinite(Number(weight)) && Number(weight) > 0 && (!coefficient.trim() || (Number.isFinite(Number(coefficient)) && Number(coefficient) > 0)) && (kind !== 'subject' || (!!subject && !section?.children?.length)));
	async function save() {
		if (!valid || busy || !hasAnyPermission(['REPORT_CARD_CONFIGURE']))
			return;
		busy = true;
		try {
			const ok = await owner.configureDefinition({ id: definition.id, expectedRevision: revision, action: 'section', section: { id, name: name.trim(), kind: kind as 'group' | 'subject', role: kind === 'group' && role ? role as 'matieres' | 'synthese' | 'appreciation' : null, parentSectionId: parent || null, subjectId: kind === 'subject' ? subject : null, order: Number(order), weight: Number(weight), coefficient: coefficient.trim() ? Number(coefficient) : null } });
			if (ok)
				open = false;
		}
		finally {
			busy = false;
		}
	}
</script>
<FormModal bind:open title={section ? $t('reportCards.editSection') : $t('reportCards.addSection')} description={$t('reportCards.modelEditHelp')} {busy} submitLabel={$t('common.save')} cancelLabel={$t('common.cancel')} submitDisabled={!valid || !hasAnyPermission(['REPORT_CARD_CONFIGURE'])} onSubmit={save}>
	<label class="block space-y-1.5 text-sm"><span>{$t('reportCards.sectionName')}</span><Input bind:value={name} required /></label>
	<div class="space-y-1.5 text-sm"><span>{$t('reportCards.sectionType')}</span><FilterSelect class="w-full" aria-label={$t('reportCards.sectionType')} bind:value={kind} options={[{ value: 'group', label: $t('reportCards.group') }, { value: 'subject', label: $t('reportCards.subject') }]} /></div>
	{#if kind === 'subject'}<div class="space-y-1.5 text-sm"><span>{$t('reportCards.subject')}</span><FilterSelect class="w-full" aria-label={$t('reportCards.subject')} bind:value={subject} options={[{ value: '', label: '—' }, ...subjects]} /></div>{:else}<div class="space-y-1.5 text-sm"><span>{$t('reportCards.role')}</span><FilterSelect class="w-full" aria-label={$t('reportCards.role')} bind:value={role} options={[{ value: '', label: '—' }, ...['matieres', 'synthese', 'appreciation'].map(value => ({ value, label: $t(`reportCards.sectionKind.${value}`) }))]} /></div>{/if}
	<div class="space-y-1.5 text-sm"><span>{$t('reportCards.parent')}</span><FilterSelect class="w-full" aria-label={$t('reportCards.parent')} bind:value={parent} options={parents} /></div>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="block space-y-1.5 text-sm"><span>{$t('reportCards.order')}</span><Input type="number" min="1" step="1" bind:value={order} /></label>
		<label class="block space-y-1.5 text-sm"><span>{$t('reportCards.weight')}</span><Input type="number" min="0" step="any" bind:value={weight} /></label>
		<label class="block space-y-1.5 text-sm"><span>{$t('reportCards.coefficient')}</span><Input type="number" min="0" step="any" bind:value={coefficient} /></label>
	</div>
	{#if !valid && name.trim()}<p role="alert" class="text-sm text-destructive">{$t('reportCards.sectionInvalid')}</p>{/if}
</FormModal>
