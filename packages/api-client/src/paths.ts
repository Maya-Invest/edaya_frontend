/** Must stay aligned with apps/api/src/lib/school-api/routes/paths.ts */
export const SCHOOL_API_BASE_PATH = '/core'

export function schoolApiPath(...segments: string[]): string {
  return `${SCHOOL_API_BASE_PATH}/${segments.join('/')}`
}
