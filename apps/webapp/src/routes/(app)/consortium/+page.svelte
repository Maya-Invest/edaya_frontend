<script lang="ts">
	import type { ConsortiumDashboardDto, ConsortiumSchoolStats } from '$lib/api/consortium-data';
	import {
		assignConsortiumSchoolOwnerApi,
		fetchConsortiumDashboard,
		fetchMyConsortium,
		updateConsortiumSharedRulesApi,
	} from '$lib/api/consortium-data';
	import { switchActiveSchool } from '$lib/auth/switch-school';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { AlertTriangle, Building2, CalendarX2, LoaderCircle, Users, Wallet } from '$lib/icons';
	import { DASHBOARD_HREF } from '$lib/navigation';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	type LoadStatus = 'loading' | 'ready' | 'error' | 'not-found';

	const STRUCTURE_TEMPLATE_OPTIONS: Array<{ id: string; labelKey: 'onboarding.structure.modelCollege' | 'onboarding.structure.modelLycee' }> = [
		{ id: 'ci-college', labelKey: 'onboarding.structure.modelCollege' },
		{ id: 'ci-lycee', labelKey: 'onboarding.structure.modelLycee' },
	];

	let status = $state<LoadStatus>('loading');
	let dashboard = $state<ConsortiumDashboardDto | null>(null);
	let sharedRuleIds = $state<string[]>([]);
	let savingSharedRules = $state(false);
	let sharedRulesSaved = $state(false);
	let switchingSchoolId = $state<string | null>(null);

	let ownerModalSchool = $state<ConsortiumSchoolStats | null>(null);
	let ownerMode = $state<'staff' | 'email'>('email');
	let ownerSubjectId = $state('');
	let ownerEmail = $state('');
	let ownerSaving = $state(false);
	let ownerError = $state<string | null>(null);

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
	}

	async function loadDashboard() {
		status = 'loading';
		try {
			const consortium = await fetchMyConsortium();
			if (!consortium) {
				status = 'not-found';
				return;
			}
			const data = await fetchConsortiumDashboard(consortium.id);
			dashboard = data;
			sharedRuleIds = [...data.consortium.sharedRules.structureTemplateIds];
			status = 'ready';
		}
		catch {
			status = 'error';
		}
	}

	$effect(() => {
		void loadDashboard();
	});

	function toggleSharedRule(templateId: string, checked: boolean) {
		sharedRulesSaved = false;
		sharedRuleIds = checked
			? [...sharedRuleIds, templateId]
			: sharedRuleIds.filter(id => id !== templateId);
	}

	async function saveSharedRules() {
		if (!dashboard) {
			return;
		}
		savingSharedRules = true;
		sharedRulesSaved = false;
		try {
			const updated = await updateConsortiumSharedRulesApi(dashboard.consortium.id, {
				structureTemplateIds: sharedRuleIds,
			});
			dashboard = { ...dashboard, consortium: { ...dashboard.consortium, sharedRules: updated.sharedRules } };
			sharedRulesSaved = true;
		}
		finally {
			savingSharedRules = false;
		}
	}

	async function handleSwitchToSchool(schoolId: string) {
		switchingSchoolId = schoolId;
		try {
			await switchActiveSchool(schoolId);
			appGoto(DASHBOARD_HREF);
		}
		finally {
			switchingSchoolId = null;
		}
	}

	function openOwnerModal(school: ConsortiumSchoolStats) {
		ownerModalSchool = school;
		ownerMode = school.assignableStaff.length > 0 ? 'staff' : 'email';
		ownerSubjectId = school.assignableStaff[0]?.subjectId ?? '';
		ownerEmail = school.ownerStatus === 'pending_invite' ? (school.ownerEmail ?? '') : '';
		ownerError = null;
	}

	function closeOwnerModal() {
		ownerModalSchool = null;
		ownerSaving = false;
		ownerError = null;
	}

	function handleOwnerModalOpenChange(open: boolean) {
		if (!open) {
			closeOwnerModal();
		}
	}

	async function submitOwnerAssignment() {
		if (!dashboard || !ownerModalSchool) {
			return;
		}

		const trimmedEmail = ownerEmail.trim();
		if (ownerMode === 'email' && !trimmedEmail) {
			return;
		}
		if (ownerMode === 'staff' && !ownerSubjectId) {
			return;
		}

		ownerSaving = true;
		ownerError = null;
		try {
			await assignConsortiumSchoolOwnerApi(
				dashboard.consortium.id,
				ownerModalSchool.schoolId,
				ownerMode === 'staff' ? { subjectId: ownerSubjectId } : { email: trimmedEmail },
			);
			closeOwnerModal();
			await loadDashboard();
		}
		catch {
			ownerError = get(t)('consortium.owner.modal.error');
		}
		finally {
			ownerSaving = false;
		}
	}
</script>

<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<section class="scrollbar-thin flex-1 overflow-y-auto px-8 py-8">
		<div class="mx-auto max-w-[1400px] space-y-6">
			{#if status === 'loading'}
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<LoaderCircle class="h-4 w-4 animate-spin" />
					{$t('consortium.loading')}
				</div>
			{:else if status === 'not-found'}
				<div class="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
					{$t('consortium.notFound')}
				</div>
			{:else if status === 'error'}
				<div class="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
					{$t('consortium.loadError')}
				</div>
			{:else if dashboard}
				<!-- Hero -->
				<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
					<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
						{$t('consortium.title')}
					</p>
					<h1 class="mt-1 font-display text-2xl font-semibold leading-tight">
						{dashboard.consortium.name}
					</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						{$t('consortium.schoolCount', { count: dashboard.schoolCount })}
					</p>
				</section>

				<!-- Totals -->
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground/80">
							<Building2 class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.schoolCount}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{$t('consortium.kpi.schools')}</p>
					</div>
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground/80">
							<Users class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.totals.studentCount}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{$t('consortium.kpi.students')}</p>
					</div>
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground/80">
							<Users class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.totals.staffCount}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{$t('consortium.kpi.staff')}</p>
					</div>
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', dashboard.totals.overdueFeeCount > 0 ? 'bg-highlight-soft text-highlight' : 'bg-secondary text-foreground/80')}>
							<Wallet class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.totals.overdueFeeCount}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{$t('consortium.kpi.overdueFees')}
							· {$t('consortium.kpi.overdueFeesMeta', { amount: formatAmount(dashboard.totals.overdueFeeAmount) })}
						</p>
					</div>
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', dashboard.totals.absencesToday > 0 ? 'bg-highlight-soft text-highlight' : 'bg-secondary text-foreground/80')}>
							<CalendarX2 class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.totals.absencesToday}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{$t('consortium.kpi.absencesToday')}</p>
					</div>
					<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
						<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', dashboard.totals.openIncidentCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground/80')}>
							<AlertTriangle class="h-4 w-4" />
						</div>
						<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{dashboard.totals.openIncidentCount}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{$t('consortium.kpi.openIncidents')}</p>
					</div>
				</div>

				<!-- Schools table -->
				<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					<header class="border-b border-border px-5 py-4">
						<h2 class="font-display text-base font-semibold">{$t('consortium.schools.title')}</h2>
					</header>
					{#if dashboard.schools.length === 0}
						<p class="px-5 py-8 text-sm text-muted-foreground">{$t('consortium.schools.empty')}</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full min-w-[800px] text-sm">
								<thead class="border-b border-border bg-secondary/30 text-left">
									<tr>
										<th class="px-4 py-3 font-medium">{$t('consortium.schools.name')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.kpi.students')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.kpi.staff')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.kpi.overdueFees')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.kpi.absencesToday')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.kpi.openIncidents')}</th>
										<th class="px-4 py-3 font-medium">{$t('consortium.schools.owner')}</th>
										<th class="px-4 py-3 font-medium"></th>
									</tr>
								</thead>
								<tbody>
									{#each dashboard.schools as row (row.schoolId)}
										<tr class="border-b border-border/60 last:border-0 transition hover:bg-secondary/20">
											<td class="px-4 py-3 font-medium">{row.schoolName}</td>
											<td class="px-4 py-3 font-mono tabular-nums">{row.studentCount}</td>
											<td class="px-4 py-3 font-mono tabular-nums">{row.staffCount}</td>
											<td class="px-4 py-3 font-mono tabular-nums">
												<span class={row.overdueFeeCount > 0 ? 'text-highlight' : ''}>
													{row.overdueFeeCount}
												</span>
											</td>
											<td class="px-4 py-3 font-mono tabular-nums">
												<span class={row.absencesToday > 0 ? 'text-highlight' : ''}>
													{row.absencesToday}
												</span>
											</td>
											<td class="px-4 py-3 font-mono tabular-nums">
												<span class={row.openIncidentCount > 0 ? 'text-destructive' : ''}>
													{row.openIncidentCount}
												</span>
											</td>
											<td class="px-4 py-3">
												{#if row.ownerStatus === 'assigned'}
													<span class="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
														{row.ownerName || row.ownerEmail || $t('consortium.owner.assigned')}
													</span>
												{:else if row.ownerStatus === 'pending_invite'}
													<span class="inline-flex items-center rounded-full bg-highlight-soft px-2.5 py-1 text-xs font-medium text-highlight">
														{$t('consortium.owner.pending')}{row.ownerEmail ? ` · ${row.ownerEmail}` : ''}
													</span>
												{:else}
													<span class="inline-flex items-center rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
														{$t('consortium.owner.unassigned')}
													</span>
												{/if}
											</td>
											<td class="px-4 py-3 text-right">
												<div class="flex items-center justify-end gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={switchingSchoolId === row.schoolId}
														onclick={() => handleSwitchToSchool(row.schoolId)}
													>
														{switchingSchoolId === row.schoolId
															? $t('consortium.schools.switching')
															: $t('consortium.schools.switchTo')}
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onclick={() => openOwnerModal(row)}
													>
														{row.ownerStatus === 'assigned'
															? $t('consortium.owner.transfer')
															: $t('consortium.owner.assign')}
													</Button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>

				<!-- Shared rules -->
				<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
					<header class="mb-3">
						<h2 class="font-display text-base font-semibold">{$t('consortium.sharedRules.title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$t('consortium.sharedRules.description')}</p>
					</header>
					<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
						{#each STRUCTURE_TEMPLATE_OPTIONS as option (option.id)}
							<label class="inline-flex cursor-pointer items-center gap-2">
								<Checkbox
									checked={sharedRuleIds.includes(option.id)}
									onCheckedChange={checked => toggleSharedRule(option.id, checked === true)}
								/>
								<span class="text-sm text-foreground">{$t(option.labelKey)}</span>
							</label>
						{/each}
					</div>
					<div class="mt-4 flex items-center gap-3">
						<Button type="button" disabled={savingSharedRules} onclick={saveSharedRules}>
							{savingSharedRules ? $t('consortium.sharedRules.saving') : $t('common.save')}
						</Button>
						{#if sharedRulesSaved}
							<p class="text-xs text-muted-foreground">{$t('consortium.sharedRules.saved')}</p>
						{/if}
					</div>
				</section>
			{/if}
		</div>
	</section>
</main>

<Dialog.Root open={ownerModalSchool !== null} onOpenChange={handleOwnerModalOpenChange}>
	{#if ownerModalSchool}
		<Dialog.Content class="max-w-md rounded-2xl">
			<Dialog.Header>
				<Dialog.Title>
					{ownerModalSchool.ownerStatus === 'assigned'
						? $t('consortium.owner.modal.transferTitle')
						: $t('consortium.owner.modal.assignTitle')}
				</Dialog.Title>
				<Dialog.Description>
					{ownerModalSchool.schoolName}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				{#if ownerModalSchool.assignableStaff.length > 0}
					<div class="flex flex-wrap items-center gap-4 text-sm text-foreground">
						<label class="inline-flex cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="owner-assignment-mode"
								value="staff"
								checked={ownerMode === 'staff'}
								disabled={ownerSaving}
								onchange={() => (ownerMode = 'staff')}
								class="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							{$t('consortium.owner.modal.modeStaff')}
						</label>
						<label class="inline-flex cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="owner-assignment-mode"
								value="email"
								checked={ownerMode === 'email'}
								disabled={ownerSaving}
								onchange={() => (ownerMode = 'email')}
								class="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							{$t('consortium.owner.modal.modeInvite')}
						</label>
					</div>
				{/if}

				{#if ownerMode === 'staff' && ownerModalSchool.assignableStaff.length > 0}
					<div class="space-y-1">
						<Label for="owner-assignment-staff">{$t('consortium.owner.modal.staffLabel')}</Label>
						<select
							id="owner-assignment-staff"
							bind:value={ownerSubjectId}
							disabled={ownerSaving}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#each ownerModalSchool.assignableStaff as staff (staff.subjectId)}
								<option value={staff.subjectId}>
									{staff.email ? `${staff.name} (${staff.email})` : staff.name}
								</option>
							{/each}
						</select>
					</div>
				{:else}
					<div class="space-y-1">
						<Label for="owner-assignment-email">{$t('consortium.owner.modal.emailLabel')}</Label>
						<Input
							id="owner-assignment-email"
							type="email"
							bind:value={ownerEmail}
							placeholder={$t('consortium.owner.modal.emailPlaceholder')}
							disabled={ownerSaving}
						/>
					</div>
				{/if}

				{#if ownerError}
					<p class="text-xs text-destructive">{ownerError}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="button" variant="ghost" disabled={ownerSaving} onclick={closeOwnerModal}>
					{$t('common.cancel')}
				</Button>
				<Button type="button" disabled={ownerSaving} onclick={submitOwnerAssignment}>
					{ownerSaving ? $t('consortium.owner.modal.saving') : $t('consortium.owner.modal.submit')}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
