<script lang="ts">
	import { browser } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import { bootstrapAuthOnly, bootstrapSession } from '$lib/auth/bootstrap';
	import { shouldBootstrapAuthOnly } from '$lib/auth/bootstrap-route';
	import ApiDevBanner from '$lib/components/dev/ApiDevBanner.svelte';
	import ToastHost from '$lib/components/ui/ToastHost.svelte';
	import {
		isWizardOnboardingNavigation,
		shouldBlockStaleOnboardingNavigation,
	} from '$lib/navigation/app-navigation';
	import { onMount } from 'svelte';
	import '../app.css';

	const { children } = $props();

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
		if (shouldBootstrapAuthOnly(pathname)) {
			void bootstrapAuthOnly();
			return;
		}

		void bootstrapSession();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Edaya — School Management</title>
</svelte:head>

<ApiDevBanner />

{@render children()}

<ToastHost />
