<script lang="ts">
	import type { NotificationSettingsPageSlice as NotificationSettingsPageData } from '../lib/notification-settings-helpers';
	import { page } from '$app/stores';
	import { returnToProfileModalIfRequested } from '$lib/account/profile-navigation';
	import { authSession } from '$lib/auth/session.svelte';
	import GuardianContactFields from '$lib/components/school/shared/GuardianContactFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { guardianContactDraft, guardianContactPayload } from '$lib/guardians/contact-fields';
	import { t } from '$lib/i18n';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { onDestroy } from 'svelte';
	import { getNotificationSettingsPageState } from '../notification-settings-page.svelte';

	const actionState = getNotificationSettingsPageState();
	const { data, onSaved }: {
		data: NotificationSettingsPageData;
		onSaved?: () => void;
	} = $props();
	const settings = $derived(data.settings);
	let contacts = $state(guardianContactDraft());
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
		return JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.subjectId, authSession.userId]);
	}
	let baseline = $state('');
	let hydratedId = $state<string | null>(null);
	const dirty = $derived(Boolean(hydratedId) && draft() !== baseline);
	function draft() {
		return JSON.stringify([contacts, linkRows]);
	}
	const unregister = getDirtyWork()?.register({
		isDirty: () => !!hydratedId && draft() !== baseline,
		discard: cancel,
	});
	onDestroy(() => unregister?.());
	function cancel() {
		if (!baseline)
			return;
		[contacts, linkRows] = JSON.parse(baseline) as [
			ReturnType<typeof guardianContactDraft>,
			typeof linkRows,
		];
	}
	$effect(() => {
		if (!settings || `${identity()}:${settings.id}` === hydratedId) {
			return;
		}
		hydratedId = `${identity()}:${settings.id}`;
		contacts = guardianContactDraft(settings);
		linkRows = settings.links.map(link => ({
			studentId: link.studentId,
			receivesAcademicReports: link.receivesAcademicReports,
			receivesAttendanceAlerts: link.receivesAttendanceAlerts,
		}));
		baseline = draft();
	});
	async function save() {
		if (!settings || saving || !dirty)
			return;
		const submittedIdentity = identity();
		const submittedDraft = draft();
		const origin = new URL($page.url);
		const submitted = {
			guardianId: settings.id,
			...guardianContactPayload(contacts),
			links: linkRows.map(link => ({ ...link })),
		};
		saving = true;
		try {
			const ok = await actionState.performSaveGuardianNotificationPreferences(submitted, { current: settings, successMessage: $t('account.notifications.saved') });
			if (ok && mounted && identity() === submittedIdentity) {
				baseline = submittedDraft;
				if (authSession.guardianSettings?.id === settings.id)
					authSession.guardianSettings = { ...authSession.guardianSettings, ...guardianContactPayload(contacts), links: authSession.guardianSettings.links.map(link => ({ ...link, ...linkRows.find(row => row.studentId === link.studentId) })) };
				onSaved?.();
				await returnToProfileModalIfRequested(origin);
			}
		}
		finally {
			saving = false;
		}
	}
</script>

<form class="max-w-lg space-y-6" onsubmit={(event) => {
	event.preventDefault();
	void save();
}}>
	{#if !settings}
		<p class="text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>
	{:else if !settings.subjectId}
		<p class="text-sm text-muted-foreground">{$t('account.notifications.noSubject')}</p>
	{:else}
		<div class="space-y-6">
			<section class="space-y-4">
				<GuardianContactFields bind:contacts disabled={saving} />
			</section>

			{#if linkRows.length > 0}
				<section class="space-y-4 border-t border-border pt-6">
					<h3 class="text-sm font-semibold">{$t('account.notifications.perStudent')}</h3>
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

			{#if dirty}<div data-testid="notification-save-actions" class="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-card py-4">
				<Button variant="outline" disabled={saving} onclick={cancel}>{$t('form.discard')}</Button>
				<Button type="submit" disabled={saving}>
					{saving ? $t('account.notifications.saving') : $t('common.save')}
				</Button>
			</div>{/if}
		</div>
	{/if}
</form>
