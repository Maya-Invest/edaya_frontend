<script lang="ts">
	import PasswordlessPanel from '$lib/smart-components/passwordless-panel/PasswordlessPanel.svelte';

	let { email = $bindable(''), apiConnected }: { email: string; apiConnected: boolean; stage?: 'form' | 'verification'; onStageChange?: (stage: 'form' | 'verification') => void; onSwitchToSignIn?: (email: string) => void } = $props();
</script>
<PasswordlessPanel bind:email {apiConnected} />
