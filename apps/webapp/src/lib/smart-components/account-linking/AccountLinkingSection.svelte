<script lang="ts">
	import type { components } from '$lib/api/schema';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Mail, ShieldCheck, User } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';
	import { AccountLinkingState } from './account-linking-state.svelte';

	type InvitationKind = components['schemas']['SendAccountInvitationCommand']['kind'];
	const { kind, targetId, subjectId = null, contactEmail = '', displayName }: {
		kind: InvitationKind;
		targetId: string;
		subjectId?: string | null;
		contactEmail?: string;
		displayName: string;
	} = $props();
	const state = new AccountLinkingState(() => ({ kind, targetId, subjectId, contactEmail, displayName }));
	const linkStatus = $derived(state.linkStatus);
	$effect(() => {
		void kind;
		void targetId;
		void subjectId;
		void state.loadPending();
		return () => state.cancelPending();
	});
	const statusLabel = $derived(linkStatus === 'linked'
		? $t('invitation.status.linked')
		: linkStatus === 'pending'
		? $t('invitation.status.pending')
		: $t('invitation.status.notLinked'));
	const statusTone = $derived(linkStatus === 'linked'
		? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
		: linkStatus === 'pending'
		? 'text-amber-800 bg-amber-500/10 border-amber-500/20'
		: 'text-muted-foreground bg-secondary/50 border-border');
	async function copyInviteLink() {
		if (!state.lastInviteUrl) {
			return;
		}
		try {
			await navigator.clipboard.writeText(state.lastInviteUrl);
			toast.success(get(t)('invitation.copyInviteLinkSuccess'));
		}
		catch {
			toast.error(get(t)('invitation.copyInviteLinkFailed'));
		}
	}
</script>

<div class="space-y-3 rounded-xl border border-border bg-card px-4 py-3">
	<div class="flex items-start justify-between gap-3">
		<div class="space-y-1">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('invitation.accountSection')}
			</Label>
			<p class="text-sm text-muted-foreground">{$t('invitation.accountHint')}</p>
		</div>
		<span class={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>
			{#if linkStatus === 'linked'}
				<ShieldCheck class="h-3.5 w-3.5" />
			{:else if linkStatus === 'pending'}
				<Mail class="h-3.5 w-3.5" />
			{:else}
				<User class="h-3.5 w-3.5" />
			{/if}
			{statusLabel}
		</span>
	</div>

	{#if linkStatus !== 'linked'}
		<PermissionGate permission="ACCESS_CONTROL_MANAGE" mode="disable" tooltip={$t('invitation.permissionRequired')}>
			{#snippet children({ disabled, title })}
				<div class="flex flex-wrap gap-2">
					{#if linkStatus === 'not_linked'}
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={disabled || state.busy || !contactEmail}
							title={!contactEmail ? $t('invitation.emailRequired') : title}
							onclick={state.send}
						>
							<Mail class="mr-1.5 h-3.5 w-3.5" />
							{$t('invitation.send')}
						</Button>
					{:else}
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={disabled || state.busy}
							title={title}
							onclick={state.resend}
						>
							{$t('invitation.resend')}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							disabled={disabled || state.busy}
							title={title}
							onclick={state.revoke}
						>
							{$t('invitation.revoke')}
						</Button>
					{/if}
				</div>
			{/snippet}
		</PermissionGate>

		{#if linkStatus === 'pending' && state.lastInviteUrl}
			<div class="space-y-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('invitation.inviteLinkLabel')}
				</Label>
				<div class="flex flex-col gap-2 sm:flex-row">
					<Input readonly value={state.lastInviteUrl} class="font-sans tabular-nums text-xs" />
					<Button type="button" size="sm" variant="outline" onclick={copyInviteLink}>
						{$t('invitation.copyInviteLink')}
					</Button>
				</div>
			</div>
		{/if}
	{/if}
	<PermissionGate permission="ACCESS_CONTROL_MANAGE">
		<details class="space-y-2 rounded-lg border p-3" ontoggle={(event) => {
			if (event.currentTarget.open)
				void state.loadHistory();
		}}>
			<summary class="cursor-pointer text-sm font-medium">{$t('profile.invitationHistory')}</summary>
			{#if state.historyLoading}<p class="text-xs">{$t('dataState.loading')}</p>{:else if state.historyError}<p class="text-xs" role="alert">{$t('dataState.error')}</p>{:else if !state.history.length}<p class="text-xs">{$t('profile.notProvided')}</p>{:else}
				{#each state.history as invitation (invitation.id)}
					<dl class="space-y-1 rounded-lg border p-2 text-xs">
						<div><dt class="text-muted-foreground">{$t('common.status')}</dt><dd>{$t(`profile.invitationStatus.${invitation.status}`)}</dd></div>
						<div><dt class="text-muted-foreground">{$t('profile.contactMethods')}</dt><dd>{invitation.contactChannel} · {invitation.contactValue}</dd></div>
						<div><dt class="text-muted-foreground">{$t('profile.createdAt')}</dt><dd>{String(invitation.createdAt)} · {invitation.createdByStaffId}</dd></div>
						<div><dt class="text-muted-foreground">{$t('profile.invitationExpiry')}</dt><dd>{String(invitation.expiresAt)}</dd></div>
						{#if invitation.lastSentAt}<div><dt class="text-muted-foreground">{$t('profile.lastSentAt')}</dt><dd>{String(invitation.lastSentAt)}</dd></div>{/if}
						{#if invitation.acceptedAt}<div><dt class="text-muted-foreground">{$t('profile.acceptedAt')}</dt><dd>{String(invitation.acceptedAt)}</dd></div>{/if}
					</dl>
				{/each}
			{/if}
		</details>
	</PermissionGate>
</div>
