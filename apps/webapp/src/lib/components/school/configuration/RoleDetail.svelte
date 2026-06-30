<script lang="ts">
	import type { Crud } from '$lib/api/access-roles-data';
	import type { StaffRole } from '$lib/types/school';
	import { emptyCrudMatrix, PERMISSION_CATALOG } from '$lib/api/access-roles-data';
	import { updateRolePermissionMutation } from '$lib/api/mutations/access-roles.mutations';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { ShieldCheck, Crown, GraduationCap, HeartHandshake } from '$lib/icons';
	import { ROLE_LABEL_FR } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import {
		SCOPE_LABEL,
		SCOPE_TONE,
		ROLE_TINT,
		CRUD_KEYS,
		CRUD_LABEL,
		CRUD_TONE,
	} from '../shared/drawer-constants.ts';

	const { role }: { role: StaffRole } = $props();

	const staff = $derived(detailDataContext.staff);
	const liveCrudMatrix = $derived(
		detailDataContext.roleCrudMatrix[role] ?? emptyCrudMatrix(),
	);

	let optimisticMatrix = $state<Record<string, Record<Crud, boolean>> | null>(null);
	let toggleBusy = $state(false);

	const perms = $derived(optimisticMatrix ?? liveCrudMatrix);

	const ROLE_ICON = {
		owner: Crown,
		directeur: Crown,
		prof_principal: ShieldCheck,
		professeur: GraduationCap,
		educateur: HeartHandshake,
	} as const;

	const members = $derived(staff.filter(s => s.role === role));
	const Icon = $derived(ROLE_ICON[role]);

	const grouped = $derived.by(() => {
		const acc: Record<string, typeof PERMISSION_CATALOG> = {};
		PERMISSION_CATALOG.forEach((permission) => {
			(acc[permission.category] ||= []).push(permission);
		});
		return acc;
	});

	async function toggle(permKey: string, op: Crud) {
		if (toggleBusy)
			return;

		const previous = perms;
		const enabled = !previous[permKey][op];
		const nextMatrix = {
			...previous,
			[permKey]: { ...previous[permKey], [op]: enabled },
		};
		const catalogEntry = PERMISSION_CATALOG.find(entry => entry.key === permKey);

		optimisticMatrix = nextMatrix;
		toggleBusy = true;
		const ok = await updateRolePermissionMutation({
			role,
			matrix: nextMatrix,
			successMessage: get(t)('roles.permissionUpdated', {
				permission: catalogEntry?.label ?? permKey,
				op: CRUD_LABEL[op],
			}),
		});
		toggleBusy = false;

		if (ok) {
			optimisticMatrix = null;
		}
		else {
			optimisticMatrix = previous;
		}
	}
</script>

<div class="space-y-6">
	<div class={cn('rounded-2xl border border-border p-5', ROLE_TINT[role])}>
		<div class="flex items-center gap-3">
			<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-card/60 backdrop-blur">
				<Icon class="h-5 w-5" />
			</span>
			<div>
				<div class="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">Rôle</div>
				<div class="font-display text-xl font-semibold tracking-tight">{ROLE_LABEL_FR[role]}</div>
				<div class="text-xs opacity-80">
					{members.length} membre{members.length > 1 ? 's' : ''}
				</div>
			</div>
		</div>
	</div>

	<div>
		<div class="mb-3 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<ShieldCheck class="h-4 w-4 text-muted-foreground" />
				<h3 class="font-display text-base font-semibold">Permissions CRUD</h3>
			</div>
			<div class="flex items-center gap-1.5">
				{#each CRUD_KEYS as k (k)}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
					>
						<span class="font-semibold">{k}</span>
						{CRUD_LABEL[k]}
					</span>
				{/each}
			</div>
		</div>
		<div class="space-y-4">
			{#each Object.entries(grouped) as [cat, rows] (cat)}
				<div class="overflow-hidden rounded-xl border border-border bg-card">
					<div
						class="bg-secondary/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
					>
						{cat}
					</div>
					<ul class="divide-y divide-border/60">
						{#each rows as p (p.key)}
							{@const note = p.scopedNotes?.[role]}
							{@const current = perms[p.key]}
							<li class="flex items-start justify-between gap-3 px-4 py-3">
								<div class="min-w-0 flex-1">
									<div class="text-sm font-medium">{p.label}</div>
									<div class="text-xs text-muted-foreground">{p.description}</div>
									<div class="mt-2 flex flex-wrap items-center gap-1.5">
										<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
											Portée
										</span>
										{#each p.scopes as s (s)}
											<span
												class={cn(
													'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
													SCOPE_TONE[s],
												)}
											>
												{SCOPE_LABEL[s]}
											</span>
										{/each}
									</div>
									{#if note}
										<div class="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
											{note}
										</div>
									{/if}
								</div>
								<PermissionGate
									permission="ACCESS_CONTROL_CONFIGURE"
									mode="disable"
									tooltip={$t('roles.permissionConfigure')}
								>
									{#snippet children({ disabled, title })}
										<div class="flex shrink-0 items-center gap-1">
											{#each CRUD_KEYS as op (op)}
												{@const on = current[op]}
												<button
													type="button"
													data-on={on}
													disabled={disabled || toggleBusy}
													title={title ?? `${CRUD_LABEL[op]}${on ? ' · activé' : ' · désactivé'}`}
													onclick={() => toggle(p.key, op)}
													class={cn(
														'flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/40 font-mono text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50',
														on && CRUD_TONE[op],
													)}
												>
													{op}
												</button>
											{/each}
										</div>
									{/snippet}
								</PermissionGate>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</div>
</div>
