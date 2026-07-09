<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ClipboardCheck, ChevronRight } from '$lib/icons';
	import { appPath } from '$lib/navigation/app-navigation';
	import { queryClient } from '$lib/queries/client';
	import {
		homeroomDailyClassesForStaff,
		resolveHomeroomAttendanceNudges,
	} from '$lib/school/homeroom-attendance-nudge';
	import { loadHomeroomAttendanceByClass } from '$lib/school/homeroom-attendance-nudge-data';

	const staffId = $derived(authSession.user?.id ?? authSession.userId ?? '');
	const todayIso = $derived(new Date().toISOString().slice(0, 10));

	const homeroomDailyClasses = $derived(
		academicContext.shellReady && staffId
			? homeroomDailyClassesForStaff(academicContext.classes, staffId)
			: [],
	);

	const fallbackStudentCounts = $derived(
		Object.fromEntries(academicContext.classes.map(cls => [cls.id, cls.studentCount])),
	);

	let attendanceByClass = $state(new Map());

	$effect(() => {
		const classes = homeroomDailyClasses;
		if (classes.length === 0) {
			attendanceByClass = new Map();
			return;
		}

		let cancelled = false;
		const classIds = classes.map(cls => cls.id);

		void loadHomeroomAttendanceByClass(queryClient(), classIds, fallbackStudentCounts).then((loaded) => {
			if (cancelled) {
				return;
			}
			attendanceByClass = loaded;
			for (const classId of classIds) {
				const context = loaded.get(classId);
				if (context) {
					detailDataContext.seedAttendanceDays(context.days, { classId });
				}
			}
		});

		return () => {
			cancelled = true;
		};
	});

	const unmarkedClasses = $derived(
		staffId
			? resolveHomeroomAttendanceNudges({
				staffId,
				classes: academicContext.classes,
				attendanceByClass,
				todayIso,
				classAttendanceHref: (classId, dayId) => appPath(
					'/(app)/classes/[classId]/attendance/[[id]]',
					{ classId, id: dayId },
				),
			})
			: [],
	);
</script>

{#if unmarkedClasses.length > 0}
	<section
		data-testid="homeroom-attendance-nudge"
		class="rounded-2xl border border-highlight/30 bg-highlight-soft/40 p-4 shadow-soft"
	>
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
