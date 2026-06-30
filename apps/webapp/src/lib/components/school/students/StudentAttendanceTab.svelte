<script lang="ts">
	import type { AbsenceRecord, Student } from '$lib/types/school';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { Clock } from '$lib/icons';
	import { fmtDateFr } from '../shared/drawer-constants.ts';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import StudentAbsenceModal from './StudentAbsenceModal.svelte';

	const {
		s,
		absenceData,
		absenceRate,
	}: {
		s: Student;
		absenceData: AbsenceRecord[];
		absenceRate: number;
	} = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Présence</p>
			<p class="mt-1 font-display text-2xl">{s.attendance}%</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Absence</p>
			<p class="mt-1 font-display text-2xl">{absenceRate}%</p>
		</div>
		<div class="rounded-xl bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
			<p class="mt-1 font-display text-2xl">{absenceData.length}</p>
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			Évènements d'absence
		</Label>
		<div class="mt-2 space-y-2">
			{#if absenceData.length === 0}
				<DrawerEmptyState label="Aucune absence enregistrée.">
					{#snippet icon()}
						<Clock class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each absenceData as absence (absence.id)}
					<div class="rounded-xl border border-border bg-card p-3">
						<div class="flex items-center justify-between gap-2">
							<span
								class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
							>{absence.eventType}</span
							>
							<span class="font-mono text-[10px] text-muted-foreground">
								{fmtDateFr(absence.date)} · {absence.time}
							</span>
						</div>
						<p class="mt-1.5 text-sm font-medium">{absence.subject}</p>
						{#if absence.reason}
							<p class="mt-0.5 text-xs text-muted-foreground">Motif : {absence.reason}</p>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<PermissionGate
		permission="ATTENDANCE_RECORD"
		classId={s.classId}
		mode="disable"
		tooltip="Droit ATTENDANCE_RECORD requis."
	>
		{#snippet children({ disabled, title })}
			<StudentAbsenceModal {s} {disabled} {title} />
		{/snippet}
	</PermissionGate>
</div>
