import type { AppShellData } from '$lib/api/shell-data';
import type { Lang } from '$lib/i18n/dictionaries';
import type { AcademicPeriod, AcademicYear, ClassNode, GradeLevel, PeriodDefinition, School } from '$lib/types/school';
import { browser } from '$app/environment';
import { buildClassHierarchy } from '$lib/academic/hierarchy';
import { lang } from '$lib/i18n';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';
import {
	localizeAcademicPeriod,
	localizeClassNode,
	localizeGradeLevel,
	localizePeriodDefinition,
} from '$lib/i18n/catalog-view';
import { get } from 'svelte/store';

const STORAGE_YEAR = 'edaya:yearId';
const STORAGE_PERIOD = 'edaya:periodId';

function clone<T>(value: T): T {
	return structuredClone(value);
}

class AcademicContext {
	years = $state<AcademicYear[]>([]);
	uiLang = $state<Lang>('fr');
	canonicalPeriods = $state<AcademicPeriod[]>([]);
	canonicalClasses = $state<ClassNode[]>([]);
	canonicalGradeLevels = $state<GradeLevel[]>([]);
	canonicalPeriodDefinitions = $state<PeriodDefinition[]>([]);
	schools = $state<School[]>([]);
	studentCount = $state(0);
	guardianCount = $state(0);
	staffCount = $state(0);
	teacherCount = $state(0);
	shellReady = $state(false);
	yearId = $state('');
	periodId = $state('');
	schoolScopeId = $state('');

	periods = $derived(this.canonicalPeriods.map(period => localizeAcademicPeriod(period, this.uiLang)));
	classes = $derived(this.canonicalClasses.map(node => localizeClassNode(node, this.uiLang)));
	gradeLevels = $derived(this.canonicalGradeLevels.map(level => localizeGradeLevel(level, this.uiLang)));
	periodDefinitions = $derived(
		this.canonicalPeriodDefinitions.map(definition => localizePeriodDefinition(definition, this.uiLang)),
	);

	constructor() {
		this.uiLang = get(lang);
		lang.subscribe((value) => {
			this.uiLang = value;
		});
		if (browser) {
			this.hydrateSelection();
		}
	}

	private hydrateSelection() {
		const storedYear = sessionStorage.getItem(this.yearStorageKey())
			?? (this.schoolScopeId ? sessionStorage.getItem(STORAGE_YEAR) : null);
		const storedPeriod = sessionStorage.getItem(this.periodStorageKey())
			?? (this.schoolScopeId ? sessionStorage.getItem(STORAGE_PERIOD) : null);
		if (storedYear) {
			this.yearId = storedYear;
		}
		if (storedPeriod) {
			this.periodId = storedPeriod;
		}
	}

	private persistSelection() {
		if (!browser) {
			return;
		}
		sessionStorage.setItem(this.yearStorageKey(), this.yearId);
		sessionStorage.setItem(this.periodStorageKey(), this.periodId);
	}

	private yearStorageKey(): string {
		return this.schoolScopeId ? `${STORAGE_YEAR}:${this.schoolScopeId}` : STORAGE_YEAR;
	}

	private periodStorageKey(): string {
		return this.schoolScopeId ? `${STORAGE_PERIOD}:${this.schoolScopeId}` : STORAGE_PERIOD;
	}

	setSchoolScope(schoolId: string) {
		if (!schoolId || this.schoolScopeId === schoolId) {
			return;
		}
		this.schoolScopeId = schoolId;
		this.yearId = '';
		this.periodId = '';
		if (browser) {
			this.hydrateSelection();
		}
	}

	hierarchy = $derived(buildClassHierarchy(this.classes, this.gradeLevels));

	publishedYears = $derived(this.years.filter(y => y.status === 'published'));

	publishedPeriods = $derived(this.periods.filter(p => p.status === 'published'));

	year = $derived(this.years.find(y => y.id === this.yearId) ?? this.years[0]);

	periodsForYear = $derived(this.periods.filter(p => p.academicYearId === this.yearId));

	period = $derived(
		this.periods.find(p => p.id === this.periodId)
		?? this.periodsForYear.at(-1)
		?? this.periods[0],
	);

	publishedPeriodsForYear = $derived(
		this.publishedPeriods.filter(p => p.academicYearId === this.yearId),
	);

	gradeLevelById(id: string): GradeLevel | undefined {
		return this.gradeLevels.find(g => g.id === id);
	}

	periodDefinitionById(id: string): PeriodDefinition | undefined {
		return this.periodDefinitions.find(p => p.id === id);
	}

	periodDefinitionsForYear(yearId: string): PeriodDefinition[] {
		const dayOrder: Record<PeriodDefinition['dayOfWeek'], number> = {
			monday: 0,
			tuesday: 1,
			wednesday: 2,
			thursday: 3,
			friday: 4,
			saturday: 5,
			sunday: 6,
		};
		return this.periodDefinitions
			.filter(p => p.academicYearId === yearId)
			.sort((a, b) => {
				const byDay = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
				return byDay !== 0 ? byDay : a.order - b.order;
			});
	}

	upsertPeriodDefinition(def: PeriodDefinition) {
		const canonical = { ...clone(def), label: toCanonicalCatalogText(def.label) };
		const index = this.canonicalPeriodDefinitions.findIndex(entry => entry.id === canonical.id);
		if (index === -1) {
			this.canonicalPeriodDefinitions = [...this.canonicalPeriodDefinitions, canonical];
			return;
		}
		const next = [...this.canonicalPeriodDefinitions];
		next[index] = canonical;
		this.canonicalPeriodDefinitions = next;
	}

	removePeriodDefinition(id: string) {
		this.canonicalPeriodDefinitions = this.canonicalPeriodDefinitions.filter(entry => entry.id !== id);
	}

	setYear(id: string) {
		this.yearId = id;
		this.syncPeriodToYear();
		this.persistSelection();
	}

	setPeriod(id: string) {
		this.periodId = id;
		this.persistSelection();
	}

	/** Year/period chosen during onboarding — survives empty shell bootstrap. */
	applyOnboardingSelection(yearId: string, periodId: string) {
		if (yearId) {
			this.yearId = yearId;
		}
		if (periodId) {
			this.periodId = periodId;
		}
		this.persistSelection();
	}

	resolveSelectionForApi(): { academicYearId: string; academicPeriodId: string } | null {
		const academicYearId = this.resolveAcademicYearIdForApi() ?? '';
		const periodsForYear = academicYearId
			? this.periods.filter(period => period.academicYearId === academicYearId)
			: this.periods;
		const published = periodsForYear.filter(period => period.status === 'published');
		const academicPeriodId = this.periodId
			|| published.at(-1)?.id
			|| periodsForYear.at(-1)?.id
			|| this.periods.at(-1)?.id
			|| '';
		if (!academicYearId || !academicPeriodId) {
			return null;
		}
		return { academicYearId, academicPeriodId };
	}

	/** Year id for structure mutations — ignores stale sessionStorage from another school. */
	resolveAcademicYearIdForApi(): string | null {
		const knownYearIds = new Set(this.years.map(year => year.id));
		if (this.yearId && knownYearIds.has(this.yearId)) {
			return this.yearId;
		}
		const published = this.years.find(year => year.status === 'published');
		return published?.id ?? this.years[0]?.id ?? null;
	}

	private syncPeriodToYear() {
		const options = this.publishedPeriodsForYear.length > 0
			? this.publishedPeriodsForYear
			: this.periodsForYear;
		if (options.length === 0) {
			return;
		}
		if (!options.some(p => p.id === this.periodId)) {
			this.periodId = options[options.length - 1]!.id;
			this.persistSelection();
		}
	}

	private alignYearWithPeriodCatalog() {
		if (this.periodsForYear.length > 0 || this.periods.length === 0) {
			return;
		}
		const yearIdFromPeriod = this.periods.find(p => p.academicYearId)?.academicYearId;
		if (yearIdFromPeriod && yearIdFromPeriod !== this.yearId) {
			this.yearId = yearIdFromPeriod;
			this.syncPeriodToYear();
			this.persistSelection();
		}
	}

	init(years: AcademicYear[], periods: AcademicPeriod[], classes: ClassNode[]) {
		this.years = years;
		this.canonicalPeriods = periods;
		this.canonicalClasses = classes;

		if (years.length > 0 && !years.some(y => y.id === this.yearId)) {
			const activeYear = years.find(y => y.status === 'published') ?? years[0];
			if (activeYear) {
				this.setYear(activeYear.id);
			}
		}
		else {
			this.syncPeriodToYear();
			this.alignYearWithPeriodCatalog();
		}
	}

	initFromShell(shell: AppShellData) {
		this.schools = clone(shell.schools);
		this.canonicalGradeLevels = clone(shell.gradeLevels);
		this.canonicalPeriodDefinitions = clone(shell.periodDefinitions);
		this.studentCount = shell.studentCount;
		this.guardianCount = shell.guardianCount;
		this.staffCount = shell.staffCount;
		this.teacherCount = shell.teacherCount;
		this.init(shell.academicYears, shell.academicPeriods, shell.classes);
		this.shellReady = true;
	}

	updateSchool(school: School) {
		const index = this.schools.findIndex(entry => entry.id === school.id);
		if (index === -1) {
			this.schools = [...this.schools, school];
			return;
		}
		const next = [...this.schools];
		next[index] = school;
		this.schools = next;
	}

	reset() {
		this.clearShellCatalog();
		this.yearId = '';
		this.periodId = '';
		this.schoolScopeId = '';
		if (browser) {
			sessionStorage.removeItem(STORAGE_YEAR);
			sessionStorage.removeItem(STORAGE_PERIOD);
		}
	}

	/** Clears loaded catalog data without wiping year/period selection (e.g. before shell reload). */
	clearShellCatalog() {
		this.years = [];
		this.canonicalPeriods = [];
		this.canonicalClasses = [];
		this.canonicalGradeLevels = [];
		this.canonicalPeriodDefinitions = [];
		this.schools = [];
		this.studentCount = 0;
		this.guardianCount = 0;
		this.staffCount = 0;
		this.teacherCount = 0;
		this.shellReady = false;
		if (browser && !this.yearId) {
			this.hydrateSelection();
		}
	}
}

export const academicContext = new AcademicContext();
