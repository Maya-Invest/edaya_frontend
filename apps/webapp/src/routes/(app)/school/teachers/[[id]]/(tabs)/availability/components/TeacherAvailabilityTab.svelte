<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import type { TeacherUnavailability } from '../../../../teachers-page.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';
	import { getTeacherAvailabilityTabState } from '../teacher-availability-tab.svelte';
	import TeacherUnavailabilityFormModal from './TeacherUnavailabilityFormModal.svelte';

	const { teacher }: { teacher: Teacher } = $props();
	const teachersPage = getTeachersPageState();
	const availabilityTab = getTeacherAvailabilityTabState();
	type TeacherAvailabilityModal
		= | 'edit-profile'
			| 'delete'
			| 'add-unavailability'
			| 'edit-unavailability'
			| 'delete-unavailability';
	const modals = createUrlSyncedModals<TeacherAvailabilityModal>({
		allowed: [
			'edit-profile',
			'delete',
			'add-unavailability',
			'edit-unavailability',
			'delete-unavailability',
		],
		getUrl: () => $page.url,
	});
	afterNavigate(() => {
		modals.hydrate();
		validateModal();
	});
	const addOpen = bindUrlModal(modals, 'add-unavailability');
	const editOpen = bindUrlModal(modals, 'edit-unavailability');
	const deleteOpen = bindUrlModal(modals, 'delete-unavailability');
	let busyId = $state<string | null>(null);

	const rows = $derived(availabilityTab.unavailabilitiesFor(teacher.id));
	const editing = $derived(
		modals.isOpen('edit-unavailability') && modals.target
			? rows.find(row => row.id === modals.target)
			: undefined,
	);
	const deleting = $derived(
		modals.isOpen('delete-unavailability') && modals.target
			? rows.find(row => row.id === modals.target)
			: undefined,
	);
	const weekly = $derived(rows.filter(row => row.recurrence === 'weekly').sort((a, b) =>
		`${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`)));
	const oneOff = $derived(rows.filter(row => row.recurrence === 'one_off').sort((a, b) =>
		String(a.startsAt).localeCompare(String(b.startsAt))));

	function canonicalizeModal(modal: TeacherAvailabilityModal | null) {
		replaceRouteSurface(writeModalSurface($page.url, { modal }));
	}

	function validateModal() {
		if (!modals.ready || availabilityTab.slice?.teacherId !== teacher.id || !modals.active) {
			return;
		}
		if (
			(modals.active === 'add-unavailability'
				|| modals.active === 'edit-profile'
				|| modals.active === 'delete')
			&& modals.target
		) {
			canonicalizeModal(modals.active);
			return;
		}
		if (
			(modals.active === 'edit-unavailability' || modals.active === 'delete-unavailability')
			&& !rows.some(row => row.id === modals.target)
		) {
			canonicalizeModal(null);
		}
	}

	function syncRows() {
		availabilityTab.replaceForTeacher(
			teacher.id,
			teachersPage.teacherUnavailabilitiesForTeacher(teacher.id),
		);
	}

	function date(value: unknown): string {
		return value ? new Date(String(value)).toLocaleDateString() : '—';
	}

	async function toggle(rule: TeacherUnavailability) {
		busyId = rule.id;
		const ok = await teachersPage.saveUnavailability({ rule: { ...rule, isActive: !rule.isActive } });
		if (ok) {
			syncRows();
		}
		busyId = null;
	}

	async function confirmDelete() {
		if (!deleting)
			return;
		busyId = deleting.id;
		const ok = await teachersPage.deleteUnavailability({
			id: deleting.id,
			successMessage: get(t)('teacher.availabilityDeleted'),
		});
		busyId = null;
		if (ok) {
			syncRows();
			modals.close();
		}
	}

</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h4 class="text-sm font-semibold">{$t('teacher.availabilityTitle')}</h4>
			<p class="mt-1 text-xs text-muted-foreground">{$t('teacher.availabilityHint')}</p>
		</div>
		<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
			{#snippet children({ disabled })}
				<Button size="sm" class="rounded-full" {disabled} onclick={() => modals.open('add-unavailability')}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />{$t('teacher.availabilityAdd')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	{#each [{ title: $t('teacher.availabilityWeekly'), rows: weekly }, { title: $t('teacher.availabilityOneOff'), rows: oneOff }] as section (section.title)}
		<section>
			<h5 class="mb-2 text-xs font-semibold uppercase text-muted-foreground">{section.title}</h5>
			{#if section.rows.length === 0}
				<p class="py-3 text-sm text-muted-foreground">{$t('teacher.availabilityEmpty')}</p>
			{:else}
				<ul class="divide-y divide-border/60 border-y border-border/70">
					{#each section.rows as rule (rule.id)}
						<li class="flex items-center gap-3 py-3" class:opacity-60={!rule.isActive}>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium">
									{rule.recurrence === 'weekly' ? `${rule.dayOfWeek} · ${rule.startTime}–${rule.endTime}` : `${date(rule.startsAt)} · ${new Date(String(rule.startsAt)).toISOString().slice(11, 16)}–${new Date(String(rule.endsAt)).toISOString().slice(11, 16)}`}
								</p>
								<p class="mt-1 text-xs text-muted-foreground">
									{rule.recurrence === 'weekly' ? `${date(rule.effectiveFrom)} – ${date(rule.effectiveUntil)}` : rule.reason || $t('teacher.availabilityNoReason')}
									{#if rule.recurrence === 'weekly' && rule.reason} · {rule.reason}{/if}
								</p>
							</div>
							<PermissionGate permission="ACCESS_CONTROL_ASSIGN" mode="disable">
								{#snippet children({ disabled })}
									<Button size="sm" variant="ghost" disabled={disabled || busyId === rule.id} onclick={() => toggle(rule)}>{rule.isActive ? $t('common.disable') : $t('common.enable')}</Button>
									<Button size="icon" variant="ghost" class="h-8 w-8" {disabled} onclick={() => modals.open('edit-unavailability', { target: rule.id })}><Pencil class="h-4 w-4" /></Button>
									<Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" {disabled} onclick={() => modals.open('delete-unavailability', { target: rule.id })}><Trash2 class="h-4 w-4" /></Button>
								{/snippet}
							</PermissionGate>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</div>

{#if addOpen.open}
	<TeacherUnavailabilityFormModal bind:open={addOpen.open} {teacher} onSaved={syncRows} />
{/if}
{#if editOpen.open && editing}
	<TeacherUnavailabilityFormModal bind:open={editOpen.open} {teacher} rule={editing} onSaved={syncRows} />
{/if}
<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('teacher.availabilityDeleteTitle')}
	description={$t('teacher.availabilityDeleteHint')}
	confirmLabel={$t('common.delete')}
	busy={Boolean(deleting && busyId === deleting.id)}
	onConfirm={confirmDelete}
/>
