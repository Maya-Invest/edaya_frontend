<script lang="ts">
	import type { AccountActor } from '$lib/auth/account-actor';
	import { authSession } from '$lib/auth/session.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import AccountSettingsSection from '$lib/components/ui/AccountSettingsSection.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import SectionTabs from '$lib/components/ui/SectionTabs.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import { getAccountState } from '../account-state.svelte';

	const actionState = getAccountState();
	let { open = $bindable(false), actor, onLogout, section = 'profile', onSectionChange }: {
		open?: boolean;
		actor: AccountActor;
		onLogout: () => void | Promise<void>;
		section?: string;
		onSectionChange: (section: 'profile' | 'notifications' | 'security') => void;
	} = $props();
	const uid = $props.id();
	let panelAttempt = $state(0);
	const sections = ['profile', 'notifications', 'security'] as const;
	const activeSection = $derived(sections.find(item => item === section) ?? 'profile');
	const tabs = $derived(sections.map(value => ({ value, label: $t(`account.settings.tab.${value}`) })));
	const staffProfile = $derived(authSession.userProfile);
	const canChangePhoto = $derived(actor.kind === 'staff' && Boolean(staffProfile?.id) && canUploadProfilePhoto('STAFF_MANAGE'));
	const dirtyWork = getDirtyWork();
	function guarded(proceed: () => void) {
		if (dirtyWork)
			dirtyWork.request(proceed);
		else
			proceed();
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
	function selectSection(value: string) {
		const selected = sections.find(item => item === value);
		if (selected && selected !== activeSection)
			guarded(() => onSectionChange(selected));
	}
	async function handlePhotoChange(file: File) {
		if (!staffProfile?.id)
			return false;
		return actionState.performUpdateStaffProfilePhoto({ staffId: staffProfile.id, file, successMessage: get(t)('profilePhoto.updateSuccess') });
	}
	$effect(() => {
		const selected = activeSection;
		if (!open)
			return;
		void tick().then(() => {
			const panel = document.getElementById(`${uid}-panel-${selected}`);
			panel?.querySelector<HTMLElement>('[data-account-heading]')?.focus({ preventScroll: true });
			panel?.closest('[data-account-scroll]')?.scrollTo({ top: 0 });
		});
	});
</script>

<Dialog.Root {open} onOpenChange={(next) => {
	if (!next)
		close();
	else open = true;
}}>
	<Dialog.Content onOpenAutoFocus={(event) => {
		event.preventDefault();
		void tick().then(() => document.getElementById(`${uid}-panel-${activeSection}`)?.querySelector<HTMLElement>('[data-account-heading]')?.focus({ preventScroll: true }));
	}} data-testid="account-profile-dialog" class="ui-account-dialog flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 shadow-panel md:h-[min(40rem,80dvh)] md:max-h-[80dvh] md:w-[calc(100%-3rem)] md:max-w-[52rem]">
		<header class="flex shrink-0 items-center justify-between gap-4 border-b border-border p-4 md:px-6">
			<div class="min-w-0"><Dialog.Title class="font-display text-xl font-semibold">{$t('account.settings.title')}</Dialog.Title><Dialog.Description class="mt-1 text-sm text-muted-foreground">{$t('account.settings.description')}</Dialog.Description></div>
			<Button variant="ghost" size="icon" aria-label={$t('common.close')} onclick={close}><X class="h-4 w-4" /></Button>
		</header>
		<SectionTabs id={uid} label={$t('account.settings.title')} items={tabs} value={activeSection} onSelect={selectSection} />
		<div data-account-scroll class="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
			{#each sections as item (item)}
				<div id={`${uid}-panel-${item}`} role="tabpanel" aria-labelledby={`${uid}-tab-${item}`} hidden={activeSection !== item}>
					{#if activeSection === item}
						<AccountSettingsSection inset title={$t(`account.settings.tab.${item}`)} description={$t(`account.settings.description.${item}`)}>
							{#if item === 'notifications' || item === 'security'}
								{#key panelAttempt}
									{#await (item === 'notifications'
										? import('$lib/smart-components/account-notifications/NotificationSettings.svelte')
										: import('$lib/smart-components/account-security/SecuritySettings.svelte'))}
										<DataState compact status="loading" />
									{:then panel}
										<panel.default embedded onSignOut={handleLogout} />
									{:catch}
										<DataState compact status="error" onRetry={() => panelAttempt++} />
									{/await}
								{/key}
							{:else}
								<div class="flex flex-wrap items-center gap-4">
									{#if canChangePhoto}<ProfilePhotoPicker name={actor.name} initials={actor.initials} photoUrl={staffProfile?.photoUrl ?? actor.photoUrl ?? null} size="lg" onChange={handlePhotoChange} />
									{:else}<PersonAvatar name={actor.name} initials={actor.initials} photoUrl={actor.photoUrl} size="lg" />{/if}
									<div class="min-w-0"><p class="break-words font-display text-lg font-semibold">{staffProfile?.name || actor.name}</p>{#if canChangePhoto}<p class="mt-1 text-xs text-muted-foreground">{$t('account.settings.photoHint')}</p>{/if}</div>
								</div>
								<dl class="grid grid-cols-1 gap-6 sm:grid-cols-2">
									<div><dt class="text-xs text-muted-foreground">{$t('people.role')}</dt><dd class="mt-1 break-words text-sm">{$t(actor.subtitleKey)}</dd></div>
									{#if actor.kind === 'staff'}<div><dt class="text-xs text-muted-foreground">{$t('people.department')}</dt><dd class="mt-1 break-words text-sm">{staffProfile?.department || $t('value.notProvided')}</dd></div>{/if}
								</dl>
								<p class="border-t border-border pt-4 text-sm text-muted-foreground">{$t('account.settings.profileManaged')}</p>
							{/if}
						</AccountSettingsSection>
					{/if}
				</div>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
