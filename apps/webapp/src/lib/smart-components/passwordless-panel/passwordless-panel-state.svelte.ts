import type { AuthFailure, AuthOutcome, AuthTerms, OtpStart, PrimaryStatus } from '$lib/auth/client';
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
  terms = $state<AuthTerms | null>(null);
  termsAccepted = $state(false);
  termsDialogOpen = $state(false);
  termsLoading = $state(false);
  termsLoadError = $state(false);
  private termsLocale: 'fr' | 'en' = 'fr';
  private termsRequest = 0;
  private identifier = '';

  get termsReady() {
    const loaded = !!this.terms && !this.termsLoading && !this.termsLoadError;
    return loaded && (!this.terms!.enforced || (!!this.terms!.document && this.termsAccepted));
  }

  setIdentity(value: string) {
    const identifier = value.trim().toLowerCase();
    if (identifier !== this.identifier) {
      if (this.registration || this.busy || this.retryRequest)
        this.reset();
      this.cooldownUntil = 0;
      this.identifier = identifier;
      this.termsAccepted = false;
    }
  }

  async loadTerms(locale: 'fr' | 'en') {
    const request = ++this.termsRequest;
    const previous = this.terms?.document;
    if (this.termsLocale !== locale)
      this.termsAccepted = false;
    this.termsLocale = locale;
    this.termsLoading = true;
    this.termsLoadError = false;
    try {
      const { data, error } = await authClient.terms(locale);
      if (request !== this.termsRequest)
        return;
      if (error || !data || typeof data.enforced !== 'boolean' || data.document === undefined || (data.enforced && !data.document) || (data.document && data.document.locale !== locale))
        throw new Error('terms_unavailable');
      if (previous?.version !== data.document?.version || previous?.documentHash !== data.document?.documentHash) {
        this.termsAccepted = false;
        this.termsDialogOpen = false;
      }
      this.terms = data;
    }
    catch {
      if (request === this.termsRequest) {
        this.terms = null;
        this.termsAccepted = false;
        this.termsLoadError = true;
      }
    }
    finally {
      if (request === this.termsRequest)
        this.termsLoading = false;
    }
  }

  async submit(input: { email: string; invitationToken?: string; locale: 'fr' | 'en'; recoveryEligible: boolean; enroll: boolean; link: boolean; onComplete: () => Promise<unknown> }) {
    if (this.state === 'registration_required') {
      const offer = this.registration;
      if (!offer?.eligible || !this.termsReady)
        return;
      if (offer.expiresAt <= this.now + this.clockOffset) {
        this.expireRegistration();
        return;
      }
      const document = this.terms?.document;
      const termsAcceptance = this.terms?.enforced && document
        ? { version: document.version, locale: document.locale, accepted: true as const }
        : undefined;
      await this.run(() => authClient.completeRegistration({ challenge: offer.challenge, proof: offer.proof, termsAcceptance }), input.onComplete);
      return;
    }
    if (this.state === 'form' && !input.enroll) {
      const identifier = detectIdentifier(input.email);
      const error = contactError(identifier, this.phoneAvailable);
      if (error || !identifier) {
        this.error = get(t)(error ?? 'auth.invalidContact');
        return;
      }
      if (!input.link) {
        this.setIdentity(input.email);
        if (!this.termsReady) {
          this.error = get(t)(this.termsLoadError ? 'auth.termsUnavailable' : 'auth.termsRequired');
          return;
        }
      }
      const document = this.terms?.document;
      const termsAcceptance = !input.link && this.terms?.enforced && document
        ? { version: document.version, locale: document.locale, accepted: true as const }
        : undefined;
      await this.begin({ ...identifier, ...(input.invitationToken && identifier.kind === 'email' && !input.link ? { invitationToken: input.invitationToken } : {}), locale: input.locale, recoveryEligible: input.recoveryEligible, ...(termsAcceptance ? { termsAcceptance } : {}) }, input.link, input.onComplete);
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

  registration = $state<Extract<AuthOutcome, { state: 'registration_required' }> | null>(null);
  cooldownUntil = $state(0);
  private generation = 0;

  expireRegistration() {
    this.reset();
    this.error = get(t)('auth.registrationExpired');
  }

  state = $state<'registration_required' | 'form' | 'primary_required' | 'totp_required' | 'enrollment_required' | 'recovery_codes'>('form');
  challenge = $state('');
  code = $state('');
  secret = $state('');
  recovery = $state(false);
  recoveryCodes = $state<string[]>([]);
  busy = $state(false);
  error = $state('');
  reauthenticationRequired = $state(false);
  phoneAvailable = $state(false);
  primary = $state<PrimaryStatus | null>(null);
  now = $state(Date.now());
  clockOffset = $state(0);
  retryRequest = $state<(() => ReturnType<typeof authClient.startOtp>) | null>(null);
  private polling = false;
  private pendingRequests = new SvelteMap<string, string>();
  private complete: (() => Promise<unknown>) | undefined;
  get secondsRemaining() {
    return Math.max(0, Math.ceil(((this.primary?.nextResendAt ?? this.cooldownUntil) - this.now - this.clockOffset) / 1000));
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
    const generation = this.generation;
    const response = await action(requestId);
    if (generation !== this.generation)
      return response;
    if (response.error && response.error.code !== 'delivery_unavailable' && (response.error.code === 'network_error' || (response.error.status ?? 0) >= 500)) {
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
    const generation = this.generation;
    this.busy = true;
    this.error = '';
    try {
      const { data, error } = await action();
      if (generation !== this.generation)
        return;
      if (error || !data) {
        if (error?.code === 'delivery_unavailable') {
          this.reset();
          this.cooldownUntil = error.nextResendAt ?? 0;
          this.clockOffset = (error.serverNow ?? Date.now()) - Date.now();
          this.now = Date.now();
          this.error = get(t)('auth.emailSendFailed');
          return;
        }
        if (this.registration) {
          if (error?.code === 'registration_expired') {
            this.expireRegistration();
            return;
          }
          if (error?.code === 'registration_unavailable') {
            this.registration.eligible = false;
            return;
          }
          if (error?.code === 'network_error' || (error?.status ?? 0) >= 500) {
            const { data: session } = await authClient.getSession();
            if (generation !== this.generation)
              return;
            const verifiedEmail = this.identifier;
            this.reset();
            if (session?.account.identifiers.some(id => id.kind === 'email' && id.value === verifiedEmail))
              await onComplete();
            else
              this.error = get(t)('auth.restartVerification');
            return;
          }
        }
        if (this.retryRequest) {
          this.error = get(t)('auth.sendUnconfirmed');
          return;
        }
        this.reauthenticationRequired = error?.code === 'reauthentication_required';
        this.error = error?.code?.startsWith('terms_')
          ? get(t)(error.code === 'terms_version_changed' ? 'auth.termsChanged' : error.code === 'terms_acceptance_required' ? 'auth.termsRequired' : 'auth.termsUnavailable')
          : error?.message ?? 'Authentication failed';
        if (error?.code === 'terms_version_changed' || error?.code === 'terms_acceptance_required') {
          this.termsAccepted = false;
          await this.loadTerms(this.termsLocale);
        }
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
    this.registration = data.state === 'registration_required' ? data : null;
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
    this.generation++;
    this.registration = null;
    this.cooldownUntil = 0;
    this.termsAccepted = false;
    this.termsDialogOpen = false;
    this.state = 'form';
    this.challenge = '';
    this.code = '';
    this.secret = '';
    this.primary = null;
    this.recovery = false;
    this.recoveryCodes = [];
    this.complete = undefined;
    this.error = '';
    this.reauthenticationRequired = false;
    this.pendingRequests.clear();
    this.retryRequest = null;
  }
}
