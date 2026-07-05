<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ClipboardCheck, ChevronRight } from '$lib/icons';
	import { appPath } from '$lib/navigation/app-navigation';

	const me = $derived(authSession.user);

	const todayIso = $derived(new Date().toISOString().slice(0, 10));

	const unmarkedClasses = $derived.by(() => {
		if (!me) {
			return [] as { classId: string; className: string; href: ResolvedPathname }[];
		}

		return academicContext.classes.flatMap((cls) => {
			if (cls.attendanceMode !== 'daily' || cls.homeroomStaffId !== me.id) {
				return [];
			}

			const todayDay = detailDataContext.attendanceDaysForClass(cls.id).find(day => day.date === todayIso);
			if (!todayDay || todayDay.totalStudents === 0 || todayDay.recordedCount >= todayDay.totalStudents) {
				return [];
			}

			return [{
				classId: cls.id,
				className: cls.name,
				href: appPath('/(app)/classes/[classId]/attendance/[[id]]', {
					classId: cls.id,
					id: todayDay.id,
				}),
			}];
		});
	});
</script>

{#if unmarkedClasses.length > 0}
	<section class="rounded-2xl border border-highlight/30 bg-highlight-soft/40 p-4 shadow-soft">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex min-w-0 items-start gap-3">
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-highlight-soft text-highlight">
					<ClipboardCheck class="h-4 w-4" />
				</div>
				<div class="min-w-0">
					<p class="font-display text-sm font-semibold">
						{$t('dashboard.homeroomAttendanceNudge.title', { n: unmarkedClasses.length })}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{$t('dashboard.homeroomAttendanceNudge.description')}
					</p>
				</div>
			</div>
		</div>
		<ul class="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/80">
			{#each unmarkedClasses as row (row.classId)}
				<li>
					<a
						href={row.href}
						class="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:text-primary"
					>
						<span class="font-medium">{row.className}</span>
						<span class="inline-flex items-center gap-1 text-xs text-primary">
							{$t('dashboard.homeroomAttendanceNudge.action')}
							<ChevronRight class="h-3.5 w-3.5" />
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
