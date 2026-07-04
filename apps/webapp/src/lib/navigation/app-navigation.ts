import type { ResolvedPathname, RouteId } from '$app/types';
import { goto as kitGoto } from '$app/navigation';
import { resolve } from '$app/paths';

type AppGotoOptions = NonNullable<Parameters<typeof kitGoto>[1]>;

export function appGoto(href: ResolvedPathname | string, opts?: AppGotoOptions) {
	// href is already resolved via appPath(); kitGoto receives a ResolvedPathname.
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- central navigation wrapper
	return kitGoto(href as ResolvedPathname, opts);
}

const resolvePath = resolve as (
	route: RouteId,
	params?: Record<string, string | undefined>,
) => ResolvedPathname;

export function appPath(route: RouteId): ResolvedPathname;
export function appPath(
	route: RouteId,
	params: Record<string, string | undefined>,
): ResolvedPathname;
export function appPath(
	route: RouteId,
	params?: Record<string, string | undefined>,
): ResolvedPathname {
	// Routes with optional [[param]] segments still require a params object at runtime.
	return resolvePath(route, params ?? {});
}

const CLASS_SEGMENTS: Record<string, RouteId> = {
	'students': '/(app)/classes/[classId]/students/[[id]]',
	'timetable': '/(app)/classes/[classId]/timetable/[[id]]',
	'teaching': '/(app)/classes/[classId]/teaching/[[id]]',
	'homework': '/(app)/classes/[classId]/homework/[[id]]',
	'evaluations': '/(app)/classes/[classId]/evaluations/[[id]]',
	'attendance': '/(app)/classes/[classId]/attendance/[[id]]',
	'report-cards': '/(app)/classes/[classId]/report-cards/[[id]]',
};

export function classItemHref(classId: string, segment: string): ResolvedPathname {
	const route = CLASS_SEGMENTS[segment] ?? '/(app)/classes/[classId]/students/[[id]]';
	return appPath(route, { classId });
}
