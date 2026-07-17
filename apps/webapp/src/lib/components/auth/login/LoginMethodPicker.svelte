<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import { ENABLED_LOGIN_METHODS } from '$lib/auth/login-methods';
	import { t } from '$lib/i18n';

	interface Props {
		activeMethod: LoginMethodId;
		onSelect: (method: LoginMethodId) => void;
	}

	const { activeMethod, onSelect }: Props = $props();
</script>

{#if ENABLED_LOGIN_METHODS.length > 1}
	<div
		class="mb-5 grid gap-1 rounded-xl bg-secondary/50 p-1"
		style={`grid-template-columns: repeat(${ENABLED_LOGIN_METHODS.length}, minmax(0, 1fr));`}
		role="tablist"
		aria-label={$t('auth.methodPickerLabel')}
	>
		{#each ENABLED_LOGIN_METHODS as method (method.id)}
			<button
				type="button"
				role="tab"
				aria-selected={activeMethod === method.id}
				class="rounded-lg px-3 py-2 text-sm font-medium transition {activeMethod === method.id
					? 'bg-card text-foreground shadow-soft'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => onSelect(method.id)}
			>
				{$t(method.labelKey)}
			</button>
		{/each}
	</div>
{/if}
