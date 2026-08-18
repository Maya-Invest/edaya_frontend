import type { ResolvedPathname } from '$app/types';

export const ACCOUNT_RETURN_PROFILE = 'profile';
export const ACCOUNT_PROFILE_MODAL = 'account-profile';

export function accountHrefWithReturn(href: ResolvedPathname): ResolvedPathname {
	const separator = href.includes('?') ? '&' : '?';
	return `${href}${separator}return=${ACCOUNT_RETURN_PROFILE}` as ResolvedPathname;
}
