/** Executable browser contracts required by full qualification. */
export const FOCUSED_BROWSER_SUITES = [
  { name: 'student-profile', script: 'student-profile-browser.ts', seeded: false },
  { name: 'grading-entry', script: 'grading-entry-browser.ts', seeded: false },
  { name: 'school-year-switcher', script: 'school-year-switcher-browser.ts', seeded: false },
  { name: 'shared-design', script: 'shared-design-browser.ts', seeded: false },
  { name: 'guardian-profile', script: 'guardian-profile-browser.ts', seeded: false },
  { name: 'subject-enrollment', script: 'subject-enrollment-browser.ts', seeded: false },
  { name: 'imports-ui', script: 'import-browser.ts', seeded: true, runtime: 'node' },
  { name: 'account-settings-ui', script: 'account-settings-browser.ts', seeded: false },
  { name: 'inbox-pages-ui', script: 'inbox-pages-browser.ts', seeded: true },
  { name: 'messaging-ui', script: 'messaging-browser.ts', seeded: true },
  { name: 'family-feedback-ui', script: 'family-feedback-browser.ts', seeded: true },
  { name: 'permission-profiles', script: 'permission-profiles-browser.ts', seeded: true },
  { name: 'teacher-tabs', script: 'teacher-tabs-browser.ts', seeded: true },
  { name: 'attendance-ui', script: 'attendance-browser.ts', seeded: false },
  { name: 'assessment-permissions', script: 'assessment-permissions-browser.ts', seeded: false },
  { name: 'grading-configuration', script: 'grading-config-browser.ts', seeded: false },
  { name: 'timetable-selection', script: 'timetable-selection-browser.ts', seeded: false },
] as const

export const BROWSER_SUITE_DIRECTORIES: Record<string, string> = {
  availability: '.availability-run',
  onboarding: '.onboarding-run',
  provisioned: '.integration-run',
  webadmin: '.webadmin-run',
  demo: '.demo-dry-run',
  ...Object.fromEntries(FOCUSED_BROWSER_SUITES.map(suite => [suite.name, `.focused-run/${suite.name}`])),
}
