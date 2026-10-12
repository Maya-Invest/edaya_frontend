<script lang="ts">
	import type { ModuleKey } from '$lib/navigation';
	import type { HierarchyGroup } from '$lib/types/school';
	import { page } from '$app/stores';
	import { resolveActiveClassId } from '$lib/academic/class-selection';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import AcademicYearSelector from '$lib/components/layout/AcademicYearSelector.svelte';
	import ClassSelector from '$lib/components/layout/ClassSelector.svelte';
	import SchoolSelector from '$lib/components/layout/SchoolSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import { t } from '$lib/i18n';
	import { Crown, ChevronDown } from '$lib/icons';
	import {
		DASHBOARD_HREF,
		MODULES,
		NAV_MODULE_ITEMS,
		getModuleFromPath,
		isDashboardPath,
		classItemHref,
		visibleClassNavItems,
	} from '$lib/navigation';
	import { filterNavItems, visibleNavModuleKeys } from '$lib/navigation/nav-permissions';
	import { shellContext } from '$lib/shell/context.svelte';
	import { getMessageCount } from '$lib/shell/message-count.svelte';
	import { cn } from '$lib/utils';

	const {
		hierarchy,
		studentCount,
		guardianCount,
		staffCount,
		teacherCount,
		forceExpanded = false,
	}: {
		hierarchy: HierarchyGroup[];
		studentCount: number;
		guardianCount: number;
		staffCount: number;
		teacherCount: number;
		forceExpanded?: boolean;
	} = $props();

	const messageCount = getMessageCount();
	const schoolBadges = $derived<Record<string, number>>({
		...(messageCount?.count != null ? { messages: messageCount.count } : {}),
		students: studentCount,
		guardians: guardianCount,
		staff: staffCount,
		teachers: teacherCount,
	});

	const activeModule = $derived(getModuleFromPath($page.url.pathname));
	const classId = $derived(resolveActiveClassId($page.params.classId, academicContext.classes));
	const grants = $derived(authSession.grants);
	let hoverExpanded = $state(false);
	let yearPopoverExpanded = $state(false);

	const collapsed = $derived(!forceExpanded && !shellContext.sidebarOpen);
	const showExpanded = $derived(!collapsed || hoverExpanded || yearPopoverExpanded);
	const expanded = $state<Partial<Record<Exclude<ModuleKey, 'dashboard'>, boolean>>>({});

	const visibleModules = $derived(
		MODULES.filter(mod => visibleNavModuleKeys(grants, { schoolId: authSession.schoolId ?? '' }).includes(mod.key)),
	);

	function isExpanded(key: Exclude<ModuleKey, 'dashboard'>): boolean {
		return key === activeModule || (expanded[key] ?? false);
	}

	function toggleModule(key: Exclude<ModuleKey, 'dashboard'>) {
		if (key === activeModule)
			return;
		expanded[key] = !isExpanded(key);
	}

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(`${href}/`);
	}

	function resolveItems(key: Exclude<ModuleKey, 'dashboard'>) {
		const ctx = { schoolId: authSession.schoolId ?? '' };
		const items = key === 'classes'
			? visibleClassNavItems(classId)
			: NAV_MODULE_ITEMS[key];
		const filtered = filterNavItems(items, grants, ctx);
		return filtered.map(it => ({
			key: it.key,
			label: $t(it.labelKey),
			icon: it.icon,
			href: key === 'classes' ? classItemHref(classId, it.href) : it.href,
			badge: key === 'school' ? schoolBadges[it.key] : it.badge,
		}));
	}

	function moduleHref(key: Exclude<ModuleKey, 'dashboard'>) {
		if (key === 'classes') {
			return classItemHref(classId, 'students');
		}
		return MODULES.find(mod => mod.key === key)?.href ?? DASHBOARD_HREF;
	}

	function onSidebarEnter() {
		if (collapsed) {
			hoverExpanded = true;
		}
	}

	function onSidebarLeave() {
		hoverExpanded = false;
	}
</script>

<aside
	id="app-sidebar"
	onmouseenter={onSidebarEnter}
	onmouseleave={onSidebarLeave}
	class={cn(
		'flex h-full flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out',
		forceExpanded ? 'w-full' : showExpanded ? 'w-64' : 'w-14',
		collapsed && (hoverExpanded || yearPopoverExpanded) && 'absolute left-0 top-0 z-50 shadow-panel',
	)}
>
	<div class={cn('flex flex-col border-b border-border', showExpanded ? 'items-start px-4 py-3' : 'items-center py-3')}>
		<BrandLogo variant={showExpanded ? 'horizontal' : 'symbol'} width={showExpanded ? 144 : 32} />
		<SchoolSelector collapsed={!showExpanded} />
		<AcademicYearSelector collapsed={!showExpanded} onOpenChange={open => yearPopoverExpanded = open && hoverExpanded} />
	</div>

	<nav class={cn('scrollbar-thin flex-1 overflow-y-auto py-4', showExpanded ? 'px-3' : 'px-2')}>
		<ul class="space-y-1">
			<li>
				<a
					href={DASHBOARD_HREF}
					title={$t('dashboard.nav')}
					class={cn(
						'group flex w-full items-center rounded-lg py-2 text-sm font-medium transition-colors',
						showExpanded ? 'gap-2.5 px-3' : 'justify-center px-2',
						isDashboardPath($page.url.pathname)
							? 'bg-primary/10 text-primary'
							: 'text-foreground/80 hover:bg-secondary',
					)}
				>
					<Crown
						class={cn(
							'h-4 w-4 shrink-0',
							isDashboardPath($page.url.pathname)
								? 'text-primary'
								: 'text-muted-foreground group-hover:text-foreground',
						)}
					/>
					{#if showExpanded}
						<span class="min-w-0 flex-1 truncate text-left">{$t('dashboard.nav')}</span>
					{/if}
				</a>
			</li>
			{#each visibleModules as mod (mod.key)}
				{@const open = isExpanded(mod.key)}
				{@const moduleActive = activeModule === mod.key}
				{@const ModIcon = mod.icon}
				<li>
					{#if showExpanded}
						<button
							type="button"
							aria-expanded={open}
							onclick={() => toggleModule(mod.key)}
							class={cn(
								'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
								moduleActive
									? 'bg-primary/10 text-primary'
									: 'text-foreground/80 hover:bg-secondary',
							)}
						>
							<ModIcon
								class={cn(
									'h-4 w-4 shrink-0',
									moduleActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
								)}
							/>
							<span class="min-w-0 flex-1 truncate text-left">{$t(mod.tKey)}</span>
							<ChevronDown
								class={cn(
									'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
									open && 'rotate-180',
								)}
							/>
						</button>

						{#if open}
							{#if mod.key === 'classes'}
								<div class="px-3 pb-1 pt-2">
									<ClassSelector {hierarchy} />
								</div>
							{/if}

							<ul class="mb-1 ml-3 space-y-0.5 border-l border-border pl-2">
								{#each resolveItems(mod.key) as it (it.key)}
									{@const active = isActive(it.href)}
									{@const Icon = it.icon}
									<li>
										<a
											href={it.href}
											class={cn(
												'group flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors',
												active
													? 'bg-primary text-primary-foreground'
													: 'text-foreground/75 hover:bg-secondary',
											)}
										>
											<span class="flex min-w-0 items-center gap-2">
												{#if Icon}
													<Icon
														class={cn(
															'h-3.5 w-3.5 shrink-0',
															active
																? 'text-primary-foreground/80'
																: 'text-muted-foreground group-hover:text-foreground',
														)}
													/>
												{:else}
													<span
														class={cn(
															'h-1.5 w-1.5 rounded-full',
															active ? 'bg-primary-foreground/60' : 'bg-border group-hover:bg-muted-foreground/30',
														)}
													></span>
												{/if}
												<span class="truncate">{it.label}</span>
											</span>
											{#if it.badge !== undefined}
												<span
													class={cn(
														'rounded-md px-1.5 py-0.5 font-sans tabular-nums text-[10px]',
														active
															? 'bg-primary-foreground/15 text-primary-foreground'
															: 'bg-secondary text-muted-foreground',
													)}
												>
													{it.badge}
												</span>
											{/if}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<a
							href={moduleHref(mod.key)}
							title={$t(mod.tKey)}
							class={cn(
								'group flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors',
								moduleActive
									? 'bg-primary/10 text-primary'
									: 'text-foreground/80 hover:bg-secondary',
							)}
						>
							<ModIcon
								class={cn(
									'h-4 w-4 shrink-0',
									moduleActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
								)}
							/>
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</aside>
