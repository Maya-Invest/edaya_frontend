<script lang="ts">
	import type { NotificationSettingsPageSlice as NotificationSettingsPageData } from '../lib/notification-settings-helpers';
	import { page } from '$app/stores';
	import { returnToProfileModalIfRequested } from '$lib/account/profile-navigation';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { Check } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { onDestroy } from 'svelte';
	import { getNotificationSettingsPageState } from '../notification-settings-page.svelte';

	const actionState = getNotificationSettingsPageState();
	const { data }: {
		data: NotificationSettingsPageData;
	} = $props();
	const uid = $props.id();
	const staffSettings = $derived(data.staffSettings);
	const loginEmail = $derived(data.loginEmail ?? authSession.loginEmail ?? '');
	const defaultEmail = $derived(loginEmail || staffSettings?.email || '');
	let notificationEmail = $state('');
	let notificationPhone = $state('');
	let useDefaultEmail = $state(true);
	let saving = $state(false);
	let baseline = $state('');
	let hydratedId = $state<string | null>(null);
	let mounted = true;
	function identity() {
		return JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId, authSession.userId]);
	}
	function draft() {
		return JSON.stringify([useDefaultEmail, useDefaultEmail ? '' : notificationEmail.trim(), notificationPhone.trim()]);
	}
	const dirty = $derived(Boolean(hydratedId) && draft() !== baseline);
	function cancel() {
		if (!baseline)
			return;
		const saved = JSON.parse(baseline) as [
			boolean,
			string,
			string,
		];
		[useDefaultEmail, notificationEmail, notificationPhone] = saved;
	}
	const unregister = getDirtyWork()?.register({ isDirty: () => dirty, discard: cancel });
	onDestroy(() => {
		mounted = false;
		unregister?.();
	});
	$effect(() => {
		if (!staffSettings || hydratedId === identity())
			return;
		hydratedId = identity();
		useDefaultEmail = !staffSettings.notificationEmail;
		notificationEmail = staffSettings.notificationEmail ?? '';
		notificationPhone = staffSettings.notificationPhone ?? '';
		baseline = draft();
	});
	async function save() {
		if (saving || !dirty || !authSession.subjectId)
			return;
		const submittedIdentity = identity();
		const submittedDraft = draft();
		const origin = new URL($page.url);
		const submitted = { notificationEmail: useDefaultEmail ? null : notificationEmail.trim(), notificationPhone: notificationPhone.trim() || null };
		saving = true;
		try {
			const ok = await actionState.performSaveNotificationContact(submitted, { successMessage: $t('account.notifications.saved') });
			if (ok && mounted && identity() === submittedIdentity) {
				baseline = submittedDraft;
				authSession.updateNotificationContact(submitted);
				await returnToProfileModalIfRequested(origin);
			}
		}
		finally {
			saving = false;
		}
	}
</script>

{#if staffSettings}
	<form class="max-w-lg space-y-6" aria-busy={saving} onsubmit={(event) => {
		event.preventDefault();
		void save();
	}}>
		<fieldset disabled={saving} class="min-w-0 space-y-3">
			<legend class="mb-3 text-sm font-semibold">{$t('account.settings.emailDestination')}</legend>
			<label class="flex min-h-11 items-start gap-3">
				<input type="radio" name={`${uid}-email-mode`} value="default" checked={useDefaultEmail} onchange={() => { useDefaultEmail = true; }} class="mt-1 h-4 w-4 shrink-0 accent-primary" />
				<span class="min-w-0 text-sm"><span>{$t(loginEmail ? 'account.settings.useSignInEmail' : 'account.settings.useDefaultEmail')}</span><span class="mt-1 block break-all text-xs text-muted-foreground">{defaultEmail || $t('value.notProvided')}</span></span>
			</label>
			<label class="flex min-h-11 items-start gap-3"><input type="radio" name={`${uid}-email-mode`} value="custom" checked={!useDefaultEmail} onchange={() => { useDefaultEmail = false; }} class="mt-1 h-4 w-4 shrink-0 accent-primary" /><span class="text-sm">{$t('account.settings.useOtherEmail')}</span></label>
			{#if !useDefaultEmail}<div class="space-y-2"><Label for={`${uid}-email`}>{$t('account.notifications.deliveryEmail')}</Label><Input id={`${uid}-email`} type="email" bind:value={notificationEmail} required disabled={saving} autocomplete="email" /></div>{/if}
		</fieldset>
		<section class="space-y-3 border-t border-border pt-6">
			<Label for={`${uid}-phone`}>{$t('account.notifications.deliveryPhone')}</Label><Input id={`${uid}-phone`} type="tel" bind:value={notificationPhone} disabled={saving} autocomplete="tel" placeholder={$t('account.notifications.deliveryPhonePlaceholder')} />
			<p class="text-xs text-muted-foreground">{$t('account.settings.notificationContactHint')}</p>
		</section>
		<section class="flex items-start justify-between gap-4 border-t border-border pt-6"><div><h3 class="text-sm font-semibold">{$t('account.settings.inApp')}</h3><p class="mt-1 text-sm text-muted-foreground">{$t(authSession.subjectId ? 'account.notifications.staffInApp' : 'account.notifications.noSubject')}</p></div>{#if authSession.subjectId}<Check class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />{/if}</section>
		{#if dirty}<div data-testid="notification-save-actions" class="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-card py-4"><Button variant="outline" disabled={saving} onclick={cancel}>{$t('form.discard')}</Button><Button type="submit" disabled={saving || !authSession.subjectId}>{$t('common.save')}</Button></div>{/if}
	</form>
{:else}<p class="text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>{/if}
