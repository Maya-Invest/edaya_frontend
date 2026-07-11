<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import ClassGroupPicker from '$lib/smart-components/class-group-picker/ClassGroupPicker.svelte';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';
	import { getActivitiesPageState } from '../../../activities-page.svelte';

	const activitiesPage = getActivitiesPageState();
	const activityId = $derived($page.params.id ?? '');
	const activity = $derived(activityId ? activitiesPage.findActivity(activityId) : undefined);
	const classEnrollments = $derived(activity?.classEnrollments ?? []);

	let addOpen = $state(false);
	let classGroupIds = $state<string[]>([]);
	let busy = $state(false);
	let removeEnrollmentId = $state<string | null>(null);
	let removeOpen = $state(false);
	let removeBusy = $state(false);

	const linkedClassGroupIds = $derived(classEnrollments.map(enrollment => enrollment.classGroupId));
	const removeTarget = $derived(
		removeEnrollmentId
			? classEnrollments.find(enrollment => enrollment.id === removeEnrollmentId)
			: undefined,
	);
	const removeClassName = $derived(
		removeTarget
			? (academicContext.classes.find(entry => entry.id === removeTarget.classGroupId)?.name ?? removeTarget.classGroupId)
			: '—',
	);

	async function confirmAddClasses() {
		if (!activity || classGroupIds.length === 0 || busy) {
			return;
		}

		busy = true;
		let linked = 0;
		for (const classGroupId of classGroupIds) {
			const ok = await activitiesPage.ensureClassEnrollment({
				activityId: activity.id,
				classGroupId,
			});
			if (ok) {
				linked += 1;
			}
		}
		busy = false;
		if (linked > 0) {
			toast.success(get(t)('activities.linkClassesSuccess', { n: linked }));
			addOpen = false;
			classGroupIds = [];
		}
	}

	async function confirmRemoveClass() {
		if (!activity || !removeTarget || removeBusy) {
			return;
		}

		removeBusy = true;
		const ok = await activitiesPage.removeClassEnrollment({
			activityId: activity.id,
			enrollmentId: removeTarget.id,
			successMessage: get(t)('activities.unlinkClassSuccess'),
		});
		removeBusy = false;
		if (ok) {
			removeOpen = false;
			removeEnrollmentId = null;
		}
	}
</script>

{#if activity}
	<p class="text-sm text-muted-foreground">{$t('activities.classesTabHint')}</p>

	<div class="rounded-2xl border border-border bg-card">
		<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('activities.linkedClasses')}
			</p>
			<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						variant="outline"
						class="h-7 rounded-full text-xs"
						disabled={disabled || busy}
						title={title}
						onclick={() => (addOpen = true)}
					>
						<Plus class="mr-1 h-3.5 w-3.5" /> {$t('activities.linkClasses')}
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
		{#if classEnrollments.length === 0}
			<p class="px-4 py-6 text-center text-sm text-muted-foreground">{$t('activities.noLinkedClasses')}</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each classEnrollments as enrollment (enrollment.id)}
					{@const classGroup = academicContext.classes.find(entry => entry.id === enrollment.classGroupId)}
					<li class="flex items-center justify-between gap-3 px-4 py-2.5">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{classGroup?.name ?? enrollment.classGroupId}</p>
							<p class="truncate text-[11px] text-muted-foreground">
								{classGroup?.level ?? '—'}
								{#if classGroup}
									· {classGroup.studentCount} {$t('activities.studentsShort')}
								{/if}
							</p>
						</div>
						<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
							{#snippet children({ disabled, title })}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="h-8 w-8 text-muted-foreground hover:text-destructive"
									disabled={disabled || busy}
									title={title ?? $t('activities.unlinkClass')}
									onclick={() => {
										removeEnrollmentId = enrollment.id;
										removeOpen = true;
									}}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/snippet}
						</PermissionGate>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<PickerModal
	bind:open={addOpen}
	title={activity ? $t('activities.linkClassesTitle', { name: activity.name }) : $t('activities.linkClasses')}
	description={$t('activities.linkClassesDescription')}
	confirmLabel={$t('activities.linkClassesAction')}
	busy={busy}
	confirmDisabled={classGroupIds.length === 0}
	onCancel={() => {
		classGroupIds = [];
	}}
	onConfirm={confirmAddClasses}
>
	<ClassGroupPicker
		bind:values={classGroupIds}
		mode="multi"
		variant="panel"
		active={addOpen}
		excludeIds={linkedClassGroupIds}
	/>
</PickerModal>

<ConfirmModal
	bind:open={removeOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('activities.unlinkClassConfirm', { name: removeClassName })}
	confirmLabel={$t('activities.unlinkClass')}
	busy={removeBusy}
	onCancel={() => {
		removeEnrollmentId = null;
	}}
	onConfirm={confirmRemoveClass}
/>
