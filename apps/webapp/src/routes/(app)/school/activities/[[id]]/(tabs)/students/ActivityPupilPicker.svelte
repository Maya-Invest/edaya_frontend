<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { t } from '$lib/i18n';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { onDestroy, untrack } from 'svelte';
	import { getActivitiesPageState } from '../../../activities-page.svelte';
	import { pickerStudent } from './activity-students-tab.svelte';

	let { activityId, revision, values = $bindable<string[]>([]) }: {
		activityId: string;
		revision: number;
		values?: string[];
	} = $props();
	const page = getActivitiesPageState();
	let query = $state('');
	let classFilter = $state('all');
	let students = $state.raw<ReturnType<typeof pickerStudent>[]>([]);
	let classes = $state.raw<string[]>([]);
	let names = $state.raw<Record<string, string>>({});
	let cursor = $state<string | null>(null);
	let classCursor = $state<string | null>(null);
	let loading = $state(true);
	let failed = $state(false);
	type Action = 'reset' | 'more' | 'classes';
	let retry: Action = 'reset';
	let pending: AbortController | undefined;
	let timer: ReturnType<typeof setTimeout>;
	let lastText = '';
	function cancel() {
		clearTimeout(timer);
		pending?.abort();
	}
	onDestroy(cancel);

	async function load(action: Action) {
		cancel();
		const controller = new AbortController();
		pending = controller;
		const scope = page.scope;
		const activity = activityId;
		const current = () => !controller.signal.aborted && scope === page.scope && activity === page.selectedId;
		retry = action;
		loading = true;
		failed = false;
		try {
			const result = await page.client().queries.getStaffActivityPupilOptions({
				activityId,
				q: query.trim() || undefined,
				classGroupId: classFilter === 'all' ? undefined : classFilter,
				cursor: action === 'more' ? cursor ?? undefined : undefined,
				classCursor: action === 'classes' ? classCursor ?? undefined : undefined,
			}, { signal: controller.signal });
			if (!current())
				return;
			if (action !== 'classes') {
				const rows = [...(action === 'more' ? students : []), ...result.items.map(pickerStudent)];
				students = [...new Map(rows.map(row => [row.id, row])).values()];
				cursor = result.nextCursor;
			}
			if (action === 'classes' || classes.length === 0) {
				classes = [...new Set([...classes, ...result.classGroupIds])];
				classCursor = result.nextClassCursor;
			}
		}
		catch (error) {
			if (!current())
				return;
			if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
				retry = 'reset';
				students = [];
				classes = [];
				cursor = null;
				classCursor = null;
				names = {};
				values = [];
			}
			failed = true;
		}
		finally {
			if (current())
				loading = false;
		}
	}

	$effect(() => {
		const text = query;
		void classFilter;
		void revision;
		cancel();
		students = [];
		cursor = null;
		failed = false;
		loading = true;
		const delay = lastText !== text ? 180 : 0;
		lastText = text;
		timer = setTimeout(() => void untrack(() => load('reset')), delay);
		return cancel;
	});
</script>

<StudentPicker
	bind:query bind:classFilter bind:values
	{students} classGroupIds={classes} mode="multi" variant="panel" active
	remotePanel={{ loading, selectedNames: names, select: (id, name) => { names = { ...names, [id]: name }; } }}
/>
{#if failed}
	<DataState compact status="error" onRetry={() => void load(retry)} />
{:else if !loading}
	{#if cursor}
		<Button type="button" variant="outline" size="sm" onclick={() => void load('more')}>{$t('activities.morePupils')}</Button>
	{/if}
	{#if classCursor}
		<Button type="button" variant="outline" size="sm" onclick={() => void load('classes')}>{$t('activities.moreClasses')}</Button>
	{/if}
{/if}
