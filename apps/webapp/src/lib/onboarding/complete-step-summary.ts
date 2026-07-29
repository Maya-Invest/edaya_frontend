import type { OnboardingStaffInviteProfile } from '$lib/onboarding/staff-invite-profiles';
import type { CatalogSubject, StructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
import type { StructureModel } from '$lib/onboarding/structure-templates';
import type { OnboardingDraft, OnboardingStaffInviteRole } from '$lib/onboarding/types';
import {
	ONBOARDING_STAFF_INVITE_PROFILES,

} from '$lib/onboarding/staff-invite-profiles';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';
import {
	getCatalogGradeLevel,
	previewClassNamesFromCatalog,

} from '$lib/onboarding/structure-template-catalog';

const MATTER_PREVIEW_COUNT = 2;
const MATTER_TRUNCATE_AT = 40;

export interface CompleteSummaryLevelRow {
	gradeLevelId: string;
	code: string;
	model: StructureModel;
	classCount: number;
	classNames: string[];
	subjects: CatalogSubject[];
}

export interface CompleteSummaryStaffInviteRow {
	email: string;
	role: OnboardingStaffInviteRole;
	roleLabelKey: OnboardingStaffInviteProfile['labelKey'];
}

export interface MatterPreview {
	preview: string[];
	more: number;
}

export interface CompleteStepSummary {
	schoolLine: string;
	academicYearLabel: string;
	academicYearRange: string;
	periodTypeLabelKey: 'onboarding.periodType.trimester' | 'onboarding.periodType.semester';
	periods: Array<{ label: string; start: string; end: string }>;
	levels: CompleteSummaryLevelRow[];
	staffInvites: CompleteSummaryStaffInviteRow[];
	levelCount: number;
	classCount: number;
	subjectCount: number;
	inviteCount: number;
}

function roleLabelKey(role: OnboardingStaffInviteRole): OnboardingStaffInviteProfile['labelKey'] {
	const profile = ONBOARDING_STAFF_INVITE_PROFILES.find(entry => entry.value === role);
	return profile?.labelKey ?? 'onboarding.staff.roleSecretary';
}

function buildSchoolLine(school: OnboardingDraft['school']): string {
	return [school.name, school.city, school.country]
		.map(part => part.trim())
		.filter(Boolean)
		.join(' · ');
}

function buildAcademicYearRange(school: OnboardingDraft['school']): string {
	const start = school.academicYearStart.trim();
	const end = school.academicYearEnd.trim();
	return start && end ? `${start} → ${end}` : '';
}

function resolvePeriodTypeLabelKey(
	periodType: OnboardingDraft['school']['periodType'],
): CompleteStepSummary['periodTypeLabelKey'] {
	return periodType === 'semester'
		? 'onboarding.periodType.semester'
		: 'onboarding.periodType.trimester';
}

function buildPeriodRows(
	periods: OnboardingDraft['school']['periods'],
): CompleteStepSummary['periods'] {
	return periods.map(period => ({
		label: period.label.trim() || '—',
		start: period.start.trim(),
		end: period.end.trim(),
	}));
}

function truncateMatter(value: string, max = MATTER_TRUNCATE_AT): string {
	const trimmed = value.trim();
	if (trimmed.length <= max) {
		return trimmed;
	}
	return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function previewMatters(
	matters: readonly string[],
	limit = MATTER_PREVIEW_COUNT,
): MatterPreview {
	const cleaned = matters.map(entry => entry.trim()).filter(Boolean);
	const preview = cleaned.slice(0, limit).map(entry => truncateMatter(entry));
	return {
		preview,
		more: Math.max(0, cleaned.length - preview.length),
	};
}

export function buildCompleteStepSummary(
	draft: Pick<OnboardingDraft, 'school' | 'structure' | 'staffInvites'>,
	catalog: StructureTemplateCatalog | null,
): CompleteStepSummary {
	const configuredLevels = draft.structure.levels.filter(level => level.classCount >= 1);
	const levels: CompleteSummaryLevelRow[] = [];
	const subjectCodes = new Set<string>();
	let classCount = 0;

	for (const level of configuredLevels) {
		const catalogLevel = catalog ? getCatalogGradeLevel(catalog, level.gradeLevelId) : undefined;
		const classNames = catalogLevel
			? previewClassNamesFromCatalog(catalogLevel, level.classCount)
			: Array.from({ length: level.classCount }, (_, index) => `${level.gradeLevelId} ${index + 1}`);
		const subjects = catalog
			? [...(catalog.subjectsByGradeLevelId.get(level.gradeLevelId) ?? [])]
			: [];

		for (const subject of subjects) {
			subjectCodes.add(subject.code);
		}
		classCount += classNames.length;

		levels.push({
			gradeLevelId: level.gradeLevelId,
			code: catalogLevel?.code ?? level.gradeLevelId,
			model: catalogLevel?.model ?? (level.gradeLevelId.includes('lycee') ? 'lycee' : 'college'),
			classCount: level.classCount,
			classNames,
			subjects,
		});
	}

	const staffInvites: CompleteSummaryStaffInviteRow[] = staffInvitesForSubmit(draft.staffInvites).map(
		invite => ({
			email: invite.email,
			role: invite.role,
			roleLabelKey: roleLabelKey(invite.role),
		}),
	);

	const school = draft.school;

	return {
		schoolLine: buildSchoolLine(school),
		academicYearLabel: school.academicYearLabel.trim(),
		academicYearRange: buildAcademicYearRange(school),
		periodTypeLabelKey: resolvePeriodTypeLabelKey(school.periodType),
		periods: buildPeriodRows(school.periods),
		levels,
		staffInvites,
		levelCount: levels.length,
		classCount,
		subjectCount: subjectCodes.size,
		inviteCount: staffInvites.length,
	};
}
