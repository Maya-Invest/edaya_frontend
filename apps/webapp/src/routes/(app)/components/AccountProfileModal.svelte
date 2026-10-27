<script lang="ts">
	import type { AccountActor } from '$lib/auth/account-actor';

	import { authSession } from '$lib/auth/session.svelte';

	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from '$lib/i18n';
	import { LogOut, Mail, X } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import NotificationSettings from '$lib/smart-components/account-notifications/NotificationSettings.svelte';
	import SecuritySettings from '$lib/smart-components/account-security/SecuritySettings.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAccountState } from '../account-state.svelte';

	const actionState = getAccountState();

	let {
		open = $bindable(false),
		actor,
		onLogout,
		section = 'profile',
		onSectionChange,
	}: {
		open?: boolean;
		actor: AccountActor;
		section?: string;
		onSectionChange: (section: 'profile' | 'notifications' | 'security') => void;
		onLogout: () => void | Promise<void>;
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
		actor.kind === 'staff' && Boolean(staffProfile?.id) && canUploadProfilePhoto('STAFF_MANAGE'),
	);

	const staffPhotoUrl = $derived(staffProfile?.photoUrl ?? actor.photoUrl ?? null);

	async function handlePhotoChange(file: File) {
		if (!staffProfile?.id) {
			return false;
		}
		return actionState.performUpdateStaffProfilePhoto({
			staffId: staffProfile.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	const readOnlyFieldClass = 'break-words text-sm';
	const loginEmailFieldClass = cn(
		readOnlyFieldClass,
		'bg-secondary/30 text-muted-foreground',
	);

	const dirtyWork = getDirtyWork();
	function guarded(proceed: () => void) {
		if (dirtyWork)
			dirtyWork.request(proceed);
		else proceed();
	}
	function close() {
		guarded(() => {
			open = false;
		});
	}
	function handleLogout() {
		guarded(() => {
			open = false;
			void onLogout();
		});
	}
	const sections = ['profile', 'notifications', 'security'] as const;
	const sectionKeys = { profile: 'account.profile.sectionProfile', notifications: 'account.notifications.title', security: 'auth.accountSecurity' };

</script>

<Dialog.Root {open} onOpenChange={(next) => {
	if (!next)
		close();
	else open = true;
}}>
	<Dialog.Content class="ui-account-dialog flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 shadow-panel lg:h-[min(48rem,calc(100dvh-2rem))] lg:max-h-[calc(100dvh-2rem)] lg:w-[calc(100%-3rem)] lg:max-w-5xl lg:rounded-collection">
		<div class="shrink-0 border-b border-border bg-secondary/30 px-6 py-5">
			<div class="flex items-center gap-4">
				<Button class="ml-auto order-last shrink-0" variant="ghost" size="icon" aria-label={$t('common.close')} onclick={close}><X /></Button>
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

		<div class="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
			<nav aria-label={$t('account.profile.sectionProfile')} class="flex shrink-0 flex-wrap gap-2 border-b border-border p-4 lg:w-56 lg:flex-col lg:justify-start lg:border-b-0 lg:border-l">
				{#each sections as item (item)}
					<button type="button" aria-current={section === item ? 'page' : undefined} class={cn('ui-nav-target', section === item && 'bg-sky-soft text-primary')} onclick={() => {
						if (item !== section)
							guarded(() => onSectionChange(item));
					}}>{$t(sectionKeys[item])}</button>
				{/each}
			</nav>
			<div class="min-h-0 min-w-0 flex-1 overflow-y-auto">
				{#if section === 'notifications'}<NotificationSettings />
				{:else if section === 'security'}<SecuritySettings />
				{:else}

					<div class="mx-auto w-full max-w-lg space-y-6 p-4 md:p-6">
						<section class="space-y-4">
							<h3 class="font-sans text-xs uppercase tracking-widest text-muted-foreground">
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

					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="shrink-0 border-t border-border bg-secondary/20 px-6 py-4 sm:justify-between">

			<Button variant="outline" onclick={handleLogout}>
				<LogOut class="mr-2 h-4 w-4" />
				{$t('auth.signOut')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
