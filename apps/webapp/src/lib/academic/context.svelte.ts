import type { AppShellData } from '$lib/api/shell-data';
import type { AcademicPeriod, AcademicYear, ClassNode, GradeLevel, PeriodDefinition, School } from '$lib/types/school';
import { browser } from '$app/environment';
import { buildClassHierarchy } from '$lib/academic/hierarchy';

const STORAGE_YEAR = 'edaya:yearId';
const STORAGE_PERIOD = 'edaya:periodId';

function clone<T>(value: T): T {
	return structuredClone(value);
}

class AcademicContext {
	years = $state<AcademicYear[]>([]);
	periods = $state<AcademicPeriod[]>([]);
	classes = $state<ClassNode[]>([]);
	gradeLevels = $state<GradeLevel[]>([]);
	periodDefinitions = $state<PeriodDefinition[]>([]);
	schools = $state<School[]>([]);
	studentCount = $state(0);
	guardianCount = $state(0);
	staffCount = $state(0);
	shellReady = $state(false);
	yearId = $state('');
	periodId = $state('');

	constructor() {
		if (browser) {
			this.hydrateSelection();
		}
	}

	private hydrateSelection() {
		const storedYear = sessionStorage.getItem(STORAGE_YEAR);
		const storedPeriod = sessionStorage.getItem(STORAGE_PERIOD);
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
		sessionStorage.setItem(STORAGE_YEAR, this.yearId);
		sessionStorage.setItem(STORAGE_PERIOD, this.periodId);
	}

	hierarchy = $derived(buildClassHierarchy(this.classes, this.gradeLevels));

	publishedYears = $derived(this.years.filter(y => y.status === 'published'));

	publishedPeriods = $derived(this.periods.filter(p => p.status === 'published'));

	year = $derived(this.years.find(y => y.id === this.yearId) ?? this.years[0]);

	period = $derived(
		this.periods.find(p => p.id === this.periodId)
		?? this.periodsForYear.at(-1)
		?? this.periods[0],
	);

	periodsForYear = $derived(this.periods.filter(p => p.academicYearId === this.yearId));

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
		return this.periodDefinitions
			.filter(p => p.academicYearId === yearId)
			.sort((a, b) => a.order - b.order);
	}

	upsertPeriodDefinition(def: PeriodDefinition) {
		const index = this.periodDefinitions.findIndex(entry => entry.id === def.id);
		if (index === -1) {
			this.periodDefinitions = [...this.periodDefinitions, clone(def)];
			return;
		}
		const next = [...this.periodDefinitions];
		next[index] = clone(def);
		this.periodDefinitions = next;
	}

	removePeriodDefinition(id: string) {
		this.periodDefinitions = this.periodDefinitions.filter(entry => entry.id !== id);
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
		const academicYearId = this.yearId || this.years[0]?.id || '';
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
		this.periods = periods;
		this.classes = classes;

		if (years.length > 0 && !years.some(y => y.id === this.yearId)) {
			const activeYear = years.find(y => y.status === 'published') ?? years[0];
			if (activeYear) {
				this.yearId = activeYear.id;
			}
		}

		this.syncPeriodToYear();
		this.alignYearWithPeriodCatalog();
	}

	initFromShell(shell: AppShellData) {
		this.schools = clone(shell.schools);
		this.gradeLevels = clone(shell.gradeLevels);
		this.periodDefinitions = clone(shell.periodDefinitions);
		this.studentCount = shell.studentCount;
		this.guardianCount = shell.guardianCount;
		this.staffCount = shell.staffCount;
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
		if (browser) {
			sessionStorage.removeItem(STORAGE_YEAR);
			sessionStorage.removeItem(STORAGE_PERIOD);
		}
	}

	/** Clears loaded catalog data without wiping year/period selection (e.g. before shell reload). */
	clearShellCatalog() {
		this.years = [];
		this.periods = [];
		this.classes = [];
		this.gradeLevels = [];
		this.periodDefinitions = [];
		this.schools = [];
		this.studentCount = 0;
		this.guardianCount = 0;
		this.staffCount = 0;
		this.shellReady = false;
		if (browser && !this.yearId) {
			this.hydrateSelection();
		}
	}
}

export const academicContext = new AcademicContext();
