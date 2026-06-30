/**
 * Dev demo login picker data for the webapp `/login/demo` page.
 * Keep in sync with edaya/tooling/fixtures (dataset.ts + dev-demo-login.ts).
 */

export const DEV_AUTH_PASSWORD = 'DevPassword1!'

export type DevDemoLoginRole = 'owner' | 'directeur' | 'prof_principal' | 'professeur' | 'educateur'

export interface DevDemoLoginAccount {
  staffId: string
  email: string
  name: string
  role: DevDemoLoginRole
  initials: string
}

const SEED_SCHOOL_OWNER_STAFF_ID = 'st8'

const DEV_AUTH_STAFF_ACCOUNTS = [
  { staffId: 'st8', email: 'k.yann@school.edu', name: 'Koussi Yann' },
  { staffId: 'st5', email: 'c.moreau@school.edu', name: 'Camille Moreau' },
  { staffId: 'st1', email: 'm.dupont@school.edu', name: 'Mme Dupont' },
  { staffId: 'st2', email: 'm.garnier@school.edu', name: 'M. Garnier' },
  { staffId: 'st3', email: 'm.leon@school.edu', name: 'Mme Léon' },
  { staffId: 'st7', email: 't.evrard@school.edu', name: 'Tom Évrard' },
] as const

const DEV_AUTH_STAFF_ACCESS_ROLE_IDS: Record<
  (typeof DEV_AUTH_STAFF_ACCOUNTS)[number]['staffId'],
  string
> = {
  st8: 'role-director',
  st5: 'role-director',
  st1: 'role-teacher',
  st2: 'role-teacher',
  st3: 'role-coordinator',
  st7: 'role-educator',
}

const ACCESS_ROLE_TO_DEMO_ROLE: Record<string, DevDemoLoginRole> = {
  'role-director': 'directeur',
  'role-coordinator': 'prof_principal',
  'role-educator': 'educateur',
  'role-teacher': 'professeur',
}

const DEMO_ROLE_DISPLAY_ORDER: Record<DevDemoLoginRole, number> = {
  owner: -1,
  directeur: 0,
  professeur: 1,
  prof_principal: 2,
  educateur: 3,
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
      accessRoleId: DEV_AUTH_STAFF_ACCESS_ROLE_IDS[
        staffId as keyof typeof DEV_AUTH_STAFF_ACCESS_ROLE_IDS
      ],
    }
  }

  const accessRoleId = DEV_AUTH_STAFF_ACCESS_ROLE_IDS[
    staffId as keyof typeof DEV_AUTH_STAFF_ACCESS_ROLE_IDS
  ]
  const role = accessRoleId && ACCESS_ROLE_TO_DEMO_ROLE[accessRoleId]
    ? ACCESS_ROLE_TO_DEMO_ROLE[accessRoleId]
    : 'professeur'

  return { role, accessRoleId }
}

function buildDevDemoLoginAccounts(): DevDemoLoginAccount[] {
  let teacherAccountIncluded = false

  const accounts = DEV_AUTH_STAFF_ACCOUNTS.flatMap((account) => {
    const { role, accessRoleId } = resolveDevDemoStaffRole(account.staffId)
    if (!accessRoleId) {
      return []
    }

    if (accessRoleId === 'role-teacher') {
      if (teacherAccountIncluded) {
        return []
      }
      teacherAccountIncluded = true
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
    const roleOrder = DEMO_ROLE_DISPLAY_ORDER[left.role] - DEMO_ROLE_DISPLAY_ORDER[right.role]
    if (roleOrder !== 0) {
      return roleOrder
    }
    return left.name.localeCompare(right.name, 'fr')
  })
}

export const DEV_DEMO_LOGIN_ACCOUNTS = buildDevDemoLoginAccounts()
