import type { AccountIdentifier, AuthFailure } from '$lib/auth/client';
import { authClient } from '$lib/auth/client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { get } from 'svelte/store';

export class SecurityPage {
	identifiers = $state<AccountIdentifier[]>([]);
	totpEnabled = $state(false);
	loaded = $state(false);
	needsAuthentication = $state(false);
	busy = $state(false);
	error = $state('');
	accountChanged = $state(false);
	action = $state<'link' | 'enroll' | null>(null);
	linkEmail = $state('');
	linkRecoveryEligible = $state(false);
	private generation = 0;
	private disposed = false;
	constructor(private readonly navigate: (href: string) => void = href => window.location.assign(href)) {
	}

	resetIdentity() {
		this.generation++;
		this.identifiers = [];
		this.loaded = false;
		this.busy = false;
		this.action = null;
		this.linkEmail = '';
		this.linkRecoveryEligible = false;
		this.needsAuthentication = false;
		this.error = '';
		this.accountChanged = false;
	}

	dispose() {
		this.generation++;
		this.disposed = true;
		this.identifiers = [];
		this.linkEmail = '';
		this.linkRecoveryEligible = false;
	}

	private isCurrent(generation: number, accountId: string | null) {
		return !this.disposed && generation === this.generation && accountId === authSession.authUserId;
	}

	private failure(error: AuthFailure) {
		if (error.code === 'reauthentication_required' || error.status === 401)
			this.needsAuthentication = true;
		else
			this.error = error.message || get(t)('account.settings.securityFailed');
	}

	async load(): Promise<boolean> {
		if (this.busy || this.disposed)
			return false;
		const generation = ++this.generation;
		const accountId = authSession.authUserId;
		this.busy = true;
		this.error = '';
		try {
			const [session, security] = await Promise.all([authClient.getSession(), authClient.security()]);
			if (!this.isCurrent(generation, accountId))
				return false;
			if (session.error || security.error) {
				this.failure(session.error ?? security.error!);
				return false;
			}
			if (!session.data || !security.data) {
				this.error = get(t)('account.settings.securityFailed');
				return false;
			}
			if (accountId && session.data.user.id !== accountId) {
				this.identifiers = [];
				this.loaded = false;
				this.action = null;
				this.needsAuthentication = false;
				this.accountChanged = true;
				this.error = get(t)('account.settings.accountChanged');
				return false;
			}
			this.identifiers = session.data.account.identifiers;
			this.totpEnabled = security.data.totpEnabled;
			this.needsAuthentication = false;
			this.loaded = true;
			if (this.action === 'enroll' && this.totpEnabled)
				this.action = null;
			return true;
		}
		catch {
			if (this.isCurrent(generation, accountId))
				this.error = get(t)('account.settings.securityFailed');
			return false;
		}
		finally {
			if (generation === this.generation && !this.disposed)
				this.busy = false;
		}
	}

	begin(action: 'link' | 'enroll') {
		if (this.busy || !this.loaded || this.needsAuthentication || (action === 'enroll' && this.totpEnabled))
			return;
		this.error = '';
		this.action = action;
	}

	requireAuthentication() {
		this.needsAuthentication = true;
		this.error = '';
	}

	cancelAction() {
		this.action = null;
		this.linkEmail = '';
		this.linkRecoveryEligible = false;
		this.needsAuthentication = false;
		this.error = '';
	}

	async completeAction() {
		this.action = null;
		this.linkEmail = '';
		this.linkRecoveryEligible = false;
		if (!await this.load() && !this.needsAuthentication)
			this.error = get(t)('mutation.savedRefreshFailed');
	}

	canUnlink(id: string) {
		return this.loaded && this.identifiers.some(row => row.id === id) && this.identifiers.some(row => row.id !== id && row.recoveryEligible);
	}

	async unlink(id: string): Promise<boolean> {
		if (this.busy || this.disposed || !this.canUnlink(id))
			return false;
		const generation = this.generation;
		const accountId = authSession.authUserId;
		this.busy = true;
		this.error = '';
		try {
			const result = await authClient.unlinkIdentifier(id);
			if (!this.isCurrent(generation, accountId))
				return false;
			if (result.error) {
				this.failure(result.error);
				return false;
			}
			this.navigate('/login');
			return true;
		}
		catch {
			if (this.isCurrent(generation, accountId))
				this.error = get(t)('mutation.failed');
			return false;
		}
		finally {
			if (this.isCurrent(generation, accountId))
				this.busy = false;
		}
	}

	async signOut() {
		if (this.busy || this.disposed)
			return;
		this.busy = true;
		try {
			const result = await authClient.signOut();
			if (result.error)
				this.error = result.error.message;
			else
				this.navigate('/login');
		}
		catch {
			this.error = get(t)('mutation.failed');
		}
		finally {
			if (!this.disposed)
				this.busy = false;
		}
	}
}
