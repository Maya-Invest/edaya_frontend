<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import type { IncidentInvolvementRole } from '../../lib/incident-detail-mutations';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, Plus, Trash2 } from '$lib/icons';
	import { hasPermission } from '$lib/permissions';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getEventsPageState } from '../../events-page.svelte';

	const INVOLVEMENT_ROLES: IncidentInvolvementRole[] = ['subject', 'witness', 'victim'];
	const NO_SANCTION = '__none__';
	type ResolveRow = {
		key: string;
		studentId: string;
		role: IncidentInvolvementRole;
		involvementId?: string;
		notes?: string;
		disciplinaryActionId: string;
		sanctionStartsAt?: string;
		sanctionEndsAt?: string;
		sanctionNotes?: string;
	};
	let { incident, open = $bindable(false), onResolved }: {
		incident: Incident;
		open?: boolean;
		onResolved?: () => void;
	} = $props();
	const eventsPage = getEventsPageState();
	let busy = $state(false);
	let loading = $state(false);
	let loadFailed = $state(false);
	let loadGeneration = 0;
	let rows = $state<ResolveRow[]>([]);
	let resolutionNotes = $state('');
	let classGroupId = $state<string | undefined>(undefined);
	const canAddParticipant = $derived(hasPermission('DISCIPLINE_CREATE', { classId: classGroupId }));
	const canEditParticipant = $derived(hasPermission('DISCIPLINE_MANAGE', { classId: classGroupId }));
	let disciplinaryActions = $state<Array<{
		id: string;
		name: string;
	}>>([]);
	const canSubmit = $derived(!busy && !loading && !loadFailed && rows.length > 0 && rows.every(row => row.studentId.length > 0 && (!row.sanctionStartsAt || !row.sanctionEndsAt || row.sanctionStartsAt <= row.sanctionEndsAt)));
	function excludeStudentIds(currentKey: string) {
		return rows
			.filter(row => row.key !== currentKey)
			.map(row => row.studentId)
			.filter(Boolean);
	}
	async function loadModalData() {
		const generation = ++loadGeneration;
		const incidentId = incident.id;
		const studentId = incident.studentId;
		loading = true;
		loadFailed = false;
		rows = [];
		classGroupId = undefined;
		disciplinaryActions = [];
		try {
			const data = await eventsPage.loadIncidentResolution(incidentId, academicContext.periodId);
			if (generation !== loadGeneration || !open)
				return;
			classGroupId = data.incident.classGroupId ?? undefined;
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
					notes: involvement.notes ?? '',
					disciplinaryActionId: NO_SANCTION,
				}))
				: [{
					key: `row-${studentId}`,
					studentId,
					role: 'subject',
					disciplinaryActionId: NO_SANCTION,
				}];
			resolutionNotes = typeof data.incident.resolutionNotes === 'string'
				? data.incident.resolutionNotes
				: '';
		}
		catch {
			if (generation === loadGeneration && open) {
				loadFailed = true;
				rows = [];
			}
		}
		finally {
			if (generation === loadGeneration)
				loading = false;
		}
	}
	$effect(() => {
		// Data refreshes must not replace a draft; identity/scope changes must.
		const identity = [open, incident.id, academicContext.scopeGeneration, academicContext.periodId];
		if (identity[0])
			untrack(() => void loadModalData());
		return () => {
			loadGeneration += 1;
		};
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
		const generation = loadGeneration;
		try {
			const ok = await eventsPage.resolveIncidentWithOutcomes({
				incidentId: incident.id,
				resolutionNotes,
				involvedStudents: rows.map(row => ({
					studentId: row.studentId,
					role: row.role,
					involvementId: row.involvementId,
					notes: row.notes,
					sanctionStartsAt: row.sanctionStartsAt,
					sanctionEndsAt: row.sanctionEndsAt,
					sanctionNotes: row.sanctionNotes,
					disciplinaryActionId: row.disciplinaryActionId === NO_SANCTION
						? undefined
						: row.disciplinaryActionId,
				})),
				successMessage: get(t)('events.resolveSuccess'),
			});
			if (ok && generation === loadGeneration && open) {
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
	contentClass="max-w-3xl"
>
	{#if loading}
		<div class="flex items-center justify-center py-10 text-sm text-muted-foreground">
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{$t('dataState.loading')}
		</div>
	{:else if loadFailed}
		<div role="alert" class="space-y-4">
			<p>{$t('dataState.error')}</p>
			<Button variant="outline" onclick={loadModalData}>{$t('dataState.retry')}</Button>
		</div>
	{:else}
		<div class="space-y-4">
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-3">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('events.involvedStudents')}
					</Label>
					<Button type="button" variant="outline" size="sm" disabled={!canAddParticipant} title={!canAddParticipant ? $t('events.permissionCreate') : undefined} onclick={addRow}>
						<Plus class="mr-1 h-3.5 w-3.5" />
						{$t('events.addInvolvedStudent')}
					</Button>
				</div>

				<div class="space-y-3">
					{#each rows as row (row.key)}
						<div class="rounded-collection border border-border bg-secondary/20 p-3 space-y-3">
							<div class="flex items-start justify-between gap-2">
								<p class="text-xs font-medium text-muted-foreground">
									{$t('events.involvedStudentRow')}
								</p>
								{#if rows.length > 1 && !row.involvementId}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="w-7 shrink-0 text-muted-foreground"
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
									disabled={Boolean(row.involvementId) || !canAddParticipant}
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
										disabled={row.involvementId ? !canEditParticipant : !canAddParticipant}
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
								<label class="block">{$t('profile.notes')}<Textarea value={row.notes ?? ''} disabled={row.involvementId ? !canEditParticipant : !canAddParticipant} oninput={event => updateRow(row.key, { notes: event.currentTarget.value })} /></label>
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
								{#if row.disciplinaryActionId !== NO_SANCTION}<div class="grid gap-2 sm:grid-cols-2"><label>{$t('profile.startsAt')}<Input type="date" value={row.sanctionStartsAt ?? ''} oninput={event => updateRow(row.key, { sanctionStartsAt: event.currentTarget.value })} /></label><label>{$t('profile.endsAt')}<Input type="date" value={row.sanctionEndsAt ?? ''} oninput={event => updateRow(row.key, { sanctionEndsAt: event.currentTarget.value })} /></label><label class="sm:col-span-2">{$t('profile.sanctionNotes')}<Textarea value={row.sanctionNotes ?? ''} oninput={event => updateRow(row.key, { sanctionNotes: event.currentTarget.value })} /></label></div>{/if}

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
