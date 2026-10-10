<script lang="ts">
	import type { FamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import {
		FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION,
		FAMILY_FEEDBACK_MODERATE_PERMISSION,
		FAMILY_FEEDBACK_PUBLISH_PERMISSION,
	} from '$lib/family-feedback/permissions';
	import { FAMILY_FEEDBACK_STATUS_TONE } from '$lib/family-feedback/status';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import FamilyFeedbackFormModal from '../../components/FamilyFeedbackFormModal.svelte';
	import { getFamilyFeedbackPageState } from '../../family-feedback-page.svelte';
	import { familyFeedbackActionAvailable, familyFeedbackActionBlocker } from '../../lib/family-feedback-actions';

	const {
		campaign,
	}: {
		campaign: FamilyFeedbackCampaign;
	} = $props();

	type FamilyFeedbackDrawerModal
		= | 'edit'
			| 'assign-moderator'
			| 'schedule'
			| 'open'
			| 'close'
			| 'cancel'
			| 'theme'
			| 'publish'
			| 'archive';

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const modals = createUrlSyncedModals<FamilyFeedbackDrawerModal>({
		allowed: ['edit', 'assign-moderator', 'schedule', 'open', 'close', 'cancel', 'theme', 'publish', 'archive'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	afterNavigate(() => {
		if (modals.active && modals.target) {
			replaceRouteSurface(writeModalSurface($page.url, { modal: modals.active }));
		}
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const assignOpen = bindUrlModal(modals, 'assign-moderator');
	const scheduleOpen = bindUrlModal(modals, 'schedule');
	const openOpen = bindUrlModal(modals, 'open');
	const closeOpen = bindUrlModal(modals, 'close');
	const cancelOpen = bindUrlModal(modals, 'cancel');
	const themeOpen = bindUrlModal(modals, 'theme');
	const publishOpen = bindUrlModal(modals, 'publish');
	const archiveOpen = bindUrlModal(modals, 'archive');

	const live = $derived(familyFeedbackPage.findCampaign(campaign.id) ?? campaign);
	const title = $derived(familyFeedbackPage.campaignTitle(live));
	const periodName = $derived(academicContext.periods.find(period => period.id === live.academicPeriodId)?.label ?? live.academicPeriodId);
	const moderatorName = $derived.by(() => {
		const name = familyFeedbackPage.staff.find(entry => entry.id === live.moderatorStaffId)?.name;
		return name ?? $t('familyFeedback.noModerator');
	});

	const openBlocker = $derived(familyFeedbackActionBlocker(live, 'open'));
	const scheduleBlocker = $derived(familyFeedbackActionBlocker(live, 'schedule'));

	let themeDraft = $state('');
	let moderatorStaffId = $state('');
	let actionBusy = $state(false);
	let seededCampaignId = $state<string | null>(null);

	$effect(() => {
		const campaignId = live.id;
		if (seededCampaignId === campaignId) {
			return;
		}
		themeDraft = live.themeDraft ?? '';
		moderatorStaffId = live.moderatorStaffId ?? '';
		seededCampaignId = campaignId;
	});

	function fmtDate(value: string | undefined) {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString($locale, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	async function runAction(work: () => Promise<boolean>, close: { open: boolean }) {
		if (actionBusy)
			return;
		const campaignId = live.id;
		const activeModal = modals.active;
		actionBusy = true;
		try {
			const ok = await work();
			if (ok && live.id === campaignId && modals.active === activeModal) {
				close.open = false;
			}
		}
		finally {
			actionBusy = false;
		}
	}

	const dateSummary = $derived.by(() => {
		return [
			`${$t('familyFeedback.periodLabel')}: ${periodName}`,
			`${$t('familyFeedback.opensAt')}: ${fmtDate(live.opensAt)}`,
			`${$t('familyFeedback.closesAt')}: ${fmtDate(live.closesAt)}`,
		].join(' · ');
	});
</script>

<DrawerEntityHeader name={title} summary={dateSummary}>
	{#snippet chips()}
		<span
			class={cn(
				'rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
				FAMILY_FEEDBACK_STATUS_TONE[live.status],
			)}
		>
			{$t(`familyFeedback.status.${live.status}`)}
		</span>
	{/snippet}
	{#snippet actions()}
		{#if live.status === 'draft' || live.status === 'scheduled'}
			<PermissionGate
				permission={FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION}
				mode="disable"
				tooltip={$t('familyFeedback.permissionManage')}
			>
				{#snippet children({ disabled, title: tooltipTitle })}
					{#if live.status === 'draft'}
						<Button
							variant="outline"
							size="sm"
							class="rounded-full"
							disabled={disabled || actionBusy || Boolean(scheduleBlocker)}
							title={tooltipTitle || (scheduleBlocker ? $t(scheduleBlocker) : undefined)}
							onclick={() => (scheduleOpen.open = true)}
						>
							{$t('familyFeedback.schedule')}
						</Button>
					{/if}
					<Button
						size="sm"
						class="rounded-full"
						disabled={disabled || actionBusy || Boolean(openBlocker)}
						title={tooltipTitle || (openBlocker ? $t(openBlocker) : undefined)}
						onclick={() => (openOpen.open = true)}
					>
						{$t('familyFeedback.open')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/if}
		{#if live.status === 'closed'}
			<PermissionGate
				permission={FAMILY_FEEDBACK_PUBLISH_PERMISSION}
				mode="disable"
				tooltip={$t('familyFeedback.permissionPublish')}
			>
				{#snippet children({ disabled, title: tooltipTitle })}
					<Button
						size="sm"
						class="rounded-full"
						disabled={disabled}
						title={tooltipTitle}
						onclick={() => (publishOpen.open = true)}
					>
						{$t('familyFeedback.publish')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/if}
	{/snippet}
	{#snippet overflow()}
		<PermissionGate
			permission={FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION}
			mode="disable"
			tooltip={$t('familyFeedback.permissionManage')}
		>
			{#snippet children({ disabled, title: tooltipTitle })}
				{#if live.status === 'draft' || live.status === 'scheduled'}
					<RowActionMenuItem {disabled} title={tooltipTitle} onclick={() => modals.open('edit')}>
						{$t('common.edit')}
					</RowActionMenuItem>
				{/if}
				{#if familyFeedbackActionAvailable(live, 'assign-moderator')}
					<RowActionMenuItem {disabled} title={tooltipTitle} onclick={() => (assignOpen.open = true)}>
						{$t('familyFeedback.assignModerator')}
					</RowActionMenuItem>
				{/if}
				{#if familyFeedbackActionAvailable(live, 'close')}
					<RowActionMenuItem {disabled} title={tooltipTitle} onclick={() => (closeOpen.open = true)}>
						{$t('familyFeedback.close')}
					</RowActionMenuItem>
				{/if}
				{#if live.status === 'draft' || live.status === 'scheduled' || live.status === 'open'}
					<RowActionMenuItem destructive {disabled} title={tooltipTitle} onclick={() => (cancelOpen.open = true)}>
						{$t('familyFeedback.cancel')}
					</RowActionMenuItem>
				{/if}
				{#if familyFeedbackActionAvailable(live, 'archive')}
					<RowActionMenuItem {disabled} title={tooltipTitle} onclick={() => (archiveOpen.open = true)}>
						{$t('familyFeedback.archive')}
					</RowActionMenuItem>
				{/if}
			{/snippet}
		</PermissionGate>
		{#if familyFeedbackActionAvailable(live, 'theme') && !live.answersPurgedAt}
			<PermissionGate
				permission={FAMILY_FEEDBACK_MODERATE_PERMISSION}
				mode="disable"
				tooltip={$t('familyFeedback.permissionModerate')}
			>
				{#snippet children({ disabled, title: tooltipTitle })}
					<RowActionMenuItem {disabled} title={tooltipTitle} onclick={() => (themeOpen.open = true)}>
						{$t('familyFeedback.theme')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/if}
	{/snippet}
</DrawerEntityHeader>
{#if (live.status === 'draft' || live.status === 'scheduled') && (openBlocker || scheduleBlocker)}
	<p role="status" class="mt-3 text-sm text-muted-foreground">{$t(openBlocker ?? scheduleBlocker!)}</p>
{/if}

<FamilyFeedbackFormModal campaign={live} bind:open={editOpen.open} />

<FormModal
	bind:open={assignOpen.open}
	title={$t('familyFeedback.assignModeratorTitle')}
	description={$t('familyFeedback.assignModeratorDescription')}
	submitLabel={$t('common.save')}
	busy={actionBusy}
	submitDisabled={!moderatorStaffId}
	onSubmit={() => runAction(
		() => familyFeedbackPage.assignModerator({
			id: live.id,
			moderatorStaffId,
			successMessage: get(t)('familyFeedback.assignModeratorSuccess'),
		}),
		assignOpen,
	)}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('familyFeedback.moderator')}
		</Label>
		<Select.Root type="single" value={moderatorStaffId} onValueChange={v => v && (moderatorStaffId = v)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('familyFeedback.moderator')}>
					{familyFeedbackPage.staff.find(staff => staff.id === moderatorStaffId)?.name ?? moderatorName}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each familyFeedbackPage.staff as staff (staff.id)}
					<Select.Item value={staff.id} label={staff.name}>{staff.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</FormModal>

<FormModal
	bind:open={themeOpen.open}
	title={$t('familyFeedback.themeTitle')}
	description={$t('familyFeedback.themeDescription')}
	submitLabel={$t('common.save')}
	busy={actionBusy}
	submitDisabled={themeDraft.trim().length === 0}
	onSubmit={() => runAction(
		() => familyFeedbackPage.saveThemeDraft({
			id: live.id,
			themes: themeDraft,
			successMessage: get(t)('familyFeedback.themeSuccess'),
		}),
		themeOpen,
	)}
>
	<Textarea bind:value={themeDraft} rows={8} />
</FormModal>

<ConfirmModal
	bind:open={scheduleOpen.open}
	title={$t('familyFeedback.scheduleTitle')}
	description={scheduleBlocker ? $t(scheduleBlocker) : $t('familyFeedback.scheduleDescription')}
	confirmDisabled={Boolean(scheduleBlocker)}
	confirmLabel={$t('familyFeedback.schedule')}
	cancelLabel={$t('common.cancel')}
	variant="default"
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.scheduleCampaign(live.id, get(t)('familyFeedback.scheduleSuccess')),
		scheduleOpen,
	)}
/>
<ConfirmModal
	bind:open={openOpen.open}
	title={$t('familyFeedback.openTitle')}
	description={openBlocker ? $t(openBlocker) : $t('familyFeedback.openDescription')}
	confirmDisabled={Boolean(openBlocker)}
	confirmLabel={$t('familyFeedback.open')}
	cancelLabel={$t('common.cancel')}
	variant="default"
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.openCampaign(live.id, get(t)('familyFeedback.openSuccess')),
		openOpen,
	)}
/>
<ConfirmModal
	bind:open={closeOpen.open}
	title={$t('familyFeedback.closeTitle')}
	description={$t('familyFeedback.closeDescription')}
	confirmLabel={$t('familyFeedback.close')}
	cancelLabel={$t('common.cancel')}
	variant="default"
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.closeCampaign(live.id, get(t)('familyFeedback.closeSuccess')),
		closeOpen,
	)}
/>
<ConfirmModal
	bind:open={cancelOpen.open}
	title={$t('familyFeedback.cancelTitle')}
	description={$t('familyFeedback.cancelDescription')}
	confirmLabel={$t('familyFeedback.cancel')}
	cancelLabel={$t('common.cancel')}
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.cancelCampaign(live.id, get(t)('familyFeedback.cancelSuccess')),
		cancelOpen,
	)}
/>
<ConfirmModal
	bind:open={publishOpen.open}
	title={$t('familyFeedback.publishTitle')}
	description={$t('familyFeedback.publishDescription')}
	confirmLabel={$t('familyFeedback.publish')}
	cancelLabel={$t('common.cancel')}
	variant="default"
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.publishCampaign(live.id, get(t)('familyFeedback.publishSuccess')),
		publishOpen,
	)}
/>
<ConfirmModal
	bind:open={archiveOpen.open}
	title={$t('familyFeedback.archiveTitle')}
	description={$t('familyFeedback.archiveDescription')}
	confirmLabel={$t('familyFeedback.archive')}
	cancelLabel={$t('common.cancel')}
	variant="default"
	busy={actionBusy}
	onConfirm={() => runAction(
		() => familyFeedbackPage.archiveCampaign(live.id, get(t)('familyFeedback.archiveSuccess')),
		archiveOpen,
	)}
/>
