<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { suggestShortName } from '$lib/visible-identification';
	import { untrack } from 'svelte';

	let { name, value = $bindable(), creating = true, disabled = false }: { name: string; value?: string; creating?: boolean; disabled?: boolean } = $props();
	let previousSuggestion = '';
	$effect(() => {
		const suggestion = suggestShortName(name);
		if (creating && untrack(() => !value || value === previousSuggestion))
			value = suggestion;
		previousSuggestion = suggestion;
	});
</script>
<Label class="block space-y-2"><span>{$t('profile.shortName')}</span><Input bind:value={() => value ?? '', next => value = next} {disabled} /></Label>
