<script lang="ts">
	import type { NotificationSettingsPageData } from '$lib/queries/account.queries';

	import { page } from '$app/stores';
	import { returnToProfileModalIfRequested } from '$lib/account/profile-navigation';
	import { authSession } from '$lib/auth/session.svelte';

	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getNotificationSettingsPageState } from '../notification-settings-page.svelte';

	const actionState = getNotificationSettingsPageState();

	const { data }: { data: NotificationSettingsPageData } = $props();

	const staffSettings = $derived(data.staffSettings);
	const loginEmail = $derived(data.loginEmail ?? authSession.loginEmail ?? '');

	let notificationEmail = $state('');
	let notificationPhone = $state('');
	let saving = $state(false);
	let hydratedId = $state<string | null>(null);

	$effect(() => {
		if (!staffSettings || staffSettings.subjectId === hydratedId) {
			return;
		}
		hydratedId = staffSettings.subjectId;
		notificationEmail = staffSettings.notificationEmail ?? '';
		notificationPhone = staffSettings.notificationPhone ?? '';
	});

	async function save() {
		if (saving) {
			return;
		}
		saving = true;
		const ok = await actionState.performSaveNotificationContact({
			notificationEmail: notificationEmail.trim() || null,
			notificationPhone: notificationPhone.trim() || null,
		}, {
			successMessage: $t('account.notifications.saved'),
		});
		saving = false;
		if (ok) {
			authSession.updateNotificationContact({
				notificationEmail: notificationEmail.trim() || null,
				notificationPhone: notificationPhone.trim() || null,
			});
			await returnToProfileModalIfRequested($page.url);
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<ListPageHeader title={$t('account.notifications.title')} />

	<div class="flex-1 overflow-y-auto p-6">
		<div class="mx-auto max-w-2xl space-y-6 rounded-xl border border-border bg-card p-5">
			<p class="text-sm text-muted-foreground">{$t('account.notifications.staffIntro')}</p>

			<section class="space-y-4">
				<h2 class="font-display text-lg font-semibold">{$t('account.notifications.contactDetails')}</h2>
				<div class="space-y-3">
					<div class="space-y-2">
						<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="staff-login-email">
							{$t('account.notifications.loginEmail')}
						</label>
						<Input id="staff-login-email" value={loginEmail || '—'} readonly />
					</div>
					<div class="space-y-2">
						<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="staff-notification-email">
							{$t('account.notifications.deliveryEmail')}
						</label>
						<Input
							id="staff-notification-email"
							type="email"
							bind:value={notificationEmail}
							placeholder={loginEmail || $t('account.notifications.deliveryEmailPlaceholder')}
						/>
					</div>
					<div class="space-y-2">
						<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="staff-notification-phone">
							{$t('account.notifications.deliveryPhone')}
						</label>
						<Input
							id="staff-notification-phone"
							type="tel"
							bind:value={notificationPhone}
							placeholder={$t('account.notifications.deliveryPhonePlaceholder')}
						/>
					</div>
				</div>
				<p class="text-xs text-muted-foreground">{$t('account.notifications.contactHint')}</p>
			</section>

			{#if !authSession.subjectId}
				<p class="text-sm text-amber-700">{$t('account.notifications.noSubject')}</p>
			{:else}
				<p class="text-sm text-muted-foreground">{$t('account.notifications.staffInApp')}</p>
			{/if}

			<div class="flex justify-end gap-3">
				<Button variant="outline" onclick={() => appGoto(appPath('/(app)/account/inbox/[[id]]'))}>
					{$t('account.inbox.open')}
				</Button>
				<Button onclick={save} disabled={saving || !authSession.subjectId}>
					{saving ? $t('account.notifications.saving') : $t('common.save')}
				</Button>
			</div>
		</div>
	</div>
</div>
