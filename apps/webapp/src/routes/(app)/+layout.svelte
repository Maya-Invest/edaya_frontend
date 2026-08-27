<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ACCOUNT_PROFILE_MODAL } from '$lib/account/profile-navigation';
	import { bootstrapAppShell, invalidateAppShellBootstrapCache, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { authSession } from '$lib/auth/session.svelte';
	import AccountProfileModal from '$lib/components/account/AccountProfileModal.svelte';
	import AcademicHeader from '$lib/components/layout/AcademicHeader.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import SchoolSelector from '$lib/components/layout/SchoolSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, PanelLeft, PanelLeftClose } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import {
		MODAL_QUERY_KEY,
		MODAL_STEP_QUERY_KEY,
		MODAL_TAB_QUERY_KEY,
		MODAL_TARGET_QUERY_KEY,
	} from '$lib/modal/modal-url';
	import { isKnownModalForPathname } from '$lib/modal/route-modal-catalog';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { canAccessPath } from '$lib/navigation/nav-permissions';
	import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';
	import { shellContext } from '$lib/shell/context.svelte';
	import { cn } from '$lib/utils';

	const { children }: { children: Snippet } = $props();

	const me = $derived(authSession.accountActor);
	const pathAllowed = $derived(
		authSession.ready && authSession.isLoggedIn
			? canAccessPath($page.url.pathname, authSession.grants, { schoolId: authSession.schoolId ?? '' })
			: true,
	);

	type ToastHostComponent = import('svelte').Component;

	let ToastHost = $state<ToastHostComponent | null>(null);
	const modalQueryKeys = [
		MODAL_QUERY_KEY,
		MODAL_TARGET_QUERY_KEY,
		MODAL_STEP_QUERY_KEY,
		MODAL_TAB_QUERY_KEY,
	] as const;

	$effect.pre(() => {
		if (!browser) {
			return;
		}
		const url = $page.url;
		const rawModalName = url.searchParams.get(MODAL_QUERY_KEY);
		if (isKnownModalForPathname(url.pathname, rawModalName)) {
			return;
		}
		if (!modalQueryKeys.some(key => url.searchParams.has(key))) {
			return;
		}
		const canonicalUrl = new URL(url);
		for (const key of modalQueryKeys) {
			canonicalUrl.searchParams.delete(key);
		}
		// The URL is derived from the current resolved route and only removes search parameters.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(canonicalUrl, $page.state);
	});

	const accountModals = createUrlSyncedModals({
		allowed: [ACCOUNT_PROFILE_MODAL],
		getUrl: () => $page.url,
	});
	$effect(() => {
		accountModals.hydrate();
	});
	const profileOpen = bindUrlModal(accountModals, ACCOUNT_PROFILE_MODAL);

	$effect(() => {
		if (!authSession.ready) {
			return;
		}

		if (shouldEnforceLoginGate()) {
			appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		if (authSession.needsOnboarding) {
			appGoto(appPath('/onboarding'), { replaceState: true });
			return;
		}

		const resumePath = onboardingResumePath(
			authSession.authUserId,
			authSession.schoolId,
			authSession.serverOnboardingStatus,
		);
		if (resumePath) {
			appGoto(resumePath, { replaceState: true });
			return;
		}

		if (!authSession.isLoggedIn) {
			appGoto(appPath('/login'), { replaceState: true });
		}
	});

	$effect(() => {
		if (!browser || !authSession.ready || !authSession.isLoggedIn) {
			return;
		}
		if (!authSession.sessionKind) {
			return;
		}
		const shellIdentity = `${authSession.sessionKind}:${authSession.schoolId ?? ''}:${authSession.userId ?? ''}`;
		void shellIdentity;
		void (async () => {
			await bootstrapAppShell();
			if (authSession.schoolId && academicContext.schools.length === 0) {
				invalidateAppShellBootstrapCache();
				await bootstrapAppShell();
			}
		})();
	});

	$effect(() => {
		if (!browser || ToastHost) {
			return;
		}
		void import('$lib/components/ui/ToastHost.svelte').then((module) => {
			ToastHost = module.default;
		});
	});

	function logout() {
		resetAppShellBootstrap();
		authSession.logout();
		appGoto(appPath('/login'), { replaceState: true });
	}
</script>

{#if authSession.ready && authSession.isLoggedIn && me}
	<div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
		<div
			class={cn(
				'relative h-full shrink-0 transition-[width] duration-200 ease-in-out',
				shellContext.sidebarOpen ? 'w-64' : 'w-14',
			)}
		>
			<AppSidebar
				hierarchy={academicContext.hierarchy}
				studentCount={academicContext.studentCount}
				guardianCount={academicContext.guardianCount}
				staffCount={academicContext.staffCount}
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col">
			<div
				class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6"
			>
				<button
					type="button"
					onclick={() => shellContext.toggleSidebar()}
					class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={shellContext.sidebarOpen ? $t('sidebar.hide') : $t('sidebar.show')}
					aria-expanded={shellContext.sidebarOpen}
					aria-controls="app-sidebar"
				>
					{#if shellContext.sidebarOpen}
						<PanelLeftClose class="h-4 w-4" />
					{:else}
						<PanelLeft class="h-4 w-4" />
					{/if}
				</button>

				<div class="flex items-center gap-3">
					{#if academicContext.shellReady}
						<SchoolSelector schools={academicContext.schools} />
						<AcademicHeader />
					{:else}
						<LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
					{/if}
					<LanguageSelector />
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							data-testid="user-menu"
							onclick={() => (profileOpen.open = true)}
							class="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={$t('account.profile.openProfile')}
							aria-haspopup="dialog"
							aria-expanded={profileOpen.open}
						>
							<PersonAvatar
								name={me.name}
								initials={me.initials}
								photoUrl={me.photoUrl}
								size="md"
							/>
							<span class="flex flex-col items-start leading-tight">
								<span class="text-[11px] font-semibold">{me.name}</span>
								<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
									{$t(me.subtitleKey)}
								</span>
							</span>
						</button>
					</div>
				</div>
			</div>

			{#if pathAllowed}
				{@render children()}
			{:else}
				<DataState status="empty">
					{#snippet children()}{/snippet}
				</DataState>
			{/if}
		</div>
	</div>

	<AccountProfileModal bind:open={profileOpen.open} actor={me} onLogout={logout} />
{:else}
	<div
		class="flex h-screen w-full items-center justify-center bg-background text-foreground"
		data-testid="app-shell-pending"
	>
		<LoaderCircle class="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
		<span class="sr-only">{$t('dataState.loading')}</span>
	</div>
{/if}

{#if ToastHost}
	<ToastHost />
{/if}
