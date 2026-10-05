import type { AuthFailure, AuthOutcome, OtpStart, PrimaryStatus } from '$lib/auth/client';
import { authClient } from '$lib/auth/client';
import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
import { contactError, detectIdentifier } from '$lib/auth/detect-identifier';
import { t } from '$lib/i18n';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';

/**
 Smart workflow-owned credentials;
only completed sessions are persisted.
 */
export function completePasswordlessSignIn() {
	return completeAuthSignIn('');
}

export class PasswordlessPanelState {
	async submit(input: { email: string; locale: 'fr' | 'en'; recoveryEligible: boolean; enroll: boolean; link: boolean; onComplete: () => Promise<unknown> }) {
		if (this.state === 'form' && !input.enroll) {
			const identifier = detectIdentifier(input.email);
			const error = contactError(identifier, this.phoneAvailable);
			if (error || !identifier) {
				this.error = get(t)(error ?? 'auth.invalidContact');
				return;
			}
			await this.begin({ ...identifier, locale: input.locale, recoveryEligible: input.recoveryEligible }, input.link, input.onComplete);
			return;
		}
		await this.run(() => {
			if (this.state === 'form')
return authClient.enroll();
			if (this.state === 'primary_required')
return authClient.verifyOtp(this.challenge, this.code);
			if (this.state === 'enrollment_required')
return authClient.confirmEnrollment(this.challenge, this.code);
			return this.recovery ? authClient.recover(this.challenge, this.code) : authClient.verifyTotp(this.challenge, this.code);
		}, input.onComplete);
	}

	state = $state<'form' | 'primary_required' | 'totp_required' | 'enrollment_required' | 'recovery_codes'>('form');
	challenge = $state('');
	code = $state('');
	secret = $state('');
	recovery = $state(false);
	recoveryCodes = $state<string[]>([]);
	busy = $state(false);
	error = $state('');
	phoneAvailable = $state(false);
	primary = $state<PrimaryStatus | null>(null);
	now = $state(Date.now());
	clockOffset = $state(0);
	retryRequest = $state<(() => ReturnType<typeof authClient.startOtp>) | null>(null);
	private polling = false;
	private pendingRequests = new SvelteMap<string, string>();
	private complete: (() => Promise<unknown>) | undefined;
	get secondsRemaining() {
 return Math.max(0, Math.ceil(((this.primary?.nextResendAt ?? 0) - this.now - this.clockOffset) / 1000));
}

	get canResend() {
 return this.primary?.actions.resend === true && this.secondsRemaining === 0 && !this.busy;
}

	get canSms() {
 return this.canResend && this.primary?.actions.sms === true;
}

	async loadMethods() {
		try {
			const { data } = await authClient.methods();
			this.phoneAvailable = data?.methods.some(method => method.kind === 'phone' && method.available === true) ?? false;
		}
 catch {
			this.phoneAvailable = false;
		}
	}

	private updatePrimary(data: PrimaryStatus) {
		this.primary = data;
		this.clockOffset = data.serverNow - Date.now();
		this.now = Date.now();
	}

	async poll() {
		if (this.polling || this.busy || this.state !== 'primary_required' || !this.challenge)
return;
		const challenge = this.challenge;
		this.polling = true;
		try {
			const { data } = await authClient.statusOtp(challenge);
			if (data && this.challenge === challenge && this.state === 'primary_required' && !this.busy)
this.updatePrimary(data);
		}
 finally {
 this.polling = false;
}
	}

	private async sendRequest(key: string, action: (requestId: string) => ReturnType<typeof authClient.startOtp>) {
		const requestId = this.pendingRequests.get(key) ?? crypto.randomUUID();
		this.pendingRequests.set(key, requestId);
		const response = await action(requestId);
		if (response.error && (response.error.code === 'network_error' || (response.error.status ?? 0) >= 500)) {
 this.retryRequest = () => this.sendRequest(key, action);
}
		else {
 this.retryRequest = null;
this.pendingRequests.delete(key);
}
		return response;
	}

	async retry(onComplete: () => Promise<unknown>) {
		if (this.retryRequest)
await this.run(this.retryRequest, onComplete);
	}

	async begin(input: OtpStart & { recoveryEligible: boolean }, link: boolean, onComplete: () => Promise<unknown>) {
		await this.run(() => this.sendRequest(JSON.stringify([link, input]), requestId => link ? authClient.linkIdentifier({ ...input, requestId }) : authClient.startOtp({ ...input, requestId })), onComplete);
	}

	async resend(action: 'resend' | 'sms', onComplete: () => Promise<unknown>) {
		if (action === 'sms' ? !this.canSms : !this.canResend)
return;
		const challenge = this.challenge;
		await this.run(() => this.sendRequest(`${challenge}:${action}`, requestId => authClient.resendOtp(challenge, action, requestId)), onComplete);
	}

	async run(action: () => Promise<{ data: AuthOutcome | null; error: AuthFailure | null }>, onComplete: () => Promise<unknown>) {
		if (this.busy)
return;
		this.busy = true;
		this.error = '';
		try {
			const { data, error } = await action();
			if (error || !data) {
				this.error = error?.message ?? 'Authentication failed';
				if (error?.nextResendAt && this.primary)
this.updatePrimary({ ...this.primary, nextResendAt: error.nextResendAt, serverNow: error.serverNow ?? Date.now() });
				return;
			}
			await this.apply(data, onComplete);
		}
 finally {
 this.busy = false;
}
	}

	private async apply(data: AuthOutcome, onComplete: () => Promise<unknown>) {
		this.code = '';
		if (data.state === 'linked') {
 this.reset();
await onComplete();
return;
}
		if (data.state === 'complete') {
			this.challenge = '';
			this.secret = '';
			this.primary = null;
			if (data.recoveryCodes) {
 this.recoveryCodes = data.recoveryCodes;
this.state = 'recovery_codes';
this.complete = onComplete;
}
			else {
 await onComplete();
}
			return;
		}
		this.state = data.state;
		this.challenge = data.challenge;
		if (data.state === 'primary_required') {
 this.updatePrimary(data);
return;
}
		this.primary = null;
		if (data.state === 'enrollment_required') {
			if (data.secret) {
 this.secret = data.secret;
}
			else {
				const enrollment = await authClient.enroll(data.challenge);
				if (enrollment.error)
this.error = enrollment.error.message;
				else if (enrollment.data?.state === 'enrollment_required')
this.secret = enrollment.data.secret ?? '';
			}
		}
	}

	async finish() {
 this.recoveryCodes = [];
await this.complete?.();
}

	reset() {
		this.state = 'form';
this.challenge = '';
this.code = '';
this.secret = '';
this.primary = null;
		this.recovery = false;
this.error = '';
this.pendingRequests.clear();
this.retryRequest = null;
	}
}
