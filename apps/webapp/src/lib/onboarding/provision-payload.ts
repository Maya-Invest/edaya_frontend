import type { OnboardingDraft } from '$lib/onboarding/types';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';

export function buildProvisionPayload(draft: OnboardingDraft) {
	if (!draft.structure.dataset)
		throw new Error('ONBOARDING_DATASET_REQUIRED');
	const invites = staffInvitesForSubmit(draft.staffInvites);
	return {
		school: {
			name: draft.school.name.trim(),
			timeZone: draft.school.timezone.trim(),
			financeCurrency: draft.school.financeCurrency?.trim().toUpperCase(),
			city: draft.school.city.trim(),
			country: draft.school.country.trim(),
			academicYearLabel: academicYearLabelFromDates(
				draft.school.academicYearStart,
				draft.school.academicYearEnd,
			),
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
			dataset: draft.structure.dataset!,
			templates: [...draft.structure.templates],
			levels: draft.structure.levels
				.filter(level => level.classCount >= 1 && level.gradeLevelId.trim())
				.map(level => ({
					gradeLevelId: level.gradeLevelId,
					classCount: level.classCount,
					capacity: level.capacity,
					classNamingMode: level.classNamingMode ?? 'numerical',
				})),
		},
		...(invites.length > 0 ? { invites } : {}),
	};
}

/** A recovered committed request owns the review values, even if the local draft was edited after a lost response. */
export function restoreProvisionedDraft(draft: OnboardingDraft, payload: ReturnType<typeof buildProvisionPayload>): void {
	const school = payload.school;
	draft.school = {
		name: school.name,
		city: school.city,
		country: school.country,
		timezone: school.timeZone,
		financeCurrency: school.financeCurrency,
		academicYearLabel: school.academicYearLabel,
		academicYearStart: school.academicYearStart,
		academicYearEnd: school.academicYearEnd,
		periodType: school.periodType,
		periods: school.periods.map((period, index) => ({ ...period, id: draft.school.periods[index]?.id ?? crypto.randomUUID() })),
	};
	draft.structure = structuredClone(payload.structure);
	draft.staffInvites = (payload.invites ?? []).map(invite => ({ ...invite, id: draft.staffInvites.find(row => row.email === invite.email)?.id ?? crypto.randomUUID() }));
}
