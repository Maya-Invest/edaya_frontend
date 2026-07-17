<script lang="ts">
	import type { AccountActor } from '$lib/auth/account-actor';
	import { accountHrefWithReturn } from '$lib/account/profile-navigation';
	import { updateStaffProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import { authSession } from '$lib/auth/session.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { ChevronRight, Inbox, LogOut, Mail, Settings2 } from '$lib/icons';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		actor,
		onLogout,
	}: {
		open?: boolean;
		actor: AccountActor;
		onLogout: () => void;
	} = $props();

	const staffProfile = $derived(authSession.userProfile);
	const loginEmail = $derived(authSession.loginEmail?.trim() || '—');

	const workEmail = $derived.by(() => {
		const notification = authSession.notificationEmail?.trim() || '';
		if (notification) {
			return notification;
		}
		if (actor.kind === 'staff') {
			return staffProfile?.email?.trim() || '';
		}
		return '';
	});

	const showWorkEmail = $derived.by(() => {
		const normalizedLogin = loginEmail.toLowerCase();
		return workEmail.length > 0
			&& workEmail.toLowerCase() !== normalizedLogin
			&& loginEmail !== '—';
	});

	const canChangePhoto = $derived(
		actor.kind === 'staff' && Boolean(staffProfile?.id) && canUploadProfilePhoto('STAFF_UPDATE'),
	);

	const staffPhotoUrl = $derived(staffProfile?.photoUrl ?? actor.photoUrl ?? null);

	async function handlePhotoChange(file: File) {
		if (!staffProfile?.id) {
			return false;
		}
		return updateStaffProfilePhotoMutation({
			staffId: staffProfile.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	const readOnlyFieldClass = 'min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm';
	const loginEmailFieldClass = cn(
		readOnlyFieldClass,
		'bg-secondary/30 text-muted-foreground',
	);

	function handleLogout() {
		open = false;
		onLogout();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md gap-0 overflow-hidden rounded-2xl p-0 shadow-panel">
		<div class="border-b border-border bg-secondary/30 px-6 py-5">
			<div class="flex items-center gap-4">
				{#if canChangePhoto}
					<ProfilePhotoPicker
						name={actor.name}
						initials={actor.initials}
						photoUrl={staffPhotoUrl}
						size="lg"
						onChange={handlePhotoChange}
					/>
				{:else}
					<PersonAvatar
						name={actor.name}
						initials={actor.initials}
						photoUrl={actor.photoUrl}
						size="lg"
					/>
				{/if}
				<div class="min-w-0">
					<Dialog.Title class="font-display text-xl font-semibold leading-tight">
						{actor.name}
					</Dialog.Title>
					<Dialog.Description class="mt-1 text-sm text-muted-foreground">
						{$t(actor.subtitleKey)}
					</Dialog.Description>
				</div>
			</div>
		</div>

		<div class="space-y-6 px-6 py-5">
			<section class="space-y-4">
				<h3 class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{$t('account.profile.sectionProfile')}
				</h3>

				{#if actor.kind === 'staff' && staffProfile}
					<DrawerField label={$t('guardian.fullName')}>
						<div class={readOnlyFieldClass}>{staffProfile.name}</div>
					</DrawerField>
					<DrawerField label={$t('people.role')}>
						<div class={readOnlyFieldClass}>{$t(`staff.role.${staffProfile.role}`)}</div>
					</DrawerField>
					<DrawerField label={$t('people.department')}>
						<div class={readOnlyFieldClass}>{staffProfile.department || '—'}</div>
					</DrawerField>
				{/if}

				<DrawerField label={$t('account.notifications.loginEmail')}>
					<div class={loginEmailFieldClass}>
						<span class="flex items-center gap-2">
							<Mail class="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
							{loginEmail}
						</span>
					</div>
				</DrawerField>

				{#if showWorkEmail}
					<DrawerField label={$t('account.profile.workEmail')}>
						<div class={readOnlyFieldClass}>
							<span class="flex items-center gap-2">
								<Mail class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								{workEmail}
							</span>
						</div>
					</DrawerField>
				{/if}
			</section>

			<section class="space-y-2">
				<h3 class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{$t('account.profile.sectionShortcuts')}
				</h3>
				<a
					href={accountHrefWithReturn(detailHref.accountInbox())}
					class="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary"
					onclick={() => (open = false)}
				>
					<span class="flex items-center gap-2">
						<Inbox class="h-4 w-4 text-muted-foreground" />
						{$t('account.inbox.title')}
					</span>
					<ChevronRight class="h-4 w-4 text-muted-foreground" />
				</a>
				<a
					href={accountHrefWithReturn(detailHref.accountNotifications())}
					class="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary"
					onclick={() => (open = false)}
				>
					<span class="flex items-center gap-2">
						<Settings2 class="h-4 w-4 text-muted-foreground" />
						{$t('account.notifications.title')}
					</span>
					<ChevronRight class="h-4 w-4 text-muted-foreground" />
				</a>
			</section>
		</div>

		<Dialog.Footer class="border-t border-border bg-secondary/20 px-6 py-4 sm:justify-between">
			<Button variant="ghost" class="rounded-full" onclick={() => (open = false)}>
				{$t('common.close')}
			</Button>
			<Button variant="outline" class="rounded-full" onclick={handleLogout}>
				<LogOut class="mr-2 h-4 w-4" />
				{$t('auth.signOut')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
