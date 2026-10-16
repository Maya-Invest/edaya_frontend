/** Executable browser contracts required by full qualification. */
export const FOCUSED_BROWSER_SUITES = [
  { name: 'messaging-ui', script: 'messaging-browser.ts', seeded: true },
  { name: 'family-feedback-ui', script: 'family-feedback-browser.ts', seeded: true },
  { name: 'permission-profiles', script: 'permission-profiles-browser.ts', seeded: true },
  { name: 'teacher-tabs', script: 'teacher-tabs-browser.ts', seeded: true },
  { name: 'attendance-ui', script: 'attendance-browser.ts', seeded: false },
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
