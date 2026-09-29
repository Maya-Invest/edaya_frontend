import type { AccountIdentifier } from '$lib/auth/client';
import { authClient } from '$lib/auth/client';
import { toast } from '$lib/toast.svelte';

export class SecurityPage {
	identifiers = $state<AccountIdentifier[]>([]);
	totpEnabled = $state(false);
	loaded = $state(false);
	needsAuthentication = $state(false);
	busy = $state(false);
	async load() {
		this.busy = true;
		try {
			const [session, security] = await Promise.all([authClient.getSession(), authClient.security()]);
			if (session.error || security.error) {
				this.needsAuthentication = true;
 toast.error(session.error?.message ?? security.error!.message);
return;
}
			this.identifiers = session.data?.account.identifiers ?? [];
			this.totpEnabled = security.data?.totpEnabled ?? false;
			this.needsAuthentication = false;
			this.loaded = true;
		}
 finally {
this.busy = false;
}
	}

	async unlink(id: string) {
		if (this.busy)
return;
		this.busy = true;
		const result = await authClient.unlinkIdentifier(id);
		if (result.error)
toast.error(result.error.message);
		else window.location.assign('/login');
		this.busy = false;
	}
}
