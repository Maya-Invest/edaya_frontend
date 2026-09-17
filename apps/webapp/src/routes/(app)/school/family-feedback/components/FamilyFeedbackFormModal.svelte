<script lang="ts">
	import type { FamilyFeedbackAudiencePreview, FamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
	import { academicContext } from '$lib/academic/context.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { toDatetimeLocalValue, toFamilyFeedbackIso } from '$lib/family-feedback/status';
	import { t } from '$lib/i18n';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import { previewAudienceOnPage } from '../lib/family-feedback-detail-mutations';

	let {
		campaign,
		open = $bindable(false),
		onCreated,
	}: {
		campaign?: FamilyFeedbackCampaign;
		open?: boolean;
		onCreated?: (campaignId: string) => void;
	} = $props();

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const initial = untrack(() => campaign);

	let busy = $state(false);
	let academicPeriodId = $state(initial?.academicPeriodId ?? academicContext.periodId);
	let teacherAssignmentId = $state(initial?.teacherAssignmentId ?? '');
	let opensAt = $state(toDatetimeLocalValue(initial?.opensAt));
	let closesAt = $state(toDatetimeLocalValue(initial?.closesAt));
	let moderatorStaffId = $state(initial?.moderatorStaffId ?? '');
	let preview = $state<FamilyFeedbackAudiencePreview | null>(null);

	const isEdit = $derived(campaign !== undefined);
	const periods = $derived(academicContext.periodsForYear);
	const periodLabel = $derived(periods.find(period => period.id === academicPeriodId)?.name ?? $t('familyFeedback.periodLabel'));
	const assignmentLabel = $derived.by(() => {
		const label = familyFeedbackPage.assignments.find(entry => entry.id === teacherAssignmentId)?.label;
		return label ?? $t('familyFeedback.assignmentLabel');
	});
	const moderatorLabel = $derived.by(() => {
		const name = familyFeedbackPage.staff.find(entry => entry.id === moderatorStaffId)?.name;
		return name ?? $t('familyFeedback.moderator');
	});
	const canSubmit = $derived.by(() => {
		if (isEdit) {
			return true;
		}
		return academicPeriodId.length > 0 && teacherAssignmentId.length > 0;
	});

	$effect(() => {
		if (isEdit || !academicPeriodId || !teacherAssignmentId) {
			preview = null;
			return;
		}
		let cancelled = false;
		void previewAudienceOnPage({ academicPeriodId, teacherAssignmentId }).then((result) => {
			if (!cancelled) {
				preview = result;
			}
		});
		return () => {
			cancelled = true;
		};
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}
		busy = true;
		const opensAtValue = toFamilyFeedbackIso(opensAt);
		const closesAtValue = toFamilyFeedbackIso(closesAt);
		if (campaign) {
			const ok = await familyFeedbackPage.updateCampaign({
				id: campaign.id,
				opensAt: opensAtValue,
				closesAt: closesAtValue,
				successMessage: get(t)('familyFeedback.updateSuccess'),
			});
			busy = false;
			if (ok) {
				open = false;
			}
			return;
		}
		const campaignId = await familyFeedbackPage.createCampaign({
			academicPeriodId,
			teacherAssignmentId,
			opensAt: opensAtValue,
			closesAt: closesAtValue,
			moderatorStaffId: moderatorStaffId || undefined,
			successMessage: get(t)('familyFeedback.createSuccess'),
		});
		busy = false;
		if (campaignId) {
			open = false;
			onCreated?.(campaignId);
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('familyFeedback.editTitle') : $t('familyFeedback.createTitle')}
	description={isEdit ? familyFeedbackPage.campaignTitle(campaign!) : $t('familyFeedback.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<p class="text-sm text-muted-foreground">{$t('familyFeedback.confidentiality')}</p>
	{#if !isEdit}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.assignmentLabel')}
			</Label>
			<Select.Root type="single" value={teacherAssignmentId} onValueChange={v => v && (teacherAssignmentId = v)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('familyFeedback.assignmentLabel')}>
						{assignmentLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each familyFeedbackPage.assignments as entry (entry.id)}
						<Select.Item value={entry.id} label={entry.label}>
							{entry.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.periodLabel')}
			</Label>
			<Select.Root type="single" value={academicPeriodId} onValueChange={v => v && (academicPeriodId = v)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('familyFeedback.periodLabel')}>
						{periodLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each periods as period (period.id)}
						<Select.Item value={period.id} label={period.name}>
							{period.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.moderator')}
			</Label>
			<Select.Root type="single" value={moderatorStaffId} onValueChange={v => (moderatorStaffId = v ?? '')}>
				<Select.Trigger>
					<Select.Value placeholder={$t('familyFeedback.moderator')}>
						{moderatorLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each familyFeedbackPage.staff as staff (staff.id)}
						<Select.Item value={staff.id} label={staff.name}>
							{staff.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.opensAt')}
			</Label>
			<Input type="datetime-local" bind:value={opensAt} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.closesAt')}
			</Label>
			<Input type="datetime-local" bind:value={closesAt} />
		</div>
	</div>
	{#if preview}
		<div class="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
			<p class="font-medium">{$t('familyFeedback.audience')}</p>
			<p>{$t('familyFeedback.eligible', { n: preview.eligibleCount })}</p>
			<p>{$t('familyFeedback.completed', { n: preview.completedCount })}</p>
			{#if preview.blockers.length > 0}
				<p class="mt-1 text-xs text-muted-foreground">{$t('familyFeedback.blockers')}: {preview.blockers.join(', ')}</p>
			{/if}
		</div>
	{/if}
</FormModal>
