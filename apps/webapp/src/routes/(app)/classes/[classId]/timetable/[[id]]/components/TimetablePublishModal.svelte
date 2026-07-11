<script lang="ts">
	import type { TimetablePageState } from '../timetable-page.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';

	let { open = $bindable(false), state: timetablePage }: { open?: boolean; state: TimetablePageState } = $props();
	let policy = $state<'fail' | 'skip'>('fail');

	$effect(() => {
		if (open)
			policy = 'fail';
	});

	async function submit() {
		const range = timetablePage.periodRange;
		const result = await timetablePage.publish(range.startDate, range.endDate, policy);
		if (result)
			open = false;
	}
</script>

<FormModal bind:open title={$t('timetable.publishTitle')} description={$t('timetable.publishHint')} submitLabel={$t('timetable.publish')} busy={timetablePage.busy} onSubmit={submit}>
	<label class="space-y-1.5 text-sm">
		<span>{$t('timetable.conflictPolicy')}</span>
		<select bind:value={policy} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
			<option value="fail">{$t('timetable.policyFail')}</option>
			<option value="skip">{$t('timetable.policySkip')}</option>
		</select>
	</label>
	<p class="text-xs text-muted-foreground">{policy === 'skip' ? $t('timetable.skipHint') : $t('timetable.failHint')}</p>
</FormModal>
