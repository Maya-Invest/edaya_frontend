<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { runSelectionOperation } from '$lib/interaction/selection-operation';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
	import ClassGroupPicker from '$lib/smart-components/class-group-picker/ClassGroupPicker.svelte';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';
	import { getActivitiesPageState } from '../../../activities-page.svelte';
	import { getActivityClassesTabState } from './activity-classes-tab.svelte';

	const activitiesPage = getActivitiesPageState();
	const classesTab = getActivityClassesTabState();
	const loadTab = classesTab.query();
	const activityId = $derived($page.params.id ?? '');
	const activity = $derived(activityId ? activitiesPage.findActivity(activityId) : undefined);
	const classEnrollments = $derived(classesTab.classEnrollmentsFor(activityId));

	type ActivityClassesModal = 'edit' | 'delete' | 'link-classes' | 'unlink-class';
	const modals = createUrlSyncedModals<ActivityClassesModal>({
		allowed: ['edit', 'delete', 'link-classes', 'unlink-class'],
		getUrl: () => $page.url,
	});
	afterNavigate(() => {
		modals.hydrate();
		validateModal();
	});
	const addOpen = bindUrlModal(modals, 'link-classes');
	const removeOpen = bindUrlModal(modals, 'unlink-class');
	let classGroupIds = $state<string[]>([]);
	let pickerSession = 0;
	$effect(() => {
		void addOpen.open;
		void activityId;
		void academicContext.scopeGeneration;
		pickerSession += 1;
		return () => {
			pickerSession += 1;
		};
	});
	let busy = $state(false);
	let removeBusy = $state(false);

	const linkedClassGroupIds = $derived(classEnrollments.map(enrollment => enrollment.classGroupId));
	const removeTarget = $derived(
		modals.isOpen('unlink-class') && modals.target
			? classEnrollments.find(enrollment => enrollment.id === modals.target)
			: undefined,
	);
	const removeClassName = $derived(
		removeTarget
			? (academicContext.classes.find(entry => entry.id === removeTarget.classGroupId)?.name ?? removeTarget.classGroupId)
			: '—',
	);

	function canonicalizeModal(modal: ActivityClassesModal | null) {
		replaceRouteSurface(writeModalSurface($page.url, { modal }));
	}

	function validateModal() {
		if (!modals.ready || classesTab.slice?.activityId !== activityId || !modals.active) {
			return;
		}
		if (
			(modals.active === 'edit' || modals.active === 'delete' || modals.active === 'link-classes')
			&& modals.target
		) {
			canonicalizeModal(modals.active);
			return;
		}
		if (
			modals.active === 'unlink-class'
			&& !classEnrollments.some(enrollment => enrollment.id === modals.target)
		) {
			canonicalizeModal(null);
		}
	}

	async function query(url: URL) {
		const result = await loadTab(url);
		validateModal();
		return result;
	}

	async function confirmAddClasses() {
		if (!activity || classGroupIds.length === 0 || busy)
			return;
		const targetId = activity.id;
		const generation = academicContext.scopeGeneration;
		const session = pickerSession;
		const current = () => session === pickerSession && addOpen.open && activityId === targetId && academicContext.scopeGeneration === generation;
		busy = true;
		try {
			const result = await runSelectionOperation(classGroupIds, classGroupId => activitiesPage.ensureClassEnrollment({
				activityId: targetId,
				classGroupId,
			}), current);
			if (!current())
				return;
			classGroupIds = result.remaining;
			if (result.succeeded.length > 0) {
				toast.success(get(t)('activities.linkClassesSuccess', { n: result.succeeded.length }));
				classesTab.syncFromPage(targetId);
			}
			if (result.remaining.length === 0)
				modals.close();
			else toast.error(get(t)('common.partialSelection', { n: result.remaining.length }));
		}
		finally {
			busy = false;
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
			classesTab.syncFromPage(activity.id);
			modals.close();
		}
	}

</script>

{#if activity}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('activities.linkedClasses')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<p class="text-sm text-muted-foreground">{$t('activities.classesTabHint')}</p>

				<div class="rounded-2xl border border-border bg-card">
					<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
						<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
							{$t('activities.linkedClasses')}
						</p>
						<PermissionGate permission="ACTIVITY_MANAGE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
							{#snippet children({ disabled, title })}
								<Button
									size="sm"
									variant="outline"
									class="h-7 rounded-full text-xs"
									disabled={disabled || busy}
									title={title}
									onclick={() => modals.open('link-classes')}
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
									<PermissionGate permission="ACTIVITY_MANAGE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
										{#snippet children({ disabled, title })}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-muted-foreground hover:text-destructive"
												disabled={disabled || busy}
												title={title ?? $t('activities.unlinkClass')}
												onclick={() => modals.open('unlink-class', { target: enrollment.id })}
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
			</DataState>
		{/snippet}
	</PageQuery>
{/if}

<PickerModal
	dirty={classGroupIds.length > 0}
	bind:open={addOpen.open}
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
		active={addOpen.open}
		excludeIds={linkedClassGroupIds}
	/>
</PickerModal>

<ConfirmModal
	bind:open={removeOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('activities.unlinkClassConfirm', { name: removeClassName })}
	confirmLabel={$t('activities.unlinkClass')}
	busy={removeBusy}
	onConfirm={confirmRemoveClass}
/>
