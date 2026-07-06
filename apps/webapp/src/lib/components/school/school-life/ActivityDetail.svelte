<script lang="ts">
	import type { Activity, ActivityEnrollmentStatus } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { enrollStudentInActivityMutation, removeActivityEnrollmentMutation } from '$lib/api/mutations/activity-enrollment.mutations';
	import { deleteActivityMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, ChevronRight, Search, Trash2 } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { ENROLL_NEXT, fmtActivityDate } from '../shared/drawer-constants.ts';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import ActivityFormModal from './ActivityFormModal.svelte';

	const { a }: { a: Activity } = $props();

	const live = $derived(detailDataContext.activities.find(activity => activity.id === a.id) ?? a);
	const hierarchy = $derived(academicContext.hierarchy);
	const students = $derived(detailDataContext.students);
	const enrollments = $derived(live.enrollments);

	let openAdd = $state(false);
	let expandedLevels = $state<string[]>([]);
	let selectedClassId = $state<string | null>(null);
	let search = $state('');
	let busyStudentId = $state<string | null>(null);
	let removeEnrollmentId = $state<string | null>(null);
	let removeOpen = $state(false);
	let removeBusy = $state(false);

	$effect.pre(() => {
		if (hierarchy.length > 0 && expandedLevels.length === 0) {
			expandedLevels = hierarchy.map(g => g.level);
		}
		if (hierarchy.length > 0 && selectedClassId === null) {
			selectedClassId = hierarchy[0]?.classes[0]?.id ?? null;
		}
	});

	const enrolledIds = $derived(new Set(enrollments.map(e => e.studentId)));

	const selectedClass = $derived(
		selectedClassId ? (hierarchy.flatMap(g => g.classes).find(c => c.id === selectedClassId) ?? null) : null,
	);
	const classStudents = $derived(selectedClassId ? students.filter(s => s.classId === selectedClassId) : []);
	const filteredStudents = $derived(classStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase())));

	function enrollStatusLabel(status: ActivityEnrollmentStatus): string {
		return get(t)(`activities.enrollStatus.${status}`);
	}

	function enrollStatusStyle(status: ActivityEnrollmentStatus): string {
		if (status === 'approved') {
			return 'rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground';
		}
		if (status === 'pending') {
			return 'rounded-full border border-highlight/20 bg-highlight-soft px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-highlight';
		}
		return 'rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive';
	}

	async function toggleStatus(enrollment: (typeof enrollments)[number]) {
		if (busyStudentId) {
			return;
		}

		const nextStatus = ENROLL_NEXT[enrollment.status];
		busyStudentId = enrollment.studentId;
		await enrollStudentInActivityMutation({
			activityId: live.id,
			studentId: enrollment.studentId,
			status: nextStatus,
			enrollmentId: enrollment.id,
			successMessage: get(t)('activities.enrollStatusSuccess'),
		});
		busyStudentId = null;
	}

	function toggleLevel(level: string) {
		expandedLevels = expandedLevels.includes(level)
			? expandedLevels.filter(entry => entry !== level)
			: [...expandedLevels, level];
	}

	async function addStudent(studentId: string) {
		if (busyStudentId) {
			return;
		}

		busyStudentId = studentId;
		const ok = await enrollStudentInActivityMutation({
			activityId: live.id,
			studentId,
			status: 'pending',
			successMessage: get(t)('activities.enrollStudentSuccess'),
		});
		busyStudentId = null;
		if (ok) {
			openAdd = false;
		}
	}

	const removeTarget = $derived(
		removeEnrollmentId
			? enrollments.find(enrollment => enrollment.id === removeEnrollmentId)
			: undefined,
	);
	const removeStudent = $derived(
		removeTarget ? students.find(student => student.id === removeTarget.studentId) : undefined,
	);

	async function confirmRemoveEnrollment() {
		if (!removeTarget || removeBusy) {
			return;
		}

		removeBusy = true;
		const ok = await removeActivityEnrollmentMutation({
			activityId: live.id,
			enrollmentId: removeTarget.id,
			successMessage: get(t)('activities.removeEnrollmentSuccess'),
		});
		removeBusy = false;
		if (ok) {
			removeOpen = false;
			removeEnrollmentId = null;
		}
	}

	function openRemoveEnrollment(enrollmentId: string) {
		removeEnrollmentId = enrollmentId;
		removeOpen = true;
	}

	function closeRemoveEnrollment() {
		removeOpen = false;
		removeEnrollmentId = null;
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={live.name}
		summary="{fmtActivityDate(live.startDate)} → {fmtActivityDate(live.endDate)}"
	>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-foreground/80">
				{$t(`activities.cat.${live.category}`)}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
				{enrollments.length}/{live.capacity}
			</span>
		{/snippet}
		{#snippet actions()}
			<ActivityFormModal activity={live} />
			<PermissionGate permission="DISCIPLINE_CREATE" mode="disable" tooltip={$t('activities.permissionCreate')}>
				{#snippet children({ disabled, title })}
					<DeleteEntityButton
						{disabled}
						{title}
						confirmTitle={$t('common.deleteConfirmTitle')}
						confirmDescription={$t('activities.deleteConfirm', { name: live.name })}
						onConfirm={() => deleteActivityMutation(live.id, {
							successMessage: get(t)('activities.toastDeleted', { name: live.name }),
						})}
					/>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<p class="text-sm text-foreground/80">{live.description}</p>
	<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
		<span>{$t('activities.coach')} : <span class="text-foreground/80">{live.coach}</span></span>
		<span>·</span>
		<span>{$t('activities.schedule')} : <span class="text-foreground/80">{live.schedule}</span></span>
	</div>

	<div class="rounded-2xl border border-border bg-card">
		<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('activities.enrolledStudents')}
			</p>
			<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<Dialog.Root bind:open={openAdd}>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									size="sm"
									variant="outline"
									class="h-7 rounded-full text-xs"
									disabled={disabled || Boolean(busyStudentId)}
									title={title}
								>
									<Plus class="mr-1 h-3.5 w-3.5" /> {$t('activities.addStudent')}
								</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content class="w-[50vw] max-w-[50vw] sm:max-w-[50vw]">
							<Dialog.Header>
								<Dialog.Title>{$t('activities.addStudentTitle', { name: live.name })}</Dialog.Title>
								<Dialog.Description>
									{$t('activities.addStudentDescription')}
								</Dialog.Description>
							</Dialog.Header>
							<div class="grid h-[55vh] grid-cols-[30%_70%] gap-0 overflow-hidden rounded-xl border border-border">
								<div class="scrollbar-thin overflow-y-auto border-r border-border bg-secondary/30">
									{#each hierarchy as g (g.level)}
										{@const levelOpen = expandedLevels.includes(g.level)}
										<div class="border-b border-border last:border-b-0">
											<button
												onclick={() => toggleLevel(g.level)}
												class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
											>
												<ChevronRight
													class={cn(
														'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
														levelOpen && 'rotate-90 text-foreground',
													)}
												/>
												<span class="truncate font-semibold">{g.level}</span>
											</button>
											{#if levelOpen}
												<ul class="pb-1">
													{#each g.classes as c (c.id)}
														{@const active = selectedClassId === c.id}
														<li>
															<button
																onclick={() => (selectedClassId = c.id)}
																class={cn(
																	'flex w-full items-center gap-2 py-1.5 pl-9 pr-3 text-left text-sm transition-colors hover:bg-secondary',
																	active && 'border-l-2 border-highlight bg-card font-semibold',
																)}
															>
																<span class="truncate">{c.name}</span>
																<span
																	class="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground"
																>{c.studentCount}</span
																>
															</button>
														</li>
													{/each}
												</ul>
											{/if}
										</div>
									{/each}
								</div>
								<div class="flex flex-col overflow-hidden">
									<div class="border-b border-border px-3 py-2">
										<div class="relative">
											<Search
												class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
											/>
											<Input
												bind:value={search}
												placeholder={selectedClass
													? $t('activities.searchInClass', { className: selectedClass.name })
													: $t('activities.searchStudent')}
												class="h-8 rounded-full pl-8 text-sm"
											/>
										</div>
									</div>
									<div class="scrollbar-thin flex-1 overflow-y-auto">
										{#if !selectedClass}
											<p class="px-4 py-6 text-center text-xs text-muted-foreground">
												{$t('activities.selectClass')}
											</p>
										{:else if filteredStudents.length === 0}
											<p class="px-4 py-6 text-center text-xs text-muted-foreground">
												{$t('activities.noStudentsInClass')}
											</p>
										{:else}
											<ul class="divide-y divide-border/50">
												{#each filteredStudents as s (s.id)}
													{@const already = enrolledIds.has(s.id)}
													<li class="flex items-center justify-between gap-3 px-4 py-2">
														<div class="flex min-w-0 items-center gap-2">
															<span
																class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[10px] font-semibold"
															>
																{s.initials}
															</span>
															<div class="min-w-0">
																<p class="truncate text-sm font-medium">{s.name}</p>
																<p class="truncate text-[11px] text-muted-foreground">{s.email}</p>
															</div>
														</div>
														{#if already}
															<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
																{$t('activities.alreadyEnrolled')}
															</span>
														{:else}
															<Button
																size="sm"
																variant="ghost"
																class="h-7 rounded-full text-xs"
																disabled={busyStudentId === s.id}
																onclick={() => addStudent(s.id)}
															>
																<Plus class="mr-1 h-3.5 w-3.5" /> {$t('activities.addStudentAction')}
															</Button>
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								</div>
							</div>
							<Dialog.Footer>
								<Button variant="outline" class="rounded-full" onclick={() => (openAdd = false)}>
									{$t('common.close')}
								</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				{/snippet}
			</PermissionGate>
		</div>
		{#if enrollments.length === 0}
			<p class="px-4 py-6 text-center text-sm text-muted-foreground">{$t('activities.noEnrollments')}</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each enrollments as e (e.studentId)}
					{@const s = students.find(st => st.id === e.studentId)}
					{#if s}
						{@const cls = academicContext.classes.find(c => c.id === s.classId)}
						<li class="flex items-center justify-between gap-3 px-4 py-2.5">
							<div class="flex min-w-0 items-center gap-2">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[10px] font-semibold"
								>
									{s.initials}
								</span>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{s.name}</p>
									<p class="truncate text-[11px] text-muted-foreground">{cls?.name ?? '—'}</p>
								</div>
							</div>
							<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
								{#snippet children({ disabled, title })}
									<div class="flex items-center gap-2">
										<button
											type="button"
											onclick={() => toggleStatus(e)}
											disabled={disabled || busyStudentId === e.studentId}
											title={title ?? $t('activities.enrollStatusToggleHint')}
											class={cn(
												'transition-colors disabled:opacity-50',
												enrollStatusStyle(e.status),
											)}
										>
											{enrollStatusLabel(e.status)}
										</button>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-muted-foreground hover:text-destructive"
											disabled={disabled || busyStudentId === e.studentId}
											title={$t('activities.removeEnrollment')}
											onclick={() => openRemoveEnrollment(e.id)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								{/snippet}
							</PermissionGate>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
</div>

<ConfirmModal
	bind:open={removeOpen}
	title={$t('common.deleteConfirmTitle')}
	description={removeStudent
		? $t('activities.removeEnrollmentConfirm', { name: removeStudent.name })
		: $t('activities.removeEnrollmentConfirm', { name: '—' })}
	confirmLabel={$t('activities.removeEnrollment')}
	busy={removeBusy}
	onCancel={closeRemoveEnrollment}
	onConfirm={confirmRemoveEnrollment}
/>
