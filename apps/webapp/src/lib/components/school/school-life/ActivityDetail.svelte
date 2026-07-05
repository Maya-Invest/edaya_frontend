<script lang="ts">
	import type { Activity } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteActivityMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, ChevronRight, Search } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import {
		ENROLL_STATUS_STYLE,
		ENROLL_STATUS_LABEL,
		ENROLL_NEXT,
		fmtActivityDate,
	} from '../shared/drawer-constants.ts';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import ActivityFormModal from './ActivityFormModal.svelte';

	const { a }: { a: Activity } = $props();

	const hierarchy = $derived(academicContext.hierarchy);
	const students = $derived(detailDataContext.students);

	let enrollments = $derived([...a.enrollments]);
	let openAdd = $state(false);
	let expandedLevels = $state<string[]>([]);
	let selectedClassId = $state<string | null>(null);
	let search = $state('');

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

	function toggleStatus(studentId: string) {
		enrollments = enrollments.map(e =>
			e.studentId === studentId ? { ...e, status: ENROLL_NEXT[e.status] } : e,
		);
	}

	function toggleLevel(level: string) {
		expandedLevels = expandedLevels.includes(level)
			? expandedLevels.filter(entry => entry !== level)
			: [...expandedLevels, level];
	}

	function addStudent(studentId: string) {
		enrollments = [...enrollments, { studentId, status: 'pending' }];
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={a.name}
		summary="{fmtActivityDate(a.startDate)} → {fmtActivityDate(a.endDate)}"
	>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-foreground/80">
				{$t(`activities.cat.${a.category}`)}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
				{enrollments.length}/{a.capacity}
			</span>
		{/snippet}
		{#snippet actions()}
			<ActivityFormModal activity={a} />
			<PermissionGate permission="DISCIPLINE_CREATE" mode="disable" tooltip={$t('activities.permissionCreate')}>
				{#snippet children({ disabled, title })}
					<DeleteEntityButton
						{disabled}
						{title}
						confirmTitle={$t('common.deleteConfirmTitle')}
						confirmDescription={$t('activities.deleteConfirm', { name: a.name })}
						onConfirm={() => deleteActivityMutation(a.id, {
							successMessage: get(t)('activities.toastDeleted', { name: a.name }),
						})}
					/>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<p class="text-sm text-foreground/80">{a.description}</p>
	<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
		<span>{$t('activities.coach')} : <span class="text-foreground/80">{a.coach}</span></span>
		<span>·</span>
		<span>{$t('activities.schedule')} : <span class="text-foreground/80">{a.schedule}</span></span>
	</div>

	<div class="rounded-2xl border border-border bg-card">
		<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Étudiants inscrits</p>
			<Dialog.Root bind:open={openAdd}>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} size="sm" variant="outline" class="h-7 rounded-full text-xs">
							<Plus class="mr-1 h-3.5 w-3.5" /> Ajouter un étudiant
						</Button>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content class="w-[50vw] max-w-[50vw] sm:max-w-[50vw]">
					<Dialog.Header>
						<Dialog.Title>Ajouter un étudiant à « {a.name} »</Dialog.Title>
						<Dialog.Description>
							L'étudiant sera ajouté avec le statut <span class="font-medium text-highlight">En attente</span>.
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
											? `Rechercher dans ${selectedClass.name}…`
											: 'Rechercher un étudiant…'}
										class="h-8 rounded-full pl-8 text-sm"
									/>
								</div>
							</div>
							<div class="scrollbar-thin flex-1 overflow-y-auto">
								{#if !selectedClass}
									<p class="px-4 py-6 text-center text-xs text-muted-foreground">Sélectionnez une classe.</p>
								{:else if filteredStudents.length === 0}
									<p class="px-4 py-6 text-center text-xs text-muted-foreground">Aucun étudiant.</p>
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
													<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
													>Inscrit</span
													>
												{:else}
													<Button
														size="sm"
														variant="ghost"
														class="h-7 rounded-full text-xs"
														onclick={() => addStudent(s.id)}
													>
														<Plus class="mr-1 h-3.5 w-3.5" /> Ajouter
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
						<Button variant="outline" class="rounded-full" onclick={() => (openAdd = false)}>Fermer</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
		{#if enrollments.length === 0}
			<p class="px-4 py-6 text-center text-sm text-muted-foreground">Aucun étudiant inscrit.</p>
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
							<button
								onclick={() => toggleStatus(e.studentId)}
								class={cn(
									'rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
									ENROLL_STATUS_STYLE[e.status],
								)}
								title="Cliquer pour changer le statut"
							>
								{ENROLL_STATUS_LABEL[e.status]}
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
</div>
