import type { CatalogSubject, DatasetCatalog, DatasetLevel, OnboardingDataset } from '$lib/onboarding/dataset-model';
import type { OnboardingStaffInviteProfile } from '$lib/onboarding/staff-invite-profiles';
import type { OnboardingDraft, OnboardingStaffInviteRole } from '$lib/onboarding/types';
import {
	previewClassNamesFromCatalog,
} from '$lib/onboarding/class-naming';
import {
	getCatalogGradeLevel,
} from '$lib/onboarding/dataset-model';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';
import {
	ONBOARDING_STAFF_INVITE_PROFILES,
} from '$lib/onboarding/staff-invite-profiles';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';

export interface CompleteSummaryLevelRow {
	gradeLevelId: string;
	code: string;
	templateId: string;
	classCount: number;
	classNames: string[];
	subjects: CatalogSubject[];
	modules: Array<{ code: string; name: string; subjects: CatalogSubject[] }>;
	grading?: { policy: DatasetLevel['gradingPolicy']; scale: OnboardingDataset['gradeScales'][number] };
}

export interface CompleteSummaryStaffInviteRow {
	email: string;
	role: OnboardingStaffInviteRole;
	roleLabelKey: OnboardingStaffInviteProfile['labelKey'];
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

export function buildCompleteStepSummary(
	draft: Pick<OnboardingDraft, 'school' | 'structure' | 'staffInvites'>,
	catalog: DatasetCatalog | null,
): CompleteStepSummary {
	const configuredLevels = draft.structure.levels.filter(level => level.classCount >= 1);
	const levels: CompleteSummaryLevelRow[] = [];
	let subjectCount = 0;
	let classCount = 0;

	for (const level of configuredLevels) {
		const catalogLevel = catalog ? getCatalogGradeLevel(catalog, level.gradeLevelId) : undefined;
		const classNames = catalogLevel
			? previewClassNamesFromCatalog(
					catalogLevel,
					level.classCount,
					level.classNamingMode ?? 'numerical',
				)
			: Array.from({ length: level.classCount }, (_, index) => `${level.gradeLevelId} ${index + 1}`);
		const subjects = catalog
			? [...(catalog.subjectsByGradeLevelId.get(level.gradeLevelId) ?? [])]
			: [];

		subjectCount += subjects.length;
		classCount += classNames.length;

		levels.push({
			gradeLevelId: level.gradeLevelId,
			code: catalogLevel?.code ?? level.gradeLevelId,
			templateId: catalogLevel?.templateId ?? '',
			classCount: level.classCount,
			classNames,
			subjects,
			modules: [...(catalogLevel?.reportModules ?? [])].sort((a, b) => a.order - b.order).map(module => ({ code: module.code, name: module.name, subjects: subjects.filter(row => row.reportModuleCode === module.code).sort((a, b) => a.reportOrder - b.reportOrder) })).concat(subjects.some(row => !row.reportModuleCode) ? [{ code: '__ungrouped', name: '', subjects: subjects.filter(row => !row.reportModuleCode).sort((a, b) => a.reportOrder - b.reportOrder) }] : []),
			grading: catalogLevel && catalog ? { policy: catalogLevel.gradingPolicy, scale: catalog.dataset.gradeScales.find(row => row.code === catalogLevel.gradingPolicy.gradeScaleCode)! } : undefined,
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
		academicYearLabel: academicYearLabelFromDates(school.academicYearStart, school.academicYearEnd),
		academicYearRange: buildAcademicYearRange(school),
		periodTypeLabelKey: resolvePeriodTypeLabelKey(school.periodType),
		periods: buildPeriodRows(school.periods),
		levels,
		staffInvites,
		levelCount: levels.length,
		classCount,
		subjectCount,
		inviteCount: staffInvites.length,
	};
}
