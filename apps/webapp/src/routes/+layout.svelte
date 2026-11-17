<script lang="ts">
	import { browser } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import { bootstrapAuthOnly, bootstrapSession } from '$lib/auth/bootstrap';
	import { shouldBootstrapAuthOnly } from '$lib/auth/bootstrap-route';
	import ApiDevBanner from '$lib/components/dev/ApiDevBanner.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ToastHost from '$lib/components/ui/ToastHost.svelte';
	import { t } from '$lib/i18n';
	import { provideDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { appGoto, isWizardOnboardingNavigation, shouldBlockStaleOnboardingNavigation } from '$lib/navigation/app-navigation';
	import { onMount } from 'svelte';
	import '../app.css';

	const { children } = $props();
	const dirtyWork = provideDirtyWork();

	function blockStaleOnboardingIfNeeded(to: URL | null | undefined): boolean {
		return shouldBlockStaleOnboardingNavigation({
			to,
			currentHref: window.location.href,
			wizardInitiated: isWizardOnboardingNavigation(),
		});
	}

	beforeNavigate((navigation) => {
		if (!browser) {
			return;
		}
		if (blockStaleOnboardingIfNeeded(navigation.to?.url)) {
			navigation.cancel();
			return;
		}
		if (dirtyWork.hasDirtyWork(navigation.to?.url)) {
			navigation.cancel();
			if (navigation.type === 'leave')
				return; // Kit uses the browser unload confirmation.
			dirtyWork.request(() => {
				if (navigation.type === 'popstate')
					window.history.go(navigation.delta);
				else if (navigation.to)
					void appGoto(navigation.to.url.href);
			}, navigation.to?.url);
		}
	});

	onMount(() => {
		const navigation = (window as Window & {
			navigation?: {
				addEventListener: (type: 'navigate', listener: (event: Event) => void) => void;
				removeEventListener: (type: 'navigate', listener: (event: Event) => void) => void;
			};
		}).navigation;
		if (!navigation) {
			return;
		}

		const onNavigate = (event: Event) => {
			if (window.location.pathname.replace(/\/+$/, '') !== '/onboarding') {
				return;
			}
			const navigateEvent = event as Event & {
				cancelable?: boolean;
				destination?: { url: string };
				hashChange?: boolean;
				downloadRequest?: string;
				preventDefault: () => void;
			};
			if (
				navigateEvent.hashChange
				|| navigateEvent.downloadRequest
				|| !navigateEvent.destination
				|| navigateEvent.cancelable === false
			) {
				return;
			}
			let dest: URL;
			try {
				dest = new URL(navigateEvent.destination.url);
			}
			catch {
				return;
			}
			if (blockStaleOnboardingIfNeeded(dest)) {
				navigateEvent.preventDefault();
			}
		};

		navigation.addEventListener('navigate', onNavigate);
		return () => navigation.removeEventListener('navigate', onNavigate);
	});

	$effect(() => {
		if (!browser) {
			return;
		}

		const pathname = $page.url.pathname;
		if (pathname === '/')
			return; // The entry page resolves the session before choosing a destination.
		if (shouldBootstrapAuthOnly(pathname)) {
			void bootstrapAuthOnly();
			return;
		}

		void bootstrapSession();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EDaya — School Management</title>
</svelte:head>

<ApiDevBanner />

{@render children()}

<ToastHost />

<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')}
	confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')}
	onOpenChange={(open) => {
		if (!open)
			dirtyWork.cancel();
	}} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
