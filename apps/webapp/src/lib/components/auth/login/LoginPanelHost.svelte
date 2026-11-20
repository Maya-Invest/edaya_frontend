<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import PasswordlessPanel from '$lib/smart-components/passwordless-panel/PasswordlessPanel.svelte';

	let { email = $bindable(''), active = true, apiConnected }: { email: string; active?: boolean; apiConnected: boolean; activeMethod?: LoginMethodId; stage?: 'form' | 'code'; onMethodChange?: (method: LoginMethodId) => void; onStageChange?: (stage: 'form' | 'code') => void } = $props();
</script>
<PasswordlessPanel bind:email {active} {apiConnected} />
