<script lang="ts">
	import type { Student, StudentEnrollmentHistoryItem } from '$lib/types/school';
	import Label from '$lib/components/ui/label/label.svelte';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { t } from '$lib/i18n';
	import { GraduationCap } from '$lib/icons';
	import { getStudentsPageState } from '../students-page.svelte';

	const { s }: { s: Student } = $props();

	const studentsPage = getStudentsPageState();
	const enrollments = $derived(studentsPage.enrollmentsFor(s.id));

	function statusLabel(status: StudentEnrollmentHistoryItem['status']): string {
		return status === 'active'
			? $t('student.enrollmentStatus.active')
			: $t('student.enrollmentStatus.closed');
	}

	function endReasonLabel(reason: StudentEnrollmentHistoryItem['endReason']): string | null {
		if (!reason) {
			return null;
		}
		return $t(`student.enrollmentEndReason.${reason}`);
	}
</script>

<div class="space-y-4">
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.tab.enrollments')}
		</Label>
		<div class="mt-2 space-y-2">
			{#if enrollments.length === 0}
				<DrawerEmptyState label={$t('student.noEnrollments')}>
					{#snippet icon()}
						<GraduationCap class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each enrollments as enrollment (enrollment.id)}
					<div class="rounded-xl border border-border bg-card p-3">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold">{enrollment.className}</p>
								<p class="mt-0.5 font-mono text-[10px] text-muted-foreground">
									{enrollment.academicYearId}
								</p>
							</div>
							<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								{statusLabel(enrollment.status)}
							</span>
						</div>
						<p class="mt-2 font-mono text-[10px] text-muted-foreground">
							{$t('student.enrolledAt', { date: fmtDateFr(enrollment.enrolledAt) })}
							{#if enrollment.endedAt}
								· {$t('student.endedAt', { date: fmtDateFr(enrollment.endedAt) })}
							{/if}
						</p>
						{#if endReasonLabel(enrollment.endReason)}
							<p class="mt-1 text-xs text-muted-foreground">
								{endReasonLabel(enrollment.endReason)}
							</p>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
