<script lang="ts">
	import type { NotificationSettingsPageData } from '$lib/queries/account.queries';
	import { page } from '$app/stores';
	import { returnToProfileModalIfRequested } from '$lib/account/profile-navigation';
	import { saveGuardianNotificationPreferencesMutation } from '$lib/api/mutations/notifications.mutations';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';

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
	let hydratedId = $state<string | null>(null);

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
	});

	async function save() {
		if (!settings || saving) {
			return;
		}
		saving = true;
		const ok = await saveGuardianNotificationPreferencesMutation({
			guardianId: settings.id,
			emailNotificationsEnabled,
			smsNotificationsEnabled,
			notificationEmail: notificationEmail.trim() || null,
			notificationPhone: notificationPhone.trim() || null,
			links: linkRows,
		}, {
			current: settings,
			successMessage: $t('account.notifications.saved'),
		});
		saving = false;
		if (ok) {
			authSession.updateNotificationContact({
				notificationEmail: notificationEmail.trim() || null,
				notificationPhone: notificationPhone.trim() || null,
			});
			onSaved?.();
			await returnToProfileModalIfRequested($page.url);
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<ListPageHeader title={$t('account.notifications.title')} />

	<div class="flex-1 overflow-y-auto p-6">
		{#if !settings}
			<p class="text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>
		{:else if !settings.subjectId}
			<p class="text-sm text-muted-foreground">{$t('account.notifications.noSubject')}</p>
		{:else}
			<div class="mx-auto max-w-2xl space-y-8">
				<section class="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 class="font-display text-lg font-semibold">{$t('account.notifications.contactDetails')}</h2>
					<div class="space-y-3">
						<div class="space-y-2">
							<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="guardian-login-email">
								{$t('account.notifications.loginEmail')}
							</label>
							<Input id="guardian-login-email" value={loginEmail || '—'} readonly />
						</div>
						<div class="space-y-2">
							<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="guardian-notification-email">
								{$t('account.notifications.deliveryEmail')}
							</label>
							<Input
								id="guardian-notification-email"
								type="email"
								bind:value={notificationEmail}
								placeholder={loginEmail || $t('account.notifications.deliveryEmailPlaceholder')}
							/>
						</div>
						<div class="space-y-2">
							<label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" for="guardian-notification-phone">
								{$t('account.notifications.deliveryPhone')}
							</label>
							<Input
								id="guardian-notification-phone"
								type="tel"
								bind:value={notificationPhone}
								placeholder={$t('account.notifications.deliveryPhonePlaceholder')}
							/>
						</div>
					</div>
					<p class="text-xs text-muted-foreground">{$t('account.notifications.contactHint')}</p>
				</section>

				<section class="space-y-4 rounded-xl border border-border bg-card p-5">
					<h2 class="font-display text-lg font-semibold">{$t('account.notifications.channels')}</h2>
					<div class="space-y-3">
						<label class="flex items-center gap-3 text-sm">
							<Checkbox bind:checked={emailNotificationsEnabled} />
							<span>{$t('account.notifications.email')}</span>
						</label>
						<label class="flex items-center gap-3 text-sm">
							<Checkbox bind:checked={smsNotificationsEnabled} />
							<span>{$t('account.notifications.sms')}</span>
						</label>
					</div>
				</section>

				{#if linkRows.length > 0}
					<section class="space-y-4 rounded-xl border border-border bg-card p-5">
						<h2 class="font-display text-lg font-semibold">{$t('account.notifications.perStudent')}</h2>
						<div class="space-y-5">
							{#each linkRows as link, index (link.studentId)}
								<div class="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
									<p class="text-sm font-medium">
										{data.studentNames[link.studentId] ?? link.studentId}
									</p>
									<label class="flex items-center gap-3 text-sm">
										<Checkbox bind:checked={linkRows[index].receivesAcademicReports} />
										<span>{$t('account.notifications.academicReports')}</span>
									</label>
									<label class="flex items-center gap-3 text-sm">
										<Checkbox bind:checked={linkRows[index].receivesAttendanceAlerts} />
										<span>{$t('account.notifications.attendanceAlerts')}</span>
									</label>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<div class="flex justify-end">
					<Button onclick={save} disabled={saving}>
						{saving ? $t('account.notifications.saving') : $t('common.save')}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
