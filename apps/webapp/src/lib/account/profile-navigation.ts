import { appendModal } from '$lib/modal/modal-url';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import {
	ACCOUNT_PROFILE_MODAL,
	ACCOUNT_RETURN_PROFILE,
} from './profile-url';

export {
	ACCOUNT_PROFILE_MODAL,
	ACCOUNT_RETURN_PROFILE,
	accountHrefWithReturn,
} from './profile-url';

export async function returnToProfileModalIfRequested(url: URL): Promise<boolean> {
	if (url.searchParams.get('return') !== ACCOUNT_RETURN_PROFILE) {
		return false;
	}
	await appGoto(
		appendModal(appPath('/(app)/dashboard'), ACCOUNT_PROFILE_MODAL),
		{ replaceState: true },
	);
	return true;
}
