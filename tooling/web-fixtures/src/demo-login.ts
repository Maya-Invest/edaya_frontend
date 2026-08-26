/**
 * Dev demo login picker data for the staff webapp `/login/demo` page.
 *
 * Staff workspace only — portal teachers (`ci-t1`, `a.toure@`, …) sign in via the
 * teacher mobile app, not this picker. Keep in sync with
 * `@edaya/fixtures` (`dev-auth-fixtures-ci.ts`).
 */

export const DEV_AUTH_PASSWORD = 'DevPassword1!'

export type DevDemoLoginRole = 'owner' | 'directeur' | 'deputy_director' | 'educateur'

export interface DevDemoLoginAccount {
  staffId: string
  email: string
  name: string
  role: DevDemoLoginRole
  initials: string
}

const SEED_SCHOOL_OWNER_STAFF_ID = 'ci-st8'

/** Matches `DEV_CI_AUTH_STAFF_ACCOUNTS` in edaya_backend fixtures — no portal teachers. */
const DEV_AUTH_STAFF_ACCOUNTS = [
  { staffId: 'ci-st8', email: 'a.kone@ecole-ci.edaya.dev', name: 'Aminata Koné' },
  { staffId: 'ci-st5', email: 'j.aka@ecole-ci.edaya.dev', name: 'Jean-Baptiste Aka' },
  { staffId: 'ci-st3', email: 'f.assi@ecole-ci.edaya.dev', name: 'Mme Assi' },
  { staffId: 'ci-st7', email: 'm.zongo@ecole-ci.edaya.dev', name: 'Mme Zongo' },
] as const

const DEV_AUTH_STAFF_ACCESS_ROLE_IDS: Record<
  (typeof DEV_AUTH_STAFF_ACCOUNTS)[number]['staffId'],
  string
> = {
  'ci-st8': 'role-director',
  'ci-st5': 'role-director',
  'ci-st3': 'role-coordinator',
  'ci-st7': 'role-educator',
}

const ACCESS_ROLE_TO_DEMO_ROLE: Record<string, DevDemoLoginRole> = {
  'role-director': 'directeur',
  'role-coordinator': 'deputy_director',
  'role-educator': 'educateur',
}

const DEMO_ROLE_DISPLAY_ORDER: Record<DevDemoLoginRole, number> = {
  owner: -1,
  directeur: 0,
  deputy_director: 1,
  educateur: 2,
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

function resolveDevDemoStaffRole(
  staffId: string,
): { role: DevDemoLoginRole, accessRoleId?: string } {
  if (staffId === SEED_SCHOOL_OWNER_STAFF_ID) {
    return {
      role: 'owner',
      accessRoleId: DEV_AUTH_STAFF_ACCESS_ROLE_IDS[staffId],
    }
  }

  const accessRoleId = DEV_AUTH_STAFF_ACCESS_ROLE_IDS[
    staffId as keyof typeof DEV_AUTH_STAFF_ACCESS_ROLE_IDS
  ]
  const role = accessRoleId && ACCESS_ROLE_TO_DEMO_ROLE[accessRoleId]
    ? ACCESS_ROLE_TO_DEMO_ROLE[accessRoleId]
    : 'directeur'

  return { role, accessRoleId }
}

function buildDevDemoLoginAccounts(): DevDemoLoginAccount[] {
  const accounts = DEV_AUTH_STAFF_ACCOUNTS.flatMap((account) => {
    const { role, accessRoleId } = resolveDevDemoStaffRole(account.staffId)
    if (!accessRoleId) {
      return []
    }

    return [{
      staffId: account.staffId,
      email: account.email,
      name: account.name,
      role,
      initials: initialsForName(account.name),
    }]
  })

  return accounts.sort((left, right) => {
    const orderDelta = DEMO_ROLE_DISPLAY_ORDER[left.role] - DEMO_ROLE_DISPLAY_ORDER[right.role]
    if (orderDelta !== 0) {
      return orderDelta
    }
    return left.name.localeCompare(right.name, 'fr')
  })
}

export const DEV_DEMO_LOGIN_ACCOUNTS = buildDevDemoLoginAccounts()
