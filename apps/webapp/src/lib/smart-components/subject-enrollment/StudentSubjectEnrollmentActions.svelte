<script lang="ts">
	import type { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListSelectionBar from '$lib/components/ui/ListSelectionBar.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { enrollmentSelectionClass } from '$lib/subjects/enrollment-editor';
	import { tick } from 'svelte';
	import SubjectEnrollmentModal from './SubjectEnrollmentModal.svelte';

	const { selection, students, onExport, onSaved }: {
		selection: ListSelectionState<Student>;
		students: readonly Student[];
		onExport?: () => void | Promise<void>;
		onSaved?: () => void | Promise<void>;
	} = $props();
	const listRoute = $derived(/\/(?:school\/students|classes\/[^/]+\/students)\/?$/.test($page.url.pathname));
	const modals = createUrlSyncedModals({ allowed: () => listRoute ? ['subject-selection'] : [], getUrl: () => $page.url });
	$effect(() => modals.hydrate());
	let menuOpen = $state(false);
	const classId = $derived(enrollmentSelectionClass(students, selection.selectedIds));
	const classGroup = $derived(academicContext.classes.find(row => row.id === classId && row.academicYearId === academicContext.yearId));
	const visible = $derived(hasPermission('ENROLLMENT_MANAGE') && (!classGroup || hasPermission('ENROLLMENT_MANAGE', { classId: classGroup.id })));
	const disabled = $derived(!classGroup || !selection.selectedIds.length);
	const context = $derived(modals.active === 'subject-selection' && listRoute
		? {
			schoolId: academicContext.schoolScopeId,
			academicYearId: academicContext.yearId,
			classGroupId: modals.target ?? '',
			className: academicContext.classes.find(row => row.id === modals.target)?.name ?? '',
			yearName: academicContext.years.find(row => row.id === academicContext.yearId)?.label ?? academicContext.yearId,
			zone: academicContext.schools.find(row => row.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC',
			students: classGroup?.id === modals.target ? selection.resolveSelected(students).map(row => ({ id: row.id, name: row.name, enrollmentId: row.enrollmentId })) : [],
		}
		: null);
</script>

{#if selection.selectionMode}
	<ListSelectionBar selectedCount={selection.selectedIds.length} {onExport} onClear={() => selection.clearSelection()} onExit={() => selection.exitSelectionMode()}>
		{#snippet actions()}
			{#if visible}
				<Popover.Popover bind:open={menuOpen}>
					<Popover.PopoverTrigger>
						{#snippet child({ props })}<Button {...props} size="sm" variant="outline">{$t('participation.batchActions')}</Button>{/snippet}
					</Popover.PopoverTrigger>
					{#if menuOpen}
						<Popover.PopoverContent class="w-72 p-2" align="end">
							<RowActionMenuItem {disabled} title={disabled ? $t(selection.selectedIds.length ? 'participation.sameClass' : 'participation.reselect') : undefined} onclick={async () => {
								if (classGroup) {
									const target = classGroup.id;
									menuOpen = false;
									await tick();
									modals.open('subject-selection', { target });
								}
							}}>{$t('participation.enrolments')}</RowActionMenuItem>
							{#if disabled}<p class="px-2 py-1 text-sm text-muted-foreground">{$t(selection.selectedIds.length ? 'participation.sameClass' : 'participation.reselect')}</p>{/if}
						</Popover.PopoverContent>
					{/if}
				</Popover.Popover>
			{/if}
		{/snippet}
	</ListSelectionBar>
{/if}
<SubjectEnrollmentModal {context} onClose={() => modals.close()} {onSaved} />
