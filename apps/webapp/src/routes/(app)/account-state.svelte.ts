import { updateStaffProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';

const KEY = Symbol('account-state');

/** Shell-owned account actions shared by the mounted workspace. */
export class AccountState {
	async logout() {
		resetAppShellBootstrap();
		await authSession.logout();
		await appGoto(appPath('/login'), { replaceState: true });
	}

	performUpdateStaffProfilePhoto = (...args: Parameters<typeof updateStaffProfilePhotoMutation>) => updateStaffProfilePhotoMutation(...args);
}

export function setAccountState(state: AccountState) {
	setContext(KEY, state);
}
export function getAccountState(): AccountState {
	return getContext<AccountState>(KEY);
}
