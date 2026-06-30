import type { ResolvedPathname } from '$app/types';
import { appGoto, appPath } from '$lib/navigation/app-navigation';

export const ACCOUNT_RETURN_PROFILE = 'profile';
export const ACCOUNT_OPEN_PROFILE_PARAM = 'profile';

export function accountHrefWithReturn(href: ResolvedPathname): ResolvedPathname {
	const separator = href.includes('?') ? '&' : '?';
	return `${href}${separator}return=${ACCOUNT_RETURN_PROFILE}` as ResolvedPathname;
}

export async function returnToProfileModalIfRequested(url: URL): Promise<boolean> {
	if (url.searchParams.get('return') !== ACCOUNT_RETURN_PROFILE) {
		return false;
	}
	await appGoto(
		`${appPath('/(app)/dashboard')}?${ACCOUNT_OPEN_PROFILE_PARAM}=1` as ResolvedPathname,
		{ replaceState: true },
	);
	return true;
}
