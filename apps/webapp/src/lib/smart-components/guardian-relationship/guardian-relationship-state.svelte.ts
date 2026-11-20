import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export type GuardianRelationshipFields = Omit<components['schemas']['UpdateGuardianStudentLinkCommand'], 'guardianId' | 'studentId'>;
export type GuardianLink = components['schemas']['GuardianStudentLink'];
export function guardianRelationshipDraft(link?: GuardianLink): GuardianRelationshipFields {
    return { relationship: link?.relationship ?? 'parent', isPrimary: link?.isPrimary ?? false, isBillingContact: link?.isBillingContact ?? false, legalGuardian: link?.legalGuardian ?? false, canPickup: link?.canPickup ?? false, emergencyContactPriority: link?.emergencyContactPriority ?? null, receivesAcademicReports: link?.receivesAcademicReports ?? true, receivesAttendanceAlerts: link?.receivesAttendanceAlerts ?? true, contactRestrictions: link?.contactRestrictions ?? null, notes: link?.notes ?? null };
}
export class GuardianRelationshipState {
    busy = $state(false);
    current = $state<GuardianLink | undefined>();
    async save(guardianId: string, studentId: string, fields: GuardianRelationshipFields, existing?: GuardianLink) {
        this.busy = true;
        try {
            const client = getBrowserSchoolClient();
            const value = await runMutation(() => existing
                ? client.commands.updateGuardianStudentLink({ guardianId, studentId, ...fields })
                : client.commands.linkGuardianToStudent({ id: `gl-${guardianId}-${studentId}`, guardianId, studentId, ...fields }), { versionKeys: ['guardians', 'students'] });
            if (!value)
                return false;
            this.current = value;
            return true;
        }
        finally {
            this.busy = false;
        }
    }
}
