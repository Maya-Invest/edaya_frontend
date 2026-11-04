<script lang="ts">
	import { t } from '$lib/i18n';

	let { isOptional = $bindable(false) }: { isOptional?: boolean } = $props();
	const groupName = $props.id();
</script>

<fieldset>
	<legend class="text-sm font-medium">{$t('onboarding.dataset.subjectType')}</legend>
	<div class="flex flex-wrap gap-x-6">
		<label class="flex min-h-11 items-center gap-2 text-sm">
			<input type="radio" name={groupName} value={false} bind:group={isOptional} class="accent-primary" />
			{$t('onboarding.dataset.required')}
		</label>
		<label class="flex min-h-11 items-center gap-2 text-sm">
			<input type="radio" name={groupName} value={true} bind:group={isOptional} class="accent-primary" />
			{$t('onboarding.dataset.optional')}
		</label>
	</div>
</fieldset>
