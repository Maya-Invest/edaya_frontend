<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import type { IncidentInvolvementRole } from '../../lib/incident-detail-mutations';
	import { academicContext } from '$lib/academic/context.svelte';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { loadIncidentResolveModalData } from '$lib/api/school-life-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, Plus, Trash2 } from '$lib/icons';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { get } from 'svelte/store';
	import { getEventsPageState } from '../../events-page.svelte';

	const INVOLVEMENT_ROLES: IncidentInvolvementRole[] = ['subject', 'witness', 'victim'];
	const NO_SANCTION = '__none__';

	type ResolveRow = {
		key: string;
		studentId: string;
		role: IncidentInvolvementRole;
		involvementId?: string;
		disciplinaryActionId: string;
	};

	let {
		incident,
		open = $bindable(false),
		onResolved,
	}: {
		incident: Incident;
		open?: boolean;
		onResolved?: () => void;
	} = $props();

	const eventsPage = getEventsPageState();

	let busy = $state(false);
	let loading = $state(false);
	let rows = $state<ResolveRow[]>([]);
	let resolutionNotes = $state('');
	let disciplinaryActions = $state<Array<{ id: string; name: string }>>([]);

	const canSubmit = $derived(!loading && rows.length > 0 && rows.every(row => row.studentId.length > 0));

	function excludeStudentIds(currentKey: string) {
		return rows
			.filter(row => row.key !== currentKey)
			.map(row => row.studentId)
			.filter(Boolean);
	}

	function resetRows() {
		rows = [{
			key: `row-${incident.studentId}`,
			studentId: incident.studentId,
			role: 'subject',
			disciplinaryActionId: NO_SANCTION,
		}];
		resolutionNotes = '';
		disciplinaryActions = [];
	}

	async function loadModalData() {
		loading = true;
		try {
			const data = await loadIncidentResolveModalData(
				getBrowserSchoolClient(),
				incident.id,
				academicContext.periodId,
			);
			disciplinaryActions = data.disciplinaryActions.map(action => ({
				id: action.id,
				name: action.name,
			}));
			rows = data.involvements.length > 0
				? data.involvements.map(involvement => ({
					key: involvement.id,
					studentId: involvement.studentId,
					role: involvement.role,
					involvementId: involvement.id,
					disciplinaryActionId: NO_SANCTION,
				}))
				: [{
					key: `row-${incident.studentId}`,
					studentId: incident.studentId,
					role: 'subject',
					disciplinaryActionId: NO_SANCTION,
				}];
			resolutionNotes = typeof data.incident.resolutionNotes === 'string'
				? data.incident.resolutionNotes
				: '';
		}
		catch {
			resetRows();
		}
		finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open) {
			void loadModalData();
		}
	});

	function addRow() {
		rows = [...rows, {
			key: `row-${Date.now()}`,
			studentId: '',
			role: 'witness',
			disciplinaryActionId: NO_SANCTION,
		}];
	}

	function removeRow(key: string) {
		if (rows.length <= 1) {
			return;
		}
		rows = rows.filter(row => row.key !== key);
	}

	function updateRow(key: string, patch: Partial<ResolveRow>) {
		rows = rows.map(row => row.key === key ? { ...row, ...patch } : row);
	}

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			const ok = await eventsPage.resolveIncidentWithOutcomes({
				incidentId: incident.id,
				resolutionNotes,
				involvedStudents: rows.map(row => ({
					studentId: row.studentId,
					role: row.role,
					involvementId: row.involvementId,
					disciplinaryActionId: row.disciplinaryActionId === NO_SANCTION
						? undefined
						: row.disciplinaryActionId,
				})),
				successMessage: get(t)('events.resolveSuccess'),
			});
			if (ok) {
				open = false;
				onResolved?.();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('events.resolveTitle')}
	description={$t('events.resolveDescription')}
	submitLabel={$t('events.resolveAction')}
	busy={busy || loading}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	{#if loading}
		<div class="flex items-center justify-center py-10 text-sm text-muted-foreground">
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{$t('dataState.loading')}
		</div>
	{:else}
		<div class="space-y-4">
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-3">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('events.involvedStudents')}
					</Label>
					<Button type="button" variant="outline" size="sm" class="rounded-full" onclick={addRow}>
						<Plus class="mr-1 h-3.5 w-3.5" />
						{$t('events.addInvolvedStudent')}
					</Button>
				</div>

				<div class="space-y-3">
					{#each rows as row (row.key)}
						<div class="rounded-2xl border border-border bg-secondary/20 p-3 space-y-3">
							<div class="flex items-start justify-between gap-2">
								<p class="text-xs font-medium text-muted-foreground">
									{$t('events.involvedStudentRow')}
								</p>
								{#if rows.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="h-7 w-7 shrink-0 text-muted-foreground"
										onclick={() => removeRow(row.key)}
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								{/if}
							</div>
							<div class="space-y-1.5">
								<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
									{$t('events.student')}
								</Label>
								<StudentPicker
									value={row.studentId}
									active={open}
									excludeIds={excludeStudentIds(row.key)}
									onValueChange={studentId => updateRow(row.key, { studentId })}
								/>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
										{$t('events.involvementRole')}
									</Label>
									<Select.Root
										type="single"
										value={row.role}
										onValueChange={value => value && updateRow(row.key, { role: value as IncidentInvolvementRole })}
									>
										<Select.Trigger>
											<Select.Value placeholder={$t('events.involvementRole')}>
												{$t(`events.role.${row.role}`)}
											</Select.Value>
										</Select.Trigger>
										<Select.Content class="z-[100]">
											{#each INVOLVEMENT_ROLES as role (role)}
												<Select.Item value={role} label={$t(`events.role.${role}`)}>
													{$t(`events.role.${role}`)}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-1.5">
									<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
										{$t('events.disciplinaryAction')}
									</Label>
									<Select.Root
										type="single"
										value={row.disciplinaryActionId}
										onValueChange={value => value && updateRow(row.key, { disciplinaryActionId: value })}
									>
										<Select.Trigger>
											<Select.Value placeholder={$t('events.noDisciplinaryAction')}>
												{row.disciplinaryActionId === NO_SANCTION
													? $t('events.noDisciplinaryAction')
													: disciplinaryActions.find(action => action.id === row.disciplinaryActionId)?.name ?? $t('events.disciplinaryAction')}
											</Select.Value>
										</Select.Trigger>
										<Select.Content class="z-[100]">
											<Select.Item value={NO_SANCTION} label={$t('events.noDisciplinaryAction')}>
												{$t('events.noDisciplinaryAction')}
											</Select.Item>
											{#each disciplinaryActions as action (action.id)}
												<Select.Item value={action.id} label={action.name}>
													{action.name}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('events.resolveNotes')}
				</Label>
				<Textarea bind:value={resolutionNotes} rows={4} />
			</div>
		</div>
	{/if}
</FormModal>
