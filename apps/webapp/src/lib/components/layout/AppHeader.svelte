<script lang="ts">
	import type { AccountActor } from '$lib/auth/account-actor';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import SchoolSelector from '$lib/components/layout/SchoolSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { PanelLeft, PanelLeftClose } from '$lib/icons';

	const { actor, navigationOpen, profileOpen, onToggleNavigation, onOpenProfile }: {
		actor: AccountActor;
		navigationOpen: boolean;
		profileOpen: boolean;
		onToggleNavigation: () => void;
		onOpenProfile: () => void;
	} = $props();
</script>

<header class="ui-app-header" data-testid="app-header">
	<Button variant="ghost" size="icon" class="ui-app-header-navigation" data-testid="navigation-toggle" onclick={onToggleNavigation} aria-label={navigationOpen ? $t('sidebar.hide') : $t('sidebar.show')} aria-expanded={navigationOpen} aria-controls="app-sidebar">
		{#if navigationOpen}<PanelLeftClose class="h-4 w-4" />{:else}<PanelLeft class="h-4 w-4" />{/if}
	</Button>
	<div class="ui-app-header-school" data-testid="header-school"><SchoolSelector /></div>
	<div class="ui-app-header-actions" data-testid="header-actions">
		<LanguageSelector />
		<button type="button" data-testid="user-menu" onclick={onOpenProfile} class="ui-app-header-profile control-focus" title={`${actor.name} · ${$t(actor.subtitleKey)}`} aria-label={$t('account.profile.openProfile')} aria-haspopup="dialog" aria-expanded={profileOpen}>
			<PersonAvatar name={actor.name} initials={actor.initials} photoUrl={actor.photoUrl} size="md" />
			<span class="ui-app-header-profile-label"><span class="text-xs font-semibold">{actor.name}</span><span class="text-xs text-muted-foreground">{$t(actor.subtitleKey)}</span></span>
		</button>
	</div>
</header>
