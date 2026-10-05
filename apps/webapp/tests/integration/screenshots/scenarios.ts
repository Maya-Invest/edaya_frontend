import { getWebappFilesystemRoutes, inventoryRouteToMatrixPath, MODAL_SURFACES, normalizeRoutePattern } from '../../../scripts/qa-route-catalog';
import assert from 'node:assert/strict';
import surfaces from './surfaces.json';
import exclusions from './exclusions.json';
import type { BrowserScenarioContext } from '../support/browser-scenario';
import type { ScenarioDefinition, ScenarioStep } from '../support/scenario-registry';
import { openViewSurface, assertViewSurface, type ViewSurface } from '../support/view-workflow';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { loginSignupSteps } from '../onboarding/scenes/login-signup-ui';
import { happyPathSteps } from '../onboarding/scenes/happy-path';
import type { OnboardingCredentials } from '../onboarding/types';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../onboarding/support/capture';
import { modalMutationSteps, emptyModalMutation, type ModalMutationState } from '../setup/journey-context';
import { navigateSpaPage } from '../../../scripts/qa-harness-ui';
import { IMPORT_TYPE_TABS, TIMETABLE_SETUP_TABS } from '../../../src/routes/(app)/configuration/tools/lib/tools-workflow';

export const VISUAL_SURFACES = surfaces as ViewSurface[];
export const VISUAL_EXCLUSIONS = exclusions;

function entities(context: BrowserScenarioContext): MatrixEntities {
  assert(context.fixtures.entities, 'Demo fixture preflight has not completed');
  return context.fixtures.entities as MatrixEntities;
}

function authSteps(context: BrowserScenarioContext) {
  context.fixtures.authState ??= {};
  return loginSignupSteps<BrowserScenarioContext>(context.page, context.base, context.fixtures.authState as { email?: string; valid?: string });
}
function wizardSteps(context: BrowserScenarioContext) {
  context.fixtures.wizardState ??= {};
  context.fixtures.credentials ??= { email: uniqueOnboardingEmail(), password: uniqueOnboardingPassword(), name: 'Screenshot Owner',
    schoolName: 'Screenshot Demo School', city: 'Abidjan' } satisfies OnboardingCredentials;
  return happyPathSteps<BrowserScenarioContext>({ ...context, credentials: context.fixtures.credentials as OnboardingCredentials },
    context.fixtures.wizardState as { colleagueEmail?: string });
}

// Metadata is declared without creating browser sessions or fixture identities.
const authMetadata = [
  { id: 'form', title: 'Email sign-in', surface: '/login' },
  { id: 'otp', title: 'Email verification', surface: '/login?stage=verification' },
  { id: 'validation', title: 'Invalid verification code', surface: '/login?stage=verification' },
];
const authScenario: ScenarioDefinition<BrowserScenarioContext> = {
  id: 'login-signup-ui', feature: 'auth', steps: [
    ...authMetadata.map((metadata, index) => ({ id: metadata.id, run: async (context: BrowserScenarioContext) => authSteps(context)[index]!.run(context),
      checkpoint: { ...metadata, ready: async (context: BrowserScenarioContext) => authSteps(context)[index]!.checkpoint!.ready(context) } })),
    { id: 'complete-proof', run: async context => authSteps(context)[3]!.run(context) },
  ],
};
const wizardScenario: ScenarioDefinition<BrowserScenarioContext> = {
  id: 'happy-path', feature: 'onboarding', steps: [
    ...[1, 2, 3, 4].map((step, index) => ({ id: `step-${step}`, run: async (context: BrowserScenarioContext) => wizardSteps(context)[index]!.run(context),
      checkpoint: { id: `step-${step}`, title: `Onboarding · step ${step}`, surface: `/onboarding?step=${step}`,
        ready: async (context: BrowserScenarioContext) => wizardSteps(context)[index]!.checkpoint!.ready(context) } })),
    { id: 'provision-and-verify', run: async context => wizardSteps(context)[4]!.run(context) },
  ],
};

function pageScenario(surface: ViewSurface): ScenarioDefinition<BrowserScenarioContext> {
  if (surface.id === 'view.school.students.record.profile.modal.edit-profile') {
    const steps = (context: BrowserScenarioContext) => {
      context.fixtures.mutation ??= emptyModalMutation();
      const path = `/school/students/${entities(context).studentId}/profile`;
      return modalMutationSteps<BrowserScenarioContext>({ parentRoute: '/school/students/[id]/profile', modal: 'edit-profile',
        pathname: path, command: 'update-student-profile', listPath: path,
        verifyPersisted: async page => { await page.reload(); await assertViewSurface(page, { path, kind: 'page' }); },
      }, context.fixtures.mutation as ModalMutationState, {
        navigate: path => navigateSpaPage(context.page, `${context.base}${path}`), shot: async () => {},
      });
    };
    return { id: surface.id, feature: surface.feature, fixtureRequirements: ['entities'], steps: [
      { id: 'open-form', run: context => steps(context)[0]!.run(context), checkpoint: { id: 'edit-form', title: surface.title,
        surface: surface.path, ready: context => steps(context)[0]!.checkpoint!.ready(context) } },
      { id: 'submit', run: context => steps(context)[1]!.run(context) },
      { id: 'verify-persistence', run: context => steps(context)[2]!.run(context) },
    ] };
  }
  const step: ScenarioStep<BrowserScenarioContext> = {
    id: 'open', run: async context => {
      if (surface.path.startsWith('/configuration/period-grid?')) {
        const { yearId } = context.fixtures.academicScope as { yearId: string };
        const url = new URL(surface.path, context.base);
        url.searchParams.set('modalTarget', yearId);
        await openViewSurface(context.page, context.base, { ...surface, path: url.pathname + url.search }, entities(context));
      } else if (surface.id === 'view.classes.class.evaluations.modal.create') {
        await openViewSurface(context.page, context.base, { ...surface, path: surface.path.split('?')[0]!, kind: 'page' }, entities(context));
        await context.page.getByRole('button', { name: /ajouter une évaluation|new evaluation|add (an )?evaluation/i }).click();
      } else await openViewSurface(context.page, context.base, surface, entities(context));
    },
    checkpoint: { id: surface.kind === 'modal' ? 'dialog' : 'loaded', title: surface.title, surface: surface.path,
      ready: context => assertViewSurface(context.page, surface) },
  };
  const steps = [step];
  if (surface.id === 'view.configuration.period-grid.modal.period-def-wizard') {
    for (const next of ['tweak', 'preview']) steps.push({ id: next, run: async context => {
      await context.page.getByTestId('form-modal-submit').click();
      await context.page.waitForURL(url => url.searchParams.get('modalStep') === next);
    }, checkpoint: { id: next, title: `Period definition wizard · ${next}`, surface: surface.path.replace('modalStep=preset', `modalStep=${next}`),
      ready: context => assertViewSurface(context.page, { ...surface, path: surface.path.replace('modalStep=preset', `modalStep=${next}`) }) } });
  }
  return { id: surface.id, feature: surface.feature, fixtureRequirements: ['entities'], steps };
}

const studentList = VISUAL_SURFACES.find(surface => surface.path === '/school/students')!;
const studentForm = VISUAL_SURFACES.find(surface => surface.path === '/school/students?modal=create')!;
const representative: ScenarioDefinition<BrowserScenarioContext>[] = [
  { id: 'view.auth.phone', feature: 'auth', steps: [{ id: 'form', run: context => openViewSurface(context.page, context.base,
    { ...studentList, path: '/login?panel=signin&method=phone-otp&stage=form', identity: 'anonymous' }, entities(context)),
    checkpoint: { id: 'form', title: 'Phone sign-in', surface: '/login?method=phone-otp', ready: async context => {
      await context.page.locator('[data-testid="auth-identifier"]:visible').waitFor();
    } } }] },
  { id: 'view.school.students.empty', feature: 'school', steps: [{ id: 'empty-search', run: context => openViewSurface(context.page, context.base,
    { ...studentList, path: '/school/students?q=SCREENSHOT_NO_MATCH_7f92c' }, entities(context)),
    checkpoint: { id: 'empty', title: 'Student list · no results', surface: '/school/students?q=SCREENSHOT_NO_MATCH_7f92c', ready: async context => {
      await context.page.getByText(/no (results|students)|aucun (résultat|élève)/i).first().waitFor();
    } } }] },
  { id: 'view.school.students.error', feature: 'school', steps: [
    { id: 'simulate-read-failure', run: async context => {
      await context.page.route('**/core/entities/students/list', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Screenshot read failure"}' }));
    } },
    { id: 'open-error', run: async context => {
      await context.page.goto(`${context.base}/school/students`, { waitUntil: 'domcontentloaded' });
    }, checkpoint: { id: 'error', title: 'Student list · load error', surface: '/school/students', ready: async context => {
      await context.page.getByRole('alert').filter({ has: context.page.getByRole('button', { name: /retry|try again|réessayer/i }) }).waitFor();
    } } },
  ] },
  { id: 'view.school.students.form-scroll', feature: 'school', steps: [pageScenario(studentForm).steps![0]!,
    { id: 'scroll', run: async context => {
      await context.page.getByRole('dialog').last().evaluate(dialog => {
        const candidates = [dialog, ...Array.from(dialog.querySelectorAll('*'))];
        const scrolling = candidates.find(element => element.scrollHeight > element.clientHeight && /auto|scroll/.test(getComputedStyle(element).overflowY));
        if (scrolling) scrolling.scrollTop = scrolling.scrollHeight;
        else dialog.querySelector('button[type="submit"]')?.scrollIntoView({ block: 'nearest' });
      });
    }, checkpoint: { id: 'scrolled', title: 'Student form · lower fields', surface: studentForm.path, ready: context => assertViewSurface(context.page, studentForm) } },
  ] },
  { id: 'view.shell.navigation', feature: 'shell', steps: [{ id: 'open-menu', run: async context => {
    await openViewSurface(context.page, context.base, { ...studentList, path: '/dashboard' }, entities(context));
    if (context.viewport.width < 1024) {
      const toggle = context.page.locator('button[aria-controls="app-sidebar"]');
      await toggle.click();
    }
  }, checkpoint: { id: 'menu', title: 'Workspace navigation', surface: '/dashboard', ready: async context => {
    await context.page.locator('#app-sidebar').waitFor({ state: 'visible' });
  } } }] },
];

export const VISUAL_SCENARIOS: ScenarioDefinition<BrowserScenarioContext>[] = [
  authScenario, wizardScenario, ...VISUAL_SURFACES.map(pageScenario), ...representative,
];

export function scenarioIdentity(scenario: ScenarioDefinition<BrowserScenarioContext>): 'owner' | 'anonymous' {
  if (scenario.feature === 'auth' || scenario.feature === 'onboarding') return 'anonymous';
  return VISUAL_SURFACES.find(surface => surface.id === scenario.id)?.identity ?? 'owner';
}

/** This snapshot must be updated deliberately when product surfaces change. */
export function assertVisualCoverage(): void {
  const registered = new Set(VISUAL_SURFACES.filter(surface => surface.kind === 'page').map(surface => normalizeRoutePattern(surface.path)));
  registered.add('/login');
  registered.add('/onboarding');
  const missing: string[] = [];
  for (const route of getWebappFilesystemRoutes()) {
    if (route.type === 'redirect' || route.type === 'layout-only' || route.url === '/__design') {
      if (!VISUAL_EXCLUSIONS.some(exclusion => exclusion.surface === route.url && exclusion.reason)) missing.push(`exclusion:${route.url}`);
      continue;
    }
    const path = normalizeRoutePattern(inventoryRouteToMatrixPath(route.url));
    if (!registered.has(path) && !VISUAL_EXCLUSIONS.some(exclusion => normalizeRoutePattern(exclusion.surface) === path && exclusion.reason)) missing.push(`page:${route.url}`);
  }
  for (const surface of MODAL_SURFACES) {
    const path = `${surface.parentRoute}?modal=${surface.modal}`;
    if (!VISUAL_SURFACES.some(registered => registered.path === path)) missing.push(`modal:${path}`);
  }
  for (const tab of IMPORT_TYPE_TABS) {
    if (!VISUAL_SURFACES.some(surface => surface.path.includes(`modal=import&modalTab=${tab}&`))) missing.push(`import-tab:${tab}`);
  }
  for (const tab of TIMETABLE_SETUP_TABS) {
    if (tab !== 'subjects' && !VISUAL_SURFACES.some(surface => surface.path.includes(`modal=generate-timetable&modalStep=setup&modalTab=${tab}`))) missing.push(`generation-tab:${tab}`);
  }
  assert(!missing.length, `Missing visual checkpoints:\n${missing.join('\n')}`);
}
