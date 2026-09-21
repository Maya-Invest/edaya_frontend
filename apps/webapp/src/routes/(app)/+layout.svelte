<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ACCOUNT_PROFILE_MODAL } from '$lib/account/profile-navigation';
	import { bootstrapAppShell, invalidateAppShellBootstrapCache, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { leaveStaffWebappForSessionKind } from '$lib/auth/leave-staff-webapp';
	import { ONBOARDING_PATH } from '$lib/auth/resolve-post-auth-paths';
	import { authSession } from '$lib/auth/session.svelte';
	import AccountProfileModal from '$lib/components/account/AccountProfileModal.svelte';
	import AcademicHeader from '$lib/components/layout/AcademicHeader.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { Dialog, DialogContent, DialogTitle, Close as DialogClose } from '$lib/components/ui/dialog';
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
	import { MediaQuery } from 'svelte/reactivity';

	const { children }: { children: Snippet } = $props();
	const desktop = new MediaQuery('(min-width: 1024px)');
	let mobileSidebarOpen = $state(false);
	const navigationOpen = $derived(desktop.current ? shellContext.sidebarOpen : mobileSidebarOpen);
	afterNavigate(() => {
		mobileSidebarOpen = false;
	});
	$effect(() => {
		if (desktop.current)
			mobileSidebarOpen = false;
	});

	const me = $derived(authSession.accountActor);
	const pathAllowed = $derived(
		authSession.ready && authSession.isLoggedIn
			? canAccessPath($page.url.pathname, authSession.grants, { schoolId: authSession.schoolId ?? '' })
			: true,
	);
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
			void appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		if (authSession.needsOnboarding) {
			void appGoto(ONBOARDING_PATH, { replaceState: true });
			return;
		}

		if (!authSession.isLoggedIn) {
			void appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		if (authSession.sessionKind && authSession.sessionKind !== 'staff') {
			void leaveStaffWebappForSessionKind(authSession.sessionKind);
			return;
		}

		if (authSession.onboardingStatusUnknown) {
			return;
		}

		if (authSession.sessionKind !== 'staff') {
			return;
		}

		const resumePath = onboardingResumePath(
			authSession.authUserId,
			authSession.schoolId,
			authSession.serverOnboardingStatus,
		);
		if (resumePath) {
			appGoto(resumePath, { replaceState: true });
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

	async function logout() {
		resetAppShellBootstrap();
		await authSession.logout();
		await appGoto(appPath('/login'), { replaceState: true });
	}
</script>

{#if authSession.ready && authSession.isLoggedIn && me}
	<div class="flex h-dvh w-full overflow-hidden bg-background text-foreground">
		{#if desktop.current}
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
					teacherCount={academicContext.teacherCount}
				/>
			</div>
		{:else}
			<Dialog bind:open={mobileSidebarOpen}>
				<DialogContent class="left-0 top-0 flex h-dvh max-h-none w-[min(85vw,320px)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0">
					<div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
						<DialogTitle class="text-base">{$t('sidebar.navigationTitle')}</DialogTitle>
						<DialogClose class="control-focus flex h-11 w-11 items-center justify-center rounded-xl hover:bg-secondary" aria-label={$t('sidebar.hide')}><PanelLeftClose class="h-5 w-5" /></DialogClose>
					</div>
					<div class="min-h-0 flex-1">
						<AppSidebar forceExpanded hierarchy={academicContext.hierarchy} studentCount={academicContext.studentCount} guardianCount={academicContext.guardianCount} staffCount={academicContext.staffCount} teacherCount={academicContext.teacherCount} />
					</div>
				</DialogContent>
			</Dialog>
		{/if}

		<div class="flex min-w-0 flex-1 flex-col">
			<div
				class="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 lg:h-14 lg:flex-nowrap lg:gap-3 lg:px-6 lg:py-0"
			>
				<button
					type="button"
					onclick={() => desktop.current ? shellContext.toggleSidebar() : mobileSidebarOpen = !mobileSidebarOpen}
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-9 lg:w-9"
					aria-label={navigationOpen ? $t('sidebar.hide') : $t('sidebar.show')}
					aria-expanded={navigationOpen}
					aria-controls="app-sidebar"
				>
					{#if navigationOpen}
						<PanelLeftClose class="h-4 w-4" />
					{:else}
						<PanelLeft class="h-4 w-4" />
					{/if}
				</button>

				<div class="contents lg:flex lg:items-center lg:gap-3">
					{#if academicContext.shellReady}
						<div class="order-last flex w-full justify-end lg:order-none lg:w-auto"><AcademicHeader /></div>
					{:else}
						<LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
					{/if}
					<LanguageSelector />
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							data-testid="user-menu"
							onclick={() => (profileOpen.open = true)}
							class="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-1 text-xs font-medium text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3 lg:h-9"
							title={`${me.name} · ${$t(me.subtitleKey)}`}
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
							<span class="hidden flex-col items-start leading-tight sm:flex">
								<span class="text-[11px] font-semibold">{me.name}</span>
								<span class="font-sans tabular-nums text-[9px] uppercase tracking-wider text-muted-foreground">
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
				<DataState status="empty" />
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
