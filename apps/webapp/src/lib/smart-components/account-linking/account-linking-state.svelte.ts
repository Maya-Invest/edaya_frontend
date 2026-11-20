import type { InvitationHistoryEntry } from '$lib/api/invitation-data';
import type { components } from '$lib/api/schema';
import { readPendingInvitation } from '$lib/api/invitation-cache';
import { fetchPendingAccountInvitation, fetchAccountInvitationHistory } from '$lib/api/invitation-data';
import { resendAccountInvitationMutation, revokeAccountInvitationMutation, sendAccountInvitationMutation } from '$lib/api/mutations/invitation.mutations';
import { t } from '$lib/i18n';
import { hasPermission } from '$lib/permissions';
import { get } from 'svelte/store';

type Kind = components['schemas']['SendAccountInvitationCommand']['kind'];
interface Target {
    kind: Kind;
    targetId: string;
    subjectId: string | null;
    contactEmail: string;
    displayName: string;
}
/** Self-contained invitation workflow, scoped to the currently displayed actor. */
export class AccountLinkingState {
    busy = $state(false);
    history = $state<InvitationHistoryEntry[]>([]);
    historyLoading = $state(false);
    historyError = $state(false);
    pendingOverride = $state<string | null | undefined>(undefined);
    serverPendingId = $state<string | null>(null);
    lastInviteUrl = $state<string | null>(null);
    private generation = 0;
    constructor(private readonly target: () => Target) {
    }

    get pendingInvitationId() {
        const { kind, targetId } = this.target();
        return this.pendingOverride !== undefined ? this.pendingOverride : this.serverPendingId ?? readPendingInvitation(kind, targetId);
    }

    get linkStatus() {
        return this.target().subjectId ? 'linked' : this.pendingInvitationId ? 'pending' : 'not_linked';
    }

    async loadPending() {
        const generation = ++this.generation;
        const { kind, targetId, subjectId } = this.target();
        this.history = [];
        this.historyError = false;
        this.pendingOverride = undefined;
        this.serverPendingId = null;
        this.lastInviteUrl = null;
        this.busy = false;
        if (subjectId)
            return;
        const invitation = await fetchPendingAccountInvitation(kind, targetId);
        if (generation === this.generation)
            this.serverPendingId = invitation?.id ?? null;
    }

    async loadHistory() {
        if (!hasPermission('ACCESS_CONTROL_MANAGE'))
            return;
        const generation = this.generation;
        const { kind, targetId } = this.target();
        this.historyLoading = true;
        this.historyError = false;
        try {
            const entries = await fetchAccountInvitationHistory(kind, targetId);
            if (generation === this.generation)
                this.history = entries;
        }
        catch {
            if (generation === this.generation)
                this.historyError = true;
        }
        finally {
            if (generation === this.generation)
                this.historyLoading = false;
        }
    }

    cancelPending() {
        this.generation++;
    }

    private async mutate(kind: 'send' | 'resend' | 'revoke') {
        const target = this.target();
        const generation = this.generation;
        const invitationId = this.pendingInvitationId;
        if (this.busy || (kind !== 'send' && !invitationId))
            return;
        this.busy = true;
        try {
            const base = { kind: target.kind, targetId: target.targetId };
            const result = kind === 'send'
                ? await sendAccountInvitationMutation({ ...base, contactValue: target.contactEmail || undefined, successMessage: get(t)('invitation.sendSuccess', { name: target.displayName }) })
                : kind === 'resend'
                    ? await resendAccountInvitationMutation({ ...base, invitationId: invitationId!, successMessage: get(t)('invitation.resendSuccess', { name: target.displayName }) })
                    : await revokeAccountInvitationMutation({ ...base, invitationId: invitationId!, successMessage: get(t)('invitation.revokeSuccess', { name: target.displayName }) });
            if (generation !== this.generation || !result)
                return;
            if (typeof result === 'boolean') {
                this.pendingOverride = null;
                this.serverPendingId = null;
                this.lastInviteUrl = null;
            }
            else {
                this.pendingOverride = result.invitationId;
                this.serverPendingId = result.invitationId;
                this.lastInviteUrl = result.inviteUrl;
            }
        }
        finally {
            if (generation === this.generation)
                this.busy = false;
        }
    }

    send = () => this.mutate('send');
    resend = () => this.mutate('resend');
    revoke = () => this.mutate('revoke');
}
