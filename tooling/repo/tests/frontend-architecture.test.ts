import { describe, expect, test } from 'bun:test'
import { checkFrontendImports, checkWorkspaceReferences } from '../lib/frontend-architecture'

const view = 'apps/webapp/src/routes/(app)/school/students/components/StudentView.svelte'
const script = (source: string) => `<script lang="ts">${source}</script>`
describe('frontend ownership guardrails', () => {
  test('allows type-only API imports and pure payload helpers', () => {
    expect(checkFrontendImports(view, script(`
      import { ApiError } from '@maya-invest/edaya-api-client';
      import type { saveMutation } from '$lib/api/mutations/subject.mutations';
      import { type SchoolClient } from '$lib/api/school-client';
      import { createTeacherAssignmentPayload } from '../../teachers/lib/teacher-detail-mutations';
    `))).toEqual([])
  })
  test.each([
    'import { authClient } from \'$lib/auth/client\';',
    'import { authRequest } from \'$lib/auth/client\';',
    'import client, { ApiError } from \'@maya-invest/edaya-api-client\';',
    'import { createSchoolClient } from \'@maya-invest/edaya-api-client\';',
    'import { runStudentRouteMutation } from \'../lib/student-route-mutation\';',
    'import {} from \'$lib/api/school-client\';',
    'import { queryClient } from \'$lib/queries/client\';',
    'const client = await import(`$lib/api/school-client`);',
    'import { updateSubjectMutation } from \'$lib/api/mutations/subject.mutations\';',
    'import { type SchoolClient, getBrowserSchoolClient } from \'$lib/api/school-client\';',
    'export * from \'$lib/api/account-client\';',
    'const client = await import(\'$lib/api/school-client\');',
    'import { saveTeacherAssignmentOnPage } from \'../../teachers/lib/teacher-detail-mutations\';',
    'import * as mutations from \'../../teachers/lib/teacher-detail-mutations\';',
  ])('rejects runtime presentation I/O: %s', (source) => {
    expect(checkFrontendImports(view, script(source))).toHaveLength(1)
  })
  test('owner state can import clients and mutation adapters', () => {
    expect(checkFrontendImports(view.replace('StudentView.svelte', 'student-state.svelte.ts'), 'import { getBrowserSchoolClient } from \'$lib/api/school-client\';')).toEqual([])
  })
  test('rejects retired aliases, relative paths, re-exports and dynamic imports', () => {
    for (const source of [
      'import value from \'$lib\';',
      'import StaffPicker from \'$lib/components/school/shared/pickers/StaffPicker.svelte\';',
      'export { default } from \'$lib/components/school/dashboard/DirectorDashboardView.svelte\';',
      'await import(\'$lib/components/account/AccountLinkingSection.svelte\');',
    ]) expect(checkFrontendImports(view, script(source))).toHaveLength(1)
    expect(checkFrontendImports('apps/webapp/src/lib/components/layout/View.svelte', script('import AppRail from \'./AppRail.svelte\';'))).toHaveLength(1)
  })
  test('comments and type expressions do not create runtime imports', () => {
    expect(checkFrontendImports(view, script('// import client from \'$lib/api/school-client\';\ntype Client = import(\'$lib/api/school-client\').SchoolClient;'))).toEqual([])
  })
  test('preserves genuinely shared scheduling modules', () => {
    expect(checkFrontendImports(view, script('import { mondayOfWeekUtc } from \'$lib/scheduling/planning-calendar\';'))).toEqual([])
  })
  test('checks application filters and workflow package inputs', () => {
    const names = new Set(['@edaya/webapp', '@edaya/webadmin'])
    expect(checkWorkspaceReferences('package.json', 'bun --filter @edaya/webapp build && turbo --filter=@edaya/webadmin quality', names)).toEqual([])
    expect(checkWorkspaceReferences('package.json', 'bun --filter @edaya/website build', names)).toHaveLength(1)
    expect(checkWorkspaceReferences('deploy.yml', 'package: "@edaya/website"', names)).toHaveLength(1)
  })
})
