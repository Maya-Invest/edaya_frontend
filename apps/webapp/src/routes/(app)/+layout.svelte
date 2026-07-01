<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { DrawerItem } from '$lib/components/school/shared/drawer-types';
	import type { Component, Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ACCOUNT_OPEN_PROFILE_PARAM } from '$lib/account/profile-navigation';
	import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { authSession } from '$lib/auth/session.svelte';
	import AccountProfileModal from '$lib/components/account/AccountProfileModal.svelte';
	import AcademicHeader from '$lib/components/layout/AcademicHeader.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import SchoolSelector from '$lib/components/layout/SchoolSelector.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import { isLikelyDetailPath, listRouteCacheKey } from '$lib/detail-route-patterns';
	import { DrawerState } from '$lib/drawer.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { DASHBOARD_HREF } from '$lib/navigation';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { canAccessPath } from '$lib/navigation/nav-permissions';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';
	import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { setContext } from 'svelte';

	const { children }: { children: Snippet } = $props();

	const drawer = new DrawerState();
	setContext('drawer', drawer);

	const me = $derived(authSession.accountActor);
	const needsDrawer = $derived(drawer.item !== null || isLikelyDetailPath($page.url.pathname));

	type DetailDrawerComponent = Component<{ item: DrawerItem | null; onClose: () => void }>;
	type ToastHostComponent = Component;

	let DetailDrawer = $state<DetailDrawerComponent | null>(null);
	let ToastHost = $state<ToastHostComponent | null>(null);

	let drawerSyncVersion = 0;
	let profileOpen = $state(false);

	function isReportCardDetailPath(pathname: string): boolean {
		return /^\/configuration\/report-cards\/[^/]+$/.test(pathname)
			|| /^\/classes\/[^/]+\/report-cards\/[^/]+$/.test(pathname);
	}

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

		const authUserId = authSession.authUserId;
		if (authUserId) {
			onboardingContext.init(authUserId);
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
		const pathname = $page.url.pathname;
		if (!canAccessPath(pathname, authSession.grants, { schoolId: authSession.schoolId ?? '' })) {
			appGoto(DASHBOARD_HREF, { replaceState: true });
		}
	});

	$effect(() => {
		if (!browser || !authSession.ready || !authSession.isLoggedIn) {
			return;
		}
		void bootstrapAppShell();
	});

	$effect(() => {
		if (!browser || $page.url.searchParams.get(ACCOUNT_OPEN_PROFILE_PARAM) !== '1') {
			return;
		}
		profileOpen = true;
		const next = new URL($page.url);
		next.searchParams.delete(ACCOUNT_OPEN_PROFILE_PARAM);
		const href = `${next.pathname}${next.search}` as ResolvedPathname;
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	});

	$effect(() => {
		const pathname = $page.url.pathname;
		const cacheKey = listRouteCacheKey($page.url);
		const routeQueryReady = pageQueryStatus.isReady(cacheKey);
		void reportCardsContext.ready;

		if (!isLikelyDetailPath(pathname)) {
			drawer.close();
			return;
		}

		if (!routeQueryReady) {
			return;
		}

		if (isReportCardDetailPath(pathname) && !reportCardsContext.ready) {
			return;
		}

		const version = ++drawerSyncVersion;

		void import('$lib/detail-routes').then(({ parseDetailPath }) => {
			if (version !== drawerSyncVersion)
				return;
			const parsed = parseDetailPath(pathname);
			if (parsed)
				drawer.open(parsed.item);
			else drawer.close();
		});
	});

	$effect(() => {
		if (!needsDrawer || DetailDrawer)
			return;
		void import('$lib/components/school/shared/DetailDrawer.svelte').then((module) => {
			DetailDrawer = module.default;
		});
	});

	$effect(() => {
		if (!browser || ToastHost)
			return;
		void import('$lib/components/ui/ToastHost.svelte').then((module) => {
			ToastHost = module.default;
		});
	});

	async function closeDetail() {
		const { getListPathForDetail } = await import('$lib/detail-routes');
		const listPath = getListPathForDetail($page.url.pathname);
		if (listPath) {
			const href = `${listPath}${$page.url.search}` as ResolvedPathname;
			appGoto(href);
		}
		else {
			drawer.close();
		}
	}

	function logout() {
		resetAppShellBootstrap();
		authSession.logout();
		appGoto(appPath('/login'), { replaceState: true });
	}
</script>

{#if authSession.ready && authSession.isLoggedIn && me}
	{#if !academicContext.shellReady}
		<div
			class="flex h-screen w-full items-center justify-center bg-background text-foreground"
			role="status"
			aria-live="polite"
		>
			<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
		</div>
	{:else}
		<div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
			<AppSidebar
				hierarchy={academicContext.hierarchy}
				studentCount={academicContext.studentCount}
				guardianCount={academicContext.guardianCount}
				staffCount={academicContext.staffCount}
			/>

			<div class="flex min-w-0 flex-1 flex-col">
				<div
					class="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border bg-card px-6"
				>
					<SchoolSelector schools={academicContext.schools} />
					<AcademicHeader />
					<LanguageSelector />
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={() => (profileOpen = true)}
							class="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={$t('account.profile.openProfile')}
							aria-haspopup="dialog"
							aria-expanded={profileOpen}
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

				{@render children()}

				{#if DetailDrawer}
					<DetailDrawer item={drawer.item} onClose={closeDetail} />
				{/if}
			</div>
		</div>

		<AccountProfileModal bind:open={profileOpen} actor={me} onLogout={logout} />

		{#if ToastHost}
			<ToastHost />
		{/if}
	{/if}
{/if}
