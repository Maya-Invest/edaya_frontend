<script lang="ts">
	import { authClient } from '$lib/auth/client';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import AppLoading from '$lib/components/layout/AppLoading.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { onMount } from 'svelte';

	let failed = $state(false);

	async function enterApp() {
		failed = false;
		try {
			const { data, error } = await authClient.getSession();
			if (error && error.status !== 401) {
				failed = true;
				return;
			}
			if (!data?.session) {
				await appGoto(appPath('/login'), { replaceState: true });
				return;
			}
			failed = !await completeAuthSignIn(undefined, { replaceState: true });
		}
		catch {
			failed = true;
		}
	}

	onMount(() => {
		void enterApp();
	});
</script>

{#if failed}
	<DataState status="error" onRetry={enterApp} />
{:else}
	<AppLoading />
{/if}
