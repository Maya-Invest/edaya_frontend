import type { ResolvedPathname } from '$app/types';
import type { PermissionCode } from '$lib/auth/types';
import type { LucideIcon } from '$lib/icons';
import type { NavItemDefinition } from '$lib/navigation/nav-catalog';
import { academicContext } from '$lib/academic/context.svelte';
import {
	Users,
	Shield,
	CalendarDays,
	Mail,
	Sparkle,
	AlertTriangle,
	GraduationCap,
	HeartHandshake,
	BookOpen,
	ClipboardCheck,
	FileSpreadsheet,
	Upload,
	BadgeDollarSign,
	Receipt,
	Wallet,
	Building2,
	LayoutGrid,
	Wallet as WalletIcon,
	Settings2,
	CalendarRange,
	CalendarClock,
	Layers,
	List,
} from '$lib/icons';
import { appPath } from '$lib/navigation/app-navigation';
import {
	CLASS_NAV_DEFS,
	CONFIG_NAV_DEFS,
	FINANCE_NAV_DEFS,
	SCHOOL_NAV_DEFS,

} from '$lib/navigation/nav-catalog';

export type { LucideIcon };

export const DASHBOARD_HREF = appPath('/(app)/dashboard');

export type ModuleKey = 'dashboard' | 'school' | 'classes' | 'finance' | 'configuration';

export const MODULES: {
	key: Exclude<ModuleKey, 'dashboard'>;
	tKey: string;
	icon: LucideIcon;
	href: ResolvedPathname;
}[] = [
	{ key: 'school', tKey: 'module.school', icon: Building2, href: appPath('/(app)/school/students/[[id]]') },
	// Placeholder only — AppRail/AppSidebar resolve the real class id at click time.
	{ key: 'classes', tKey: 'module.classes', icon: LayoutGrid, href: DASHBOARD_HREF },
	{ key: 'finance', tKey: 'module.finance', icon: WalletIcon, href: appPath('/(app)/finance/billing/[[id]]') },
	{ key: 'configuration', tKey: 'module.configuration', icon: Settings2, href: appPath('/(app)/configuration/subjects/[[id]]') },
];

export interface ContextItem {
	key: string;
	labelKey: string;
	icon?: LucideIcon;
	badge?: string | number;
	href: ResolvedPathname | string;
	/** Any-of: item visible when the user holds at least one listed permission. */
	permissions?: PermissionCode[];
}

type RouteId = Parameters<typeof appPath>[0];

const SCHOOL_ICONS: Record<string, LucideIcon> = {
	messages: Mail,
	students: Users,
	guardians: Shield,
	staff: GraduationCap,
	teachers: BookOpen,
	calendar: CalendarDays,
	activities: Sparkle,
	announcements: Mail,
	familyFeedback: HeartHandshake,
	events: AlertTriangle,
};

const CLASS_ICONS: Record<string, LucideIcon> = {
	students: Users,
	timetable: CalendarDays,
	teaching: BookOpen,
	evaluations: ClipboardCheck,
	attendance: ClipboardCheck,
	reportCards: FileSpreadsheet,
};

const FINANCE_ICONS: Record<string, LucideIcon> = {
	fees: BadgeDollarSign,
	billing: Receipt,
	payment: Wallet,
	reconciliation: FileSpreadsheet,
};

const CONFIG_ICONS: Record<string, LucideIcon> = {
	school: Building2,
	academic: CalendarRange,
	periodGrid: CalendarClock,
	gradeLevels: Layers,
	classGroups: Layers,
	subjects: BookOpen,
	other: List,
	reportCards: FileSpreadsheet,
	notificationTemplates: Mail,
	permissionProfiles: Shield,
	tools: Upload,
};

const SCHOOL_ROUTES: Record<string, RouteId> = {
	messages: '/(app)/school/messages/[[id]]',
	marksReview: '/(app)/school/corrections',
	students: '/(app)/school/students/[[id]]',
	guardians: '/(app)/school/guardians/[[id]]',
	staff: '/(app)/school/staff/[[id]]',
	teachers: '/(app)/school/teachers/[[id]]',
	calendar: '/(app)/school/calendar',
	activities: '/(app)/school/activities/[[id]]',
	announcements: '/(app)/school/announcements/[[id]]',
	familyFeedback: '/(app)/school/family-feedback/[[id]]',
	events: '/(app)/school/events/[[id]]',
};

const FINANCE_ROUTES: Record<string, RouteId> = {
	fees: '/(app)/finance/fees',
	billing: '/(app)/finance/billing/[[id]]',
	payment: '/(app)/finance/payment',
	reconciliation: '/(app)/finance/reconciliation',
};

const CONFIG_ROUTES: Record<string, RouteId> = {
	school: '/(app)/configuration/school',
	academic: '/(app)/configuration/academic',
	periodGrid: '/(app)/configuration/period-grid',
	gradeLevels: '/(app)/configuration/grade-levels/[[id]]',
	classGroups: '/(app)/configuration/classes/[[id]]',
	subjects: '/(app)/configuration/subjects/[[id]]',
	reportCards: '/(app)/configuration/report-cards/[[id]]',
	notificationTemplates: '/(app)/configuration/notifications',
	other: '/(app)/configuration/other',
	permissionProfiles: '/(app)/configuration/permission-profiles',
	tools: '/(app)/configuration/tools',
};

function buildSchoolItems(defs: NavItemDefinition[]): ContextItem[] {
	return defs.map(def => ({
		key: def.key,
		labelKey: def.labelKey,
		icon: SCHOOL_ICONS[def.key],
		href: appPath(SCHOOL_ROUTES[def.key]),
		permissions: def.permissions,
	}));
}

function buildClassItems(defs: NavItemDefinition[]): ContextItem[] {
	return defs.map(def => ({
		key: def.key,
		labelKey: def.labelKey,
		icon: CLASS_ICONS[def.key],
		href: def.href,
		permissions: def.permissions,
	}));
}

function buildFinanceItems(defs: NavItemDefinition[]): ContextItem[] {
	return defs.map(def => ({
		key: def.key,
		labelKey: def.labelKey,
		icon: FINANCE_ICONS[def.key],
		href: appPath(FINANCE_ROUTES[def.key]),
		permissions: def.permissions,
	}));
}

function buildConfigItems(defs: NavItemDefinition[]): ContextItem[] {
	return defs.map(def => ({
		key: def.key,
		labelKey: def.labelKey,
		icon: CONFIG_ICONS[def.key],
		href: appPath(CONFIG_ROUTES[def.key]),
		permissions: def.permissions,
	}));
}

export const SCHOOL_ITEMS = buildSchoolItems(SCHOOL_NAV_DEFS);
export const CLASS_ITEMS = buildClassItems(CLASS_NAV_DEFS);
export const FINANCE_ITEMS = buildFinanceItems(FINANCE_NAV_DEFS);
export const CONFIG_ITEMS = buildConfigItems(CONFIG_NAV_DEFS);

export function visibleClassNavItems(classId: string): ContextItem[] {
	const currentClass = academicContext.classes.find(entry => entry.id === classId);
	const defs = CLASS_NAV_DEFS.filter((def) => {
		if (def.key === 'attendance') {
			return currentClass?.attendanceMode === 'daily';
		}
		return true;
	});
	return buildClassItems(defs);
}

export const NAV_MODULE_ITEMS: Record<Exclude<ModuleKey, 'dashboard'>, ContextItem[]> = {
	school: SCHOOL_ITEMS,
	classes: CLASS_ITEMS,
	finance: FINANCE_ITEMS,
	configuration: CONFIG_ITEMS,
};

export function isDashboardPath(pathname: string): boolean {
	return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function getModuleFromPath(pathname: string): ModuleKey {
	if (isDashboardPath(pathname))
		return 'dashboard';
	if (pathname.startsWith('/classes'))
		return 'classes';
	if (pathname.startsWith('/finance'))
		return 'finance';
	if (pathname.startsWith('/configuration'))
		return 'configuration';
	return 'school';
}

export { classItemHref } from '$lib/navigation/app-navigation';
