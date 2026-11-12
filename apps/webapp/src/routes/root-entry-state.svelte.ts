import { authClient } from '$lib/auth/client';
import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
import { appGoto, appPath } from '$lib/navigation/app-navigation';

export class RootEntryState {
	failed = $state(false);
	private generation = 0;

	enterApp = async () => {
		const generation = ++this.generation;
		this.failed = false;
		try {
			const { data, error } = await authClient.getSession();
			if (generation !== this.generation)
				return;
			if (error && error.status !== 401) {
				this.failed = true;
				return;
			}
			if (!data?.session) {
				await appGoto(appPath('/login'), { replaceState: true });
				return;
			}
			const completed = await completeAuthSignIn(undefined, { replaceState: true });
			if (generation === this.generation)
				this.failed = !completed;
		}
		catch {
			if (generation === this.generation)
				this.failed = true;
		}
	};

	dispose = () => { this.generation++; };
}
