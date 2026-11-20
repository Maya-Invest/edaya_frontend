import type { PrimaryStatus } from '$lib/auth/client';
import { authRequest } from '$lib/auth/client';
import { testOtpAvailable } from './capabilities';

/** Transient testing credentials; replacement, expiry and backgrounding invalidate reads. */
export class TestOtpPanelState {
	available = $state(false);
	otp = $state('');
	loading = $state(false);
	failed = $state(false);
	copied = $state(false);
	visible = $state(true);
	private generation = 0;
	private currentChallenge: string | undefined;

	constructor(
		private readonly primary: () => PrimaryStatus | null,
		private readonly busy: () => boolean,
		private readonly now: () => number,
	) {}

	get pending() {
		const primary = this.primary();
		return primary?.lifecycle === 'pending' && primary.expiresAt > this.now();
	}

	clear = () => {
		this.generation++;
		this.otp = '';
		this.loading = false;
		this.failed = false;
		this.copied = false;
	};

	synchronize() {
		const challenge = this.primary()?.challenge;
		const usable = this.pending && !this.busy() && this.visible;
		if (challenge !== this.currentChallenge || !usable)
this.clear();
		this.currentChallenge = challenge;
	}

	mount() {
		this.visible = document.visibilityState === 'visible';
		let alive = true;
		void testOtpAvailable().then((value) => {
			if (alive)
this.available = value;
		});
		const hide = () => {
			this.visible = document.visibilityState === 'visible';
			this.clear();
		};
		document.addEventListener('visibilitychange', hide);
		window.addEventListener('pagehide', this.clear);
		return () => {
			alive = false;
			this.clear();
			document.removeEventListener('visibilitychange', hide);
			window.removeEventListener('pagehide', this.clear);
		};
	}

	async reveal() {
		const primary = this.primary();
		if (!primary || !this.pending || this.busy() || !this.visible || this.loading)
return;
		const challenge = primary.challenge;
		const version = ++this.generation;
		this.loading = true;
		this.failed = false;
		const { data } = await authRequest<{ challenge: string; otp: string; channel: string; expiresAt: number }>('testing/otp', { challenge });
		if (version !== this.generation || challenge !== this.primary()?.challenge || !this.pending || this.busy() || !this.visible)
return;
		this.loading = false;
		if (data?.challenge === challenge && data.expiresAt > this.now())
this.otp = data.otp;
		else this.failed = true;
	}

	async copy() {
		const version = this.generation;
		try {
			await navigator.clipboard.writeText(this.otp);
			if (version === this.generation)
this.copied = true;
		}
		catch {
			if (version === this.generation)
this.failed = true;
		}
	}
}
