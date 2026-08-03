import type { OnboardingDraft } from '$lib/onboarding/types';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';
import { toApiStructureTemplateIds } from '$lib/onboarding/structure-templates';

export function buildProvisionPayload(draft: OnboardingDraft) {
	const invites = staffInvitesForSubmit(draft.staffInvites);
	return {
		school: {
			name: draft.school.name.trim(),
			timeZone: draft.school.timezone.trim(),
			city: draft.school.city.trim(),
			country: draft.school.country.trim(),
			academicYearLabel: draft.school.academicYearLabel.trim(),
			academicYearStart: draft.school.academicYearStart,
			academicYearEnd: draft.school.academicYearEnd,
			periodType: draft.school.periodType,
			periods: draft.school.periods.map(period => ({
				label: period.label.trim(),
				start: period.start,
				end: period.end,
			})),
		},
		structure: {
			templates: toApiStructureTemplateIds(draft.structure.models),
			levels: draft.structure.levels
				.filter(level => level.classCount >= 1 && level.gradeLevelId.trim())
				.map(level => ({
					gradeLevelId: level.gradeLevelId,
					classCount: level.classCount,
					capacity: level.capacity,
				})),
		},
		...(invites.length > 0 ? { invites } : {}),
	};
}
