<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';

	let { attachments = $bindable([]) }: {
		attachments?: Evaluation['attachments'];
	} = $props();
</script>
<fieldset class="space-y-3"><legend>{$t('profile.attachments')}</legend>
	{#each attachments as attachment, index (index)}<div class="grid gap-2 rounded-lg border p-3 sm:grid-cols-2"><label>{$t('profile.attachmentName')}<Input bind:value={attachment.name} /></label><label>{$t('profile.attachmentSize')}<Input bind:value={attachment.size} /></label><Button type="button" variant="ghost" onclick={() => attachments = attachments.filter((_, i) => i !== index)}>{$t('common.delete')}</Button></div>{/each}
	<Button type="button" variant="outline" onclick={() => attachments = [...attachments, { name: '', size: '' }]}>{$t('common.add')}</Button>
</fieldset>
