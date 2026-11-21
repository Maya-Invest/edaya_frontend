<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ACCOUNT_PROFILE_MODAL } from '$lib/account/profile-navigation';
	import { bootstrapAppShell } from '$lib/auth/bootstrap-app';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { leaveStaffWebappForSessionKind } from '$lib/auth/leave-staff-webapp';
	import { ONBOARDING_PATH } from '$lib/auth/resolve-post-auth-paths';
	import { authSession } from '$lib/auth/session.svelte';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import AppLoading from '$lib/components/layout/AppLoading.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import MobileSidebar from '$lib/components/layout/MobileSidebar.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { entityVersions } from '$lib/entity-versions.svelte';
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
	import { MessageCountState, provideMessageCount } from '$lib/shell/message-count.svelte';
	import { cn } from '$lib/utils';
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { AccountState, setAccountState } from './account-state.svelte';
	import AccountProfileModal from './components/AccountProfileModal.svelte';

	const messageCount = new MessageCountState();
	provideMessageCount(messageCount);
	$effect(() => {
		const scope = messageCount.scope;
		void entityVersions.inbox;
		if (scope && academicContext.shellReady)
			return untrack(() => messageCount.start());
	});
	const accountState = new AccountState();
	setAccountState(accountState);
	const { children }: { children: Snippet } = $props();
	const desktop = new MediaQuery('(min-width: 1024px)');
	let headerHeight = $state<number>();
	let mobileSidebarOpen = $state(false);
	function toggleNavigation() {
		if (desktop.current)
			shellContext.toggleSidebar();
		else
			mobileSidebarOpen = !mobileSidebarOpen;
	}
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

	let routerMounted = $state(false);
	onMount(() => {
		routerMounted = true;
	});
	$effect(() => {
		if (!browser || !routerMounted) {
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
		allowedTabs: ['profile', 'notifications', 'security'],
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
		if (authSession.sessionKind !== 'staff') {
			return;
		}
		const shellIdentity = `${authSession.sessionKind}:${authSession.schoolId ?? ''}:${authSession.userId ?? ''}`;
		void shellIdentity;
		// PageQuery shares this request and presents the retry action on failure.
		untrack(() => {
			void bootstrapAppShell().catch(() => {});
		});
	});

</script>

{#if authSession.ready && authSession.isLoggedIn && me}
	<div
		class="flex h-dvh w-full overflow-hidden bg-background text-foreground"
		data-testid="app-shell" style:--app-header-height={headerHeight ? `${headerHeight}px` : undefined}
		data-school-id={academicContext.schoolScopeId}
		data-year-id={academicContext.shellReady ? academicContext.yearId : ''}
	>
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
			<MobileSidebar
				bind:open={mobileSidebarOpen}
				hierarchy={academicContext.hierarchy}
				studentCount={academicContext.studentCount}
				guardianCount={academicContext.guardianCount}
				staffCount={academicContext.staffCount}
				teacherCount={academicContext.teacherCount}
			/>
		{/if}

		<div class="flex min-w-0 flex-1 flex-col">
			<AppHeader bind:height={headerHeight} actor={me} {navigationOpen} profileOpen={profileOpen.open}
				onToggleNavigation={toggleNavigation}
				onOpenProfile={() => (profileOpen.open = true)} />

			{#if pathAllowed}
				{@render children()}
			{:else}
				<DataState status="empty" />
			{/if}
		</div>
	</div>

	<AccountProfileModal bind:open={profileOpen.open} actor={me} section={accountModals.tab ?? 'profile'} onSectionChange={section => accountModals.setTab(section)} onLogout={() => accountState.logout()} />
{:else}
	<AppLoading />
{/if}
