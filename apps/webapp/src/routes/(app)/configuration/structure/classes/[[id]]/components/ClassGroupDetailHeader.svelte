<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getClassesPageState } from '../../classes-page.svelte';
	import ClassGroupFormModal from '../../components/ClassGroupFormModal.svelte';

	const { classGroup }: { classGroup: ClassNode } = $props();

	const classesPage = getClassesPageState();

	const modals = createUrlSyncedModals({ allowed: ['edit'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

	const live = $derived(
		classesPage.classGroupById(classGroup.id) ?? classGroup,
	);
	const gradeLevel = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const summary = $derived(
		`${$t('classGroups.studentCount')}: ${live.studentCount} · ${gradeLevel?.name ?? live.gradeLevelId}`,
	);
</script>

<DrawerEntityHeader
	name={live.name}
	{summary}
>
	{#snippet chips()}
		<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
			{$t(`classGroups.attendanceMode.${live.attendanceMode}`)}
		</span>
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="SCHOOL_CONFIGURE" mode="disable">
			{#snippet children({ disabled, title })}
				<button
					type="button"
					class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
					{disabled}
					{title}
					onclick={() => (editOpen.open = true)}
				>
					{$t('classGroups.edit')}
				</button>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<ClassGroupFormModal bind:open={editOpen.open} classGroup={live} />
