<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';

	let { profile = $bindable({}) }: { profile?: Record<string, string> } = $props();
</script>

<Label>
	<span>{$t('profile.identifier')}</span>
	<Input value={profile.identifier ?? ''} maxlength={20} oninput={event => profile.identifier = event.currentTarget.value} />
</Label>
<p class="text-sm text-muted-foreground">{$t('identifier.optionalHelp')}</p>
