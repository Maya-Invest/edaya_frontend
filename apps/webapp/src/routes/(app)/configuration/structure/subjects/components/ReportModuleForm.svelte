<script lang="ts">
	import type { ReportModule } from '$lib/types/report-cards';
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { getSubjectsPageState } from '../subjects-page.svelte';

	let { open = $bindable(false), module, action = 'save' }: { open?: boolean; module?: ReportModule; action?: 'save' | 'delete' | 'assign' } = $props();
	const subjectsPage = getSubjectsPageState();
	let wasOpen = false;
	let name = $state('');
	let shortName = $state('');
	let order = $state('1');
	let mode = $state<'subject_coefficients' | 'explicit'>('subject_coefficients');
	let weight = $state('');
	let members = $state<string[]>([]);
	let revision = 0;
	let scope = $state({ gradeLevelId: '', academicYearId: '' });
	let id = '';
	let requestId = '';
	let busy = $state(false);
	let error = $state('');
	const allowed = $derived(hasPermission('REPORT_CARD_CONFIGURE', { gradeLevelId: scope.gradeLevelId }));
	const valid = $derived(allowed && !!scope.gradeLevelId && (action !== 'save' || (name.trim().length > 0 && Number.isInteger(Number(order)) && Number(order) > 0 && (mode === 'subject_coefficients' || (weight !== '' && Number.isFinite(Number(weight)) && Number(weight) > 0)))));
	$effect(() => {
		if (open && !wasOpen && subjectsPage.slice?.configuration) {
			const config = subjectsPage.slice.configuration;
			scope = { gradeLevelId: config.gradeLevelId, academicYearId: config.academicYearId };
			revision = config.settings.revision;
			id = module?.id ?? crypto.randomUUID();
			requestId = crypto.randomUUID();
			name = module?.name ?? '';
			shortName = module?.shortName ?? module?.name ?? '';
			order = String(module?.order ?? config.modules.length + 1);
			mode = module?.weightingMode ?? 'subject_coefficients';
			weight = module?.explicitWeight == null ? '' : String(module.explicitWeight);
			members = config.subjects.filter(subject => subject.reportModuleId === id).map(subject => subject.id);
			error = '';
		}
		wasOpen = open;
	});
	async function save() {
		if (!valid || busy || !subjectsPage.slice?.configuration || scope.gradeLevelId !== subjectsPage.slice.configuration.gradeLevelId || scope.academicYearId !== subjectsPage.slice.configuration.academicYearId)
			return;
		busy = true;
		error = '';
		try {
			const saved = await subjectsPage.configureModules({ ...scope, requestId, expectedRevision: revision, action, ...(action === 'save' ? { module: { id, shortName, name: name.trim(), order: Number(order), weightingMode: mode, explicitWeight: mode === 'explicit' ? Number(weight) : null } } : { moduleId: id }), ...(action === 'assign' ? { assignments: subjectsPage.subjects().filter(subject => members.includes(subject.id) || subject.reportModuleId === id).map(subject => ({ subjectId: subject.id, moduleId: members.includes(subject.id) ? id : null })) } : {}) });
			if (saved) {
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
{#if action === 'delete'}
	<ConfirmModal bind:open title={$t('modules.delete')} target={module?.name} description={$t('modules.deleteHelp')} confirmLabel={$t('modules.delete')} {busy} confirmDisabled={!valid || !module} errorMessage={error} onConfirm={save} />
{:else}
	<FormModal bind:open title={$t(action === 'assign' ? 'modules.members' : module ? 'modules.edit' : 'modules.add')} description={$t('modules.help')} {busy} submitDisabled={!valid} onSubmit={save}>
		{#if action === 'assign'}
			{#each subjectsPage.subjects() as subject (subject.id)}
				<Label class="flex min-h-11 items-center gap-2"><Checkbox checked={members.includes(subject.id)} onCheckedChange={checked => members = checked ? [...members, subject.id] : members.filter(id => id !== subject.id)} />{subject.name}</Label>
			{/each}
		{:else}
			<Label class="block space-y-2"><span>{$t('modules.name')}</span><Input required bind:value={name} /></Label>
			<ShortNameField {name} bind:value={shortName} creating={!module} />
			<Label class="block space-y-2"><span>{$t('modules.order')}</span><Input type="number" min="1" step="1" required bind:value={order} /></Label>
			<Label class="block space-y-2"><span>{$t('modules.mode')}</span>
				<Select.Root type="single" bind:value={mode}><Select.Trigger><Select.Value>{$t(mode === 'explicit' ? 'modules.explicit' : 'modules.sum')}</Select.Value></Select.Trigger><Select.Content><Select.Item value="subject_coefficients">{$t('modules.sum')}</Select.Item><Select.Item value="explicit">{$t('modules.explicit')}</Select.Item></Select.Content></Select.Root>
			</Label>
			{#if mode === 'explicit'}<Label class="block space-y-2"><span>{$t('modules.weight')}</span><Input type="number" min="0" step="any" required bind:value={weight} /></Label>{/if}
		{/if}
		{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
	</FormModal>
{/if}
