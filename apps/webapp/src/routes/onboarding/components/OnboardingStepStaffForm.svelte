<script lang="ts">
	import type { OnboardingStaffInviteRole } from '$lib/onboarding/types';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { ONBOARDING_STAFF_INVITE_PROFILES } from '$lib/onboarding/staff-invite-profiles';
	import {
		addStaffInvite,
		removeStaffInvite,
		updateStaffInvite,
	} from '$lib/onboarding/staff-step-helpers';
	import { staffInviteCount } from '$lib/onboarding/staff-step-validation';
	import { onboardingContext } from '../context.svelte';

	interface Props {
		disabled?: boolean;
	}

	const { disabled = false }: Props = $props();

	const inviteCount = $derived(staffInviteCount(onboardingContext.draft.staffInvites));

	function persistDraft() {
		onboardingContext.persist();
	}

	function addInviteRow() {
		onboardingContext.draft.staffInvites = addStaffInvite(onboardingContext.draft.staffInvites);
		persistDraft();
	}

	function removeInviteRow(id: string) {
		onboardingContext.draft.staffInvites = removeStaffInvite(onboardingContext.draft.staffInvites, id);
		persistDraft();
	}

	function updateEmail(id: string, email: string) {
		onboardingContext.draft.staffInvites = updateStaffInvite(
			onboardingContext.draft.staffInvites,
			id,
			{ email },
		);
		persistDraft();
	}

	function updateRole(id: string, role: string) {
		onboardingContext.draft.staffInvites = updateStaffInvite(
			onboardingContext.draft.staffInvites,
			id,
			{ role: role as OnboardingStaffInviteRole },
		);
		persistDraft();
	}

	function roleLabel(role: OnboardingStaffInviteRole | '') {
		const profile = ONBOARDING_STAFF_INVITE_PROFILES.find(entry => entry.value === role);
		return profile ? $t(profile.labelKey) : '';
	}
</script>

<div class="space-y-6">
	<section class="space-y-3">
		<p class="text-sm text-muted-foreground">{$t('onboarding.staff.hint')}</p>
		<p class="text-xs text-muted-foreground">{$t('onboarding.staff.ownerEmailHint')}</p>

		{#if onboardingContext.draft.staffInvites.length === 0}
			<div class="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
				{$t('onboarding.staff.empty')}
			</div>
		{:else}
			<div class="space-y-3">
				{#each onboardingContext.draft.staffInvites as invite (invite.id)}
					<article class="rounded-xl border border-border bg-secondary/20 p-4">
						<div class="grid gap-3 sm:grid-cols-[1fr_minmax(10rem,12rem)_auto] sm:items-end">
							<div class="space-y-1.5">
								<Label for={`staff-email-${invite.id}`}>{$t('onboarding.staff.emailLabel')}</Label>
								<Input
									id={`staff-email-${invite.id}`}
									type="email"
									autocomplete="email"
									placeholder={$t('onboarding.staff.emailPlaceholder')}
									value={invite.email}
									{disabled}
									oninput={event => updateEmail(invite.id, event.currentTarget.value)}
								/>
							</div>
							<div class="space-y-1.5">
								<Label>{$t('onboarding.staff.roleLabel')}</Label>
								<Select.Root
									type="single"
									value={invite.role}
									onValueChange={(value) => {
										if (value) {
											updateRole(invite.id, value);
										}
									}}
								>
									<Select.Trigger class="w-full" {disabled}>
										<Select.Value placeholder={$t('onboarding.staff.rolePlaceholder')}>
											{roleLabel(invite.role)}
										</Select.Value>
									</Select.Trigger>
									<Select.Content class="z-[100]">
										{#each ONBOARDING_STAFF_INVITE_PROFILES as profile (profile.value)}
											<Select.Item value={profile.value} label={$t(profile.labelKey)}>
												{$t(profile.labelKey)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
								{disabled}
								onclick={() => removeInviteRow(invite.id)}
								aria-label={$t('onboarding.staff.removeRow')}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</article>
				{/each}
			</div>
		{/if}

		<Button type="button" variant="outline" {disabled} onclick={addInviteRow}>
			<Plus class="mr-2 h-4 w-4" />
			{$t('onboarding.staff.addRow')}
		</Button>
	</section>

	{#if inviteCount > 0}
		<section class="rounded-xl border border-border bg-card px-4 py-3 text-sm">
			<p class="font-medium text-foreground">{$t('onboarding.staff.summaryTitle')}</p>
			<p class="mt-1 text-muted-foreground">
				{$t('onboarding.staff.summaryBody', { count: inviteCount })}
			</p>
		</section>
	{/if}

	{#if onboardingContext.draft.staffStepSubmitted}
		<p class="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
			{$t('onboarding.staffStep.alreadySubmitted')}
		</p>
	{/if}
</div>
