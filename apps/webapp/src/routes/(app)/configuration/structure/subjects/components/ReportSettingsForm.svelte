<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { getSubjectsPageState } from '../subjects-page.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	const subjectsPage = getSubjectsPageState();
	let wasOpen = false;
	let threshold = $state('');
	let revision = 0;
	let scope = $state({ gradeLevelId: '', academicYearId: '' });
	let busy = $state(false);
	let error = $state('');
	let requestId = '';
	const policy = $derived(academicContext.gradeLevels.find(level => level.id === scope.gradeLevelId)?.gradingPolicies?.find(policy => policy.academicYearId === scope.academicYearId));
	const allowed = $derived(hasPermission('REPORT_CARD_CONFIGURE', { gradeLevelId: scope.gradeLevelId }));
	const valid = $derived(allowed && (threshold === '' || (policy && Number.isFinite(Number(threshold)) && Number(threshold) >= policy.scale.minScore && Number(threshold) <= policy.scale.maxScore)));
	$effect(() => {
		if (open && !wasOpen && subjectsPage.slice?.configuration) {
			const configuration = subjectsPage.slice.configuration;
			scope = { gradeLevelId: configuration.gradeLevelId, academicYearId: configuration.academicYearId };
			revision = configuration.settings.revision;
			threshold = configuration.settings.passThreshold == null ? '' : String(configuration.settings.passThreshold);
			requestId = crypto.randomUUID();
			error = '';
		}
		wasOpen = open;
	});
	async function save() {
		if (!valid || busy || scope.gradeLevelId !== subjectsPage.slice?.configuration?.gradeLevelId || scope.academicYearId !== subjectsPage.slice?.configuration?.academicYearId)
			return;
		busy = true;
		try {
			if (await subjectsPage.configureSettings({ ...scope, requestId, expectedRevision: revision, passThreshold: threshold === '' ? null : Number(threshold) })) {
				open = false;
			}
			else {
				error = $t('modules.saveFailed');
				requestId = crypto.randomUUID();
			}
		}
		finally { busy = false; }
	}
</script>
<FormModal bind:open title={$t('modules.settings')} {busy} submitDisabled={!valid} onSubmit={save}>
	<Label class="block space-y-2"><span>{$t('reportCards.passThreshold')}</span><Input type="number" min={policy?.scale.minScore} max={policy?.scale.maxScore} step={policy ? 10 ** -policy.scale.decimalPlaces : 'any'} bind:value={threshold} /></Label>
	{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
</FormModal>
