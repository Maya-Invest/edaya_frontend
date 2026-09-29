import type { AuthOutcome } from './client';
import { authClient } from './client';

/** Per-component state: challenge credentials and codes are never stored in URLs or localStorage. */
export class PasswordlessFlow {
	state = $state<'form' | 'primary_required' | 'totp_required' | 'enrollment_required' | 'recovery_codes'>('form');
	challenge = $state('');
	code = $state('');
	secret = $state('');
	recovery = $state(false);
	recoveryCodes = $state<string[]>([]);
	busy = $state(false);
	error = $state('');
	private complete: (() => Promise<unknown>) | undefined;
	async run(action: () => ReturnType<typeof authClient.startOtp>, onComplete: () => Promise<unknown>) {
		if (this.busy)
return;
		this.busy = true;
this.error = '';
		try {
			const { data, error } = await action();
			if (error || !data) {
this.error = error?.message ?? 'Authentication failed';
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
		if (data.state === 'enrollment_required') {
			if (data.secret) {
 this.secret = data.secret;
}
			else {
				const enrollment = await authClient.enroll(data.challenge);
				if (enrollment.error)
this.error = enrollment.error.message;
				else if (enrollment.data && enrollment.data.state !== 'complete' && enrollment.data.state !== 'linked')
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
this.recovery = false;
this.error = '';
}
}
