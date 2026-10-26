<script lang="ts">
	import type { NotificationSettingsPageSlice as NotificationSettingsPageData } from '../lib/notification-settings-helpers';

	import { page } from '$app/stores';
	import { returnToProfileModalIfRequested } from '$lib/account/profile-navigation';
	import { authSession } from '$lib/auth/session.svelte';

	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { onDestroy } from 'svelte';
	import { getNotificationSettingsPageState } from '../notification-settings-page.svelte';

	const actionState = getNotificationSettingsPageState();

	const {
		data,
		onSaved,
	}: {
		data: NotificationSettingsPageData;
		onSaved?: () => void;
	} = $props();

	const settings = $derived(data.settings);
	const loginEmail = $derived(data.loginEmail ?? '');

	let emailNotificationsEnabled = $state(false);
	let smsNotificationsEnabled = $state(false);
	let notificationEmail = $state('');
	let notificationPhone = $state('');
	let linkRows = $state<Array<{
		studentId: string;
		receivesAcademicReports: boolean;
		receivesAttendanceAlerts: boolean;
	}>>([]);
	let saving = $state(false);
	let mounted = true;
	onDestroy(() => {
		mounted = false;
	});
	function identity() {
		return JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId]);
	}
	let baseline = $state('');
	let hydratedId = $state<string | null>(null);

	function draft() {
		return JSON.stringify([notificationEmail, notificationPhone, emailNotificationsEnabled, smsNotificationsEnabled, linkRows]);
	}
	const unregister = getDirtyWork()?.register({
		isDirty: () => !!hydratedId && draft() !== baseline,
		discard: () => { baseline = draft(); },
	});
	onDestroy(() => unregister?.());
	function cancel() {
		hydratedId = null;
	}

	$effect(() => {
		if (!settings || settings.id === hydratedId) {
			return;
		}
		hydratedId = settings.id;
		notificationEmail = settings.notificationEmail ?? '';
		notificationPhone = settings.notificationPhone ?? '';
		emailNotificationsEnabled = settings.contactMethods.some(
			method => method.type === 'email' && method.allowsNotifications,
		);
		smsNotificationsEnabled = settings.contactMethods.some(
			method => (method.type === 'phone' || method.type === 'sms' || method.type === 'whatsapp')
				&& method.allowsNotifications,
		);
		linkRows = settings.links.map(link => ({
			studentId: link.studentId,
			receivesAcademicReports: link.receivesAcademicReports,
			receivesAttendanceAlerts: link.receivesAttendanceAlerts,
		}));
		baseline = draft();
	});

	async function save() {
		if (!settings || saving)
			return;
		const submittedIdentity = identity();
		const submittedDraft = draft();
		const origin = new URL($page.url);
		const submitted = {
			guardianId: settings.id,
			emailNotificationsEnabled,
			smsNotificationsEnabled,
			notificationEmail: notificationEmail.trim() || null,
			notificationPhone: notificationPhone.trim() || null,
			links: linkRows.map(link => ({ ...link })),
		};
		saving = true;
		try {
			const ok = await actionState.performSaveGuardianNotificationPreferences(submitted, { current: settings, successMessage: $t('account.notifications.saved') });
			if (ok && mounted && identity() === submittedIdentity) {
				baseline = submittedDraft;
				authSession.updateNotificationContact({
					notificationEmail: submitted.notificationEmail,
					notificationPhone: submitted.notificationPhone,
				});
				onSaved?.();
				await returnToProfileModalIfRequested(origin);
			}
		}
		finally { saving = false; }
	}

</script>

<div class="flex h-full flex-col overflow-hidden">
	<ListPageHeader level="section" title={$t('account.notifications.title')} />

	<div class="flex-1 overflow-y-auto p-6">
		{#if !settings}
			<p class="text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>
		{:else if !settings.subjectId}
			<p class="text-sm text-muted-foreground">{$t('account.notifications.noSubject')}</p>
		{:else}
			<div class="mx-auto max-w-lg space-y-8">
				<section class="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 class="font-display text-xl font-semibold">{$t('account.notifications.contactDetails')}</h2>
					<div class="space-y-3">
						<div class="space-y-2">
							<label class="text-xs font-medium uppercase tracking-wider text-muted-foreground" for="guardian-login-email">
								{$t('account.notifications.loginEmail')}
							</label>
							<Input id="guardian-login-email" value={loginEmail || '—'} readonly />
						</div>
						<div class="space-y-2">
							<label class="text-xs font-medium uppercase tracking-wider text-muted-foreground" for="guardian-notification-email">
								{$t('account.notifications.deliveryEmail')}
							</label>
							<Input
								id="guardian-notification-email"
								type="email"
								disabled={saving}
								bind:value={notificationEmail}
								placeholder={loginEmail || $t('account.notifications.deliveryEmailPlaceholder')}
							/>
						</div>
						<div class="space-y-2">
							<label class="text-xs font-medium uppercase tracking-wider text-muted-foreground" for="guardian-notification-phone">
								{$t('account.notifications.deliveryPhone')}
							</label>
							<Input
								id="guardian-notification-phone"
								type="tel"
								disabled={saving}
								bind:value={notificationPhone}
								placeholder={$t('account.notifications.deliveryPhonePlaceholder')}
							/>
						</div>
					</div>
					<p class="text-xs text-muted-foreground">{$t('account.notifications.contactHint')}</p>
				</section>

				<section class="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 class="font-display text-xl font-semibold">{$t('account.notifications.channels')}</h2>
					<div class="space-y-3">
						<label class="flex items-center gap-3 text-sm">
							<Checkbox disabled={saving} bind:checked={emailNotificationsEnabled} />
							<span>{$t('account.notifications.email')}</span>
						</label>
						<label class="flex items-center gap-3 text-sm">
							<Checkbox disabled={saving} bind:checked={smsNotificationsEnabled} />
							<span>{$t('account.notifications.sms')}</span>
						</label>
					</div>
				</section>

				{#if linkRows.length > 0}
					<section class="space-y-4 rounded-xl border border-border bg-card p-5">
						<h2 class="font-display text-xl font-semibold">{$t('account.notifications.perStudent')}</h2>
						<div class="space-y-5">
							{#each linkRows as link, index (link.studentId)}
								<div class="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
									<p class="text-sm font-medium">
										{data.studentNames[link.studentId] ?? link.studentId}
									</p>
									<label class="flex items-center gap-3 text-sm">
										<Checkbox disabled={saving} bind:checked={linkRows[index].receivesAcademicReports} />
										<span>{$t('account.notifications.academicReports')}</span>
									</label>
									<label class="flex items-center gap-3 text-sm">
										<Checkbox disabled={saving} bind:checked={linkRows[index].receivesAttendanceAlerts} />
										<span>{$t('account.notifications.attendanceAlerts')}</span>
									</label>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<div class="flex justify-end">
					<Button variant="outline" disabled={saving} onclick={cancel}>{$t('common.cancel')}</Button>
					<Button onclick={save} disabled={saving}>
						{saving ? $t('account.notifications.saving') : $t('common.save')}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
