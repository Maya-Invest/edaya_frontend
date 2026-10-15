# Feature Architecture Spec

> **Applies to:** `apps/webapp` — routes, modules, entities, domain UX rules  
> **Normative:** agents and implementers **must** follow this document for *what* to build.

This document is the **target end-state architecture** for the EDAYA staff webapp v1. It defines modules, routes, entity surfaces, and locked product decisions.

---

## 1. Scope

### 1.1 In scope

All sidebar modules and account surfaces in §2 and routes in §6, using list · drawer · modal interaction: read-only drawer for complex entities, mutation modals for all creates/edits, URL-backed detail where a drawer exists.

### 1.2 Post-v1 (do not build)

| Area | Entities | Rule |
|------|----------|------|
| **Resource management** | `resources`, `resourceAssignments` | No staff UI in v1. No resource booking or room assignment in timetable. |

### 1.3 Removed from v1 (do not restore)

| Route / surface | Replacement |
|---------------|-------------|
| `/configuration/roles` | **Configuration → Permission profiles** catalog + **Staff drawer → Permissions** tab (`staffPermissionAssignments`). Do not restore a roles matrix. |
| `/classes/{classId}/homework` | **`/classes/{classId}/evaluations`** with `kind = homework` filter + row badge |
| Dedicated **exam** menu | Timed assessments on **timetable** + **evaluations** list (same `Assessment` entity) |

---

## 2. Shell & navigation

### 2.1 Module tree

```
Sidebar
├── Dashboard
├── School          → school-wide people & school life
├── Classes         → class picker + class-scoped academics
├── Finance
└── Configuration

User menu
└── Account         → inbox, notification settings, profile
```

Workspace context in the sidebar: **School** → **Academic year** → navigation. Global header: navigation toggle · **Language** · **User menu**. Shared academic term selection appears beside affected content/actions, not in the global header. Dashboard, evaluations, report cards, marks review, class assessment metrics, class timetable controls, relevant drawer tabs and logbook export expose this picker; unrelated finance, attendance and general configuration do not. Configuration Tools keeps term presets and date-range controls inside the generation assistant, with no term picker on the timetable card.

### 2.2 Class context

Class-scoped routes live under `/classes/{classId}/…`. The sidebar **class picker** sets active class context.

**Class nav** (`CLASS_NAV_DEFS`) **must** filter by `ClassGroup.attendanceMode`:

| `attendanceMode` | Nav |
|------------------|-----|
| `daily` | Show **Attendance** tab (`/classes/{classId}/attendance`) |
| `session` | Hide Attendance tab; session attendance only on **timetable** drawer |

### 2.3 List toolbar (standard list pages)

Order: **`[Search] [Main filter ▾] [Filter ▾] [More ▾] [Primary CTA]`**

Applies to **standard entity list routes** only. Layout variants (§2.4) may omit search, main filter, or the full toolbar.

| Slot | Rule |
|------|------|
| **Primary CTA** | One create action → modal |
| **Search** | Present on standard lists; optional on layout variants |
| **Main filter** | Always **`<select>`** — one high-frequency facet. **No chip bars or pill toggles.** |
| **Filter** | Secondary facets (status bands, date range, scope) |
| **More** | Export, bulk ops, view toggle |

### 2.4 Layout variants

These routes use approved body layouts **without** the full §2.3 toolbar:

| Variant | Routes | Notes |
|---------|--------|-------|
| **Dashboard** | `/dashboard` | KPI cards; no entity collection toolbar |
| **Calendar** | `/school/calendar` | Time grid |
| **Timetable** | `/classes/{classId}/timetable` | Week grid; occurrence drawer |
| **Accordion** | `/configuration/academic` | Years accordion; modal CRUD |

Shell chrome (sidebar, header, toasts, permissions) still applies.

### 2.5 Routing

```
/{module}/{entity}              → list
/{module}/{entity}/[id]         → list + detail drawer (default tab)
/{module}/{entity}/[id]/{tab}   → list + drawer on named tab (child route)
```

- Complex entities: row click → URL-backed drawer (`[[id]]` optional segment); tabs are child routes under `[[id]]/`.
- Simple entities: row `···` menu only — **no drawer**, **no** `/[id]` route unless deep links are explicitly required.
- Mutation forms and confirmations remain on the current structural route and are addressable through
  `?modal=…`; use `modalTarget`, `modalStep`, and `modalTab` when the target or workflow subview is
  not already identified by the pathname.

---

## 3. Surface types

Every feature **must** declare one surface type. Simple entities **must** use row `···` menus only — no drawer, no `/[id]` route unless deep links are explicitly required.

| Type | Drawer | Mutations | Examples |
|------|--------|-----------|----------|
| **Complex** | URL-backed read-only drawer | Entity-header actions → modals; sub-collections read-only, `+ Add` → modal | Student, Staff, Assessment, Incident, Billing |
| **Simple** | None | Row `···` menu → modals | CatalogService (fees), Payment, Reconciliation, GradeScale, DisciplinaryAction, CalendarEvent |
| **Thin drawer** | Sections only (no tabs) | Header actions → modals | Inbox delivery, Notification templates |
| **Layout variant** | None | Page-level or inline modals | Dashboard, School profile, Academic calendar accordion |

**Drawer entity header** (complex + thin): identity block + **up to 2 primary actions** → modals. Destructive actions in overflow `···` only. Body = related content only — not a repeat of list columns.

---

## 4. Locked UX decisions

These are **fixed** for v1. Do not introduce alternate flows without updating this spec.

| Topic | Decision |
|-------|----------|
| **Staff assignments (config)** | **Class-level only** in Configuration → Classes drawer (`staffAssignments` with `classGroupId`). Lesson/session/subject-level assignment is post-v1. |
| **Staff permissions** | Catalog at `/configuration/permission-profiles`. Runtime authority stays grant rows on **Staff drawer → Permissions**. No `/configuration/roles` matrix. |
| **Incident resolve** | **One modal** — involved students, role, optional `DisciplinaryAction` per student, resolution notes. Command: **`resolveIncidentWithOutcomes`** (atomic). Drawer: involved students read-only; edits only via Resolve modal. |
| **Assessments by `kind`** | **One route** `/evaluations`. Same routed drawer for all kinds: Details + Grading child tabs; Grading shows the exclusive work surface (homework submissions vs grades grid). List row: **kind badge**. |
| **Timed assessments** | No exam menu. Quiz/project/other require a visible date and start/end (school timezone) or `lessonSessionId`. They appear on the evaluations list; optional **Add to timetable** (`createSchedule`) is deferred and must not omit times. |
| **Homework** | `Assessment` with `kind = homework` on evaluations screen — **no** `/homework` nav. Kind is frozen on edit (no homework↔quiz conversion). |
| **Daily attendance** | **List of days** + drawer (same pattern as timetable session). Edits **permission-gated**, not mode-locked UI. |
| **Timetable ↔ Schedule** | **From timetable:** New session wizard (Lesson · Activity · Assessment) → creates `Schedule` + materialized occurrence. **From Lessons / Activities:** optional inline schedule on create/edit. Assessments require occurrence times; optional Add to timetable is deferred. |
| **Activity on class timetable** | `ActivityEnrollment` (school roster) + **`ClassActivityEnrollment`** (activity ↔ class link for timetable). |
| **Student Grades tab** | Read-only **links** to class assessment drawer (`/evaluations/{id}`). |
| **Global Subject** | Inline create/edit in subjects catalog — **no** dedicated Subject admin route. |
| **Subject workload** | Configuration → Subjects → existing Edit subject form includes weekly periods and session span bounds. Values belong to the grade-level subject for the selected academic year and mirror to its classes. Class progression and Chapters tabs contain no workload editor. |
| **Student Attendance tab** | **Mode-agnostic history** — all `AttendanceRecord` rows (daily + session anchors). **Declare** uses the student's class `attendanceMode`: daily → date modal + `recordDailyAttendance`; session → hide Declare and link to `/classes/{classId}/timetable`. |
| **`attendanceMode` on class** | Required on create; editable on class profile. Warn on mid-year mode switch if records exist for the other mode; never delete historical records. |

---

## 5. Domain rules

### 5.1 Class attendance mode

| Field | Control |
|-------|---------|
| `attendanceMode` | `<select>`: Daily roll call · Per session |
| `homeroomStaffId` | Staff coordinator picker (administrative contact only; grants no teaching or attendance authority) |

**API commands (existing):**

- Daily: `record-daily-attendance`, `record-class-daily-attendance` (require `attendanceMode = daily`)
- Session: lesson/activity/assessment attendance commands (session anchors)

### 5.2 Discipline

| Entity | Surface |
|--------|---------|
| `Incident` | Complex drawer at `/school/events/[[id]]` |
| `StudentIncidentInvolvement` | Sub-collection on incident drawer; resolve modal writes via `resolveIncidentWithOutcomes` |
| `StudentDisciplinaryAction` | Created in resolve modal; show in drawer post-resolve (target) |
| `DisciplinaryAction` | Simple list inside `/configuration/other` — row `···` menu |

### 5.3 Permissions

- Runtime authority is `staffPermissionAssignments` grant rows. Policies never read a profile name.
- School-owned **permission profiles** are reusable permission bundles at `/configuration/permission-profiles`; they may mix permission scope types. Scope selections belong to staff assignments. Bound grants are stamped with `sourceProfileId` and `sourceProfileBindingId` and stay locked. Manual assignment sources stay add/edit/delete; their generated grants carry `sourceManualAssignmentId`.
- Picker labels: `GET authorization/permission-catalog` + `POST authorization/scope/render`.
- Client edits typed `customScopes` and `useDefaultScopes`. Each staff member has default scope selections for each academic year. Generation unions compatible custom selections with defaults when enabled; it never overwrites custom selections. Empty or incompatible selections produce no runtime grant. The saved assignment remains with persistent warnings and regenerates when repaired. The server validates the action, target, year and validity on save. Manual grants and staff assignments are separate facts; no permission rows are copied from assignments.

#### 5.3.1 Staff permission assignment UI

Grant rows stay on **Staff drawer → Permissions**. Profile **templates** live in Configuration. There is **no** `/configuration/roles` matrix screen.

| Surface | Rule |
|---------|------|
| **Catalog** | `/configuration/permission-profiles` — simple list (discipline analog). Read `ACCESS_CONTROL_READ`; create/edit/delete `ACCESS_CONTROL_CONFIGURE`. |
| **Location (grants)** | Staff drawer → **Permissions** tab (`/school/staff/{id}`) |
| **Mutation pattern** | **Modal-only** for custom grants and apply/remove; reorder via explicit up/down. No inline permission toggles, no CRUD matrix layout |
| **Manage affordance** | Drawer header **Manage permissions** scrolls/focuses Permissions tab, or user switches tab manually |
| **Gating** | Apply / remove / reorder / custom add-edit-delete require `ACCESS_CONTROL_ASSIGN` via `PermissionGate` (`hide` or `disable` + tooltip) |

**Permissions tab anatomy** (drawer sub-collection pattern):

Sub-collection tabs use a read-only list with header CTAs and row actions that open modals — never inline edit forms in the tab body.

```
┌ Permissions ────────────── [Apply profile] [+ Add permission] ┐
│  Profile A (rank 0) · Whole school              [↑][↓][Remove] │
│    • ACCESS_CONTROL_READ                                       │
│  Profile B (rank 1) · Whole school              [↑][↓][Remove] │
│    • ACCESS_CONTROL_READ — already granted by A (muted)        │
│  Additional permissions                                        │
│    • PAYMENT_READ — Whole school            [Edit] [Delete]    │
└────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Locked profile groups** | Bindings in `sortOrder` (0 = highest). Each group shows profile name, rendered scope, permissions. Later profiles **skip** permissions already claimed by an earlier profile — muted hint “already granted by {profile}”. No row Edit/Delete on stamped grants. |
| **Reorder** | Up/down rewrites `sortOrder` then re-resolves that staff for the selected year (first-wins). An unresolved earlier profile still claims the permission; later profiles cannot silently broaden it. |
| **Remove profile** | Confirm → drop binding, re-resolve remaining. Custom grants remain. |
| **Apply / edit profile** | Modal: profile picker, include-defaults checkbox (on initially), grouped scope selections relevant to the bundle. Review generated access changes before save. Appends at lowest rank for the selected year. Re-applying the same profile updates saved selections and keeps rank. |
| **Default scopes** | Selected-year summary and Edit modal with grouped selections. Review added, changed and removed access before saving. Re-resolves profile and manual assignments that include defaults. |
| **Additional permissions** | Manual assignment sources, including unresolved requests. Header `+ Add permission` → **StaffPermissionFormModal** (custom only). |
| **Row** | Permission label (i18n `permission.{CODE}`) · **scope label** from `scope/render` |
| **Stale scope** | When `scope/render` reports missing segments → warn badge (do not block read) |
| **Custom row actions** | Edit → same modal (pre-filled); Delete → confirm → `removeStaffPermission`. Hidden on stamped rows. |
| **Staff create** | Optional profile with relevant custom scope selections and include-defaults flag (rank 0). No implicit whole-school access. Defaults for a new staff member start empty. |
| **Empty state** | Message + Apply profile / `+ Add permission` when the user can assign |

**Add / edit modal** (`StaffPermissionFormModal`):

| Field | Control | Rule |
|-------|---------|------|
| **Permission** | `<select>` from catalog | Required; options from `GET authorization/permission-catalog` |
| **Include defaults** | Checkbox | On initially; adds compatible selected-year defaults to saved custom selections |
| **Custom scopes** | `PermissionScopeSelections` + `ScopeBuilder` | Explicit selections compatible with the permission, including an explicit whole-school checkbox for school permissions |
| **Submit** | Review changes → Save | `assignStaffPermission` preview then save; show added/changed/removed access and unresolved warnings; toast on success; refresh tab list |

**ScopeBuilder** — one control set per catalog `scope` grain:

| Grain | UI | Typed scope fields |
|-------|----|--------------------|
| `class_group` | Repeatable class selections | `classGroupId` |
| `grade_level` | Repeatable grade selections | `gradeLevelId` |
| `class_subject` | Class and optional subject | `classGroupId`, optional `classSubjectId` (all subjects within that class) |
| `grade_level_subject` | Grade and optional grade subject | `gradeLevelId`, optional `gradeLevelSubjectId` |
| `student` | Repeatable StudentPicker | `studentId` |
| `activity` | Activity and/or class selection | `activityId` and/or `classGroupId` |
| `platform` | Not assignable in school UI | — |

Every entry carries its `kind`. Selecting all targets is explicit: `{ kind: "all", grain }`. Empty selections deny; they never mean whole school. Scope editing preserves all entries and the grant's validity dates.

Scope labels use `POST authorization/scope/render` with `{ academicYearId, items: [{ permission, scopes }] }`. The web never creates or parses delimited authorization paths.

The session contains one typed action-grant display. UI checks use that action's scopes and validity; owner labels and preset names never bypass those checks. The server remains authoritative for resource policies.

**Data loading:**

- `querySchoolStaffPage` loads `permission-catalog` into the staff route state.
- Assignments load via the Permissions tab child route `PageQuery` (or with staff list when colocated); views built via `buildStaffPermissionAssignmentViews`.
- Mutations: `configurePermissionProfile` / `applyStaffPermissionProfile` / `reorderStaffPermissionProfiles` / `removeStaffPermissionProfile` for bound grants; `assignStaffPermission` / `removeStaffPermission` for manual sources and `configureStaffPermissionScopeDefaults` for defaults. Preview commands never write. Optimistic patch + `entityVersions` bump (`staff`).

**Staff drawer → Assignments tab** (read-only): summary list of `staffAssignments` (class-level and other targets). Editing assignments happens in **Configuration → Classes** drawer (class-level tab) — not on this tab.

**Removed:** `/configuration/roles` route, roles matrix, `StaffRoleAssignment` UI, inline CRUD matrix toggles for permissions. Do **not** treat `StaffMember.profileRole` as authority.

---

## 6. Route index

| Module | List route | Detail route |
|--------|------------|--------------|
| Dashboard | `/dashboard` | — |
| Students (school) | `/school/students` | `/school/students/{id}` |
| Guardians | `/school/guardians` | `/school/guardians/{id}` |
| Staff | `/school/staff` | `/school/staff/{id}` |
| Teachers | `/school/teachers` | `/school/teachers/{id}` |
| School calendar | `/school/calendar` | — (simple — row `···` only) |
| Activities | `/school/activities` | `/school/activities/{id}` |
| Announcements | `/school/announcements` | `/school/announcements/{id}` |
| Family feedback | `/school/family-feedback` | `/school/family-feedback/{id}` |
| Incidents | `/school/events` | `/school/events/{id}` |
| Class students | `/classes/{classId}/students` | `…/students/{id}` |
| Timetable | `/classes/{classId}/timetable` | `…/timetable/{id}` |
| Lessons | `/classes/{classId}/teaching` | `…/teaching/{id}` |
| Assessments | `/classes/{classId}/evaluations` | `…/evaluations/{id}` |
| Report cards (class) | `/classes/{classId}/report-cards` | `…/report-cards/{id}` |
| Daily attendance | `/classes/{classId}/attendance` | `…/attendance/{id}` *(nav if `daily`)* |
| Fees | `/finance/fees` | — |
| Billing | `/finance/billing` | `/finance/billing/{id}` |
| Payments | `/finance/payment` | — |
| Reconciliation | `/finance/reconciliation` | — |
| School profile | `/configuration/school` | — |
| Academic calendar | `/configuration/academic` | — |
| Weekly period grid | `/configuration/period-grid` | — |
| Grade levels | `/configuration/grade-levels` | `/configuration/grade-levels/{id}` |
| Classes config | `/configuration/classes` | `/configuration/classes/{id}` |
| Subjects catalog | `/configuration/subjects` | `/configuration/subjects/{id}` |
| Report card models | `/configuration/report-cards` | `/configuration/report-cards/{id}` |
| Other configurations | `/configuration/other` | — |
| Grade scales | `/configuration/grade-scales` | — |
| Notification templates | `/configuration/notifications` | `/configuration/notifications/{key}` |
| Disciplinary catalog | `/configuration/other/discipline` | — |
| Subject categories | `/configuration/other/subject-categories` | — |
| Permission profiles | `/configuration/permission-profiles` | — |
| Configuration tools | `/configuration/tools` | — |
| Teacher assignments hub | `/configuration/tools/teacher-assignments` | — |
| Account inbox | `/account/inbox` | `/account/inbox/{id}` |

---

## 7. Feature specifications

Each subsection: **entity** · **surface** · **list** · **drawer / row menu** · **key modals** · **API notes**.

### 7.1 Dashboard

- **Surface:** Layout variant (no drawer)
- KPI cards and action queue deep-link to modules

### 7.2 School — Students

- **Entity:** `Student` · **Complex drawer**
- **List:** search name · main filter class · filter enrollment status · filter pending portrait review (`photoReview=pending`) · CTA Add student
- **Drawer header:** Edit profile · Change class · published portrait only
- **Drawer tabs:** Profile (published vs proposed portrait review, identity, health, guardians, notes) · **Grades** (links → `/evaluations/{id}`) · **Attendance** (all records) · Incidents · Finance · Report card · **Enrollments** (history) · **Documents** (issuance history by year, generate/retry/void, download)
- **Portrait review:** Approve / Reject / Replace published on the Profile tab (URL modals). Guardian and staff self-photos publish immediately from their own surfaces.

### 7.3 School — Guardians

- **Entity:** `Guardian` · **Complex drawer**
- **List:** search name · main filter relation type
- **Drawer header:** Edit · Link student
- **Drawer body:** Contact · account linking · linked students

### 7.4 School — Staff

- **Account scope:** human staff only. Apply `accountKind = human` to lists, counts and direct drawer lookup before pagination. Service-account lifecycle and permission changes use the dedicated service-account API, never ordinary staff forms.
- **Entity:** `StaffMember` · **Complex drawer**
- **List:** search name · main filter assigned class · filter active/inactive
- **Drawer header:** Edit profile · Manage permissions
- **Drawer tabs:** Profile · **Permissions** (locked profile groups + editable custom `staffPermissionAssignments`) · Assignments (read-only `staffAssignments` summary)
- **Create:** optional permission bundle (rank 0) with scope selections for the current academic year. The form loads profiles and the permission catalog together without depending on a prior Permissions-tab visit. Disable the profile picker while loading; show an error and retry on failure. Staff creation without a profile remains available. A selected profile requires ready scope metadata before submission.

### 7.4.1 School — Teachers

- **Entity:** `Teacher` · **Complex drawer** (**Teacher 360**)
- **Nav:** School → Teachers count chip from `getAppShellCounts.teacherCount` (school-wide total)
- **List:** search name · filter active/inactive · CTA Add teacher · row `···` (Edit profile · Delete)
- **Drawer header:** photo (immediate publish, like guardian) · active/inactive chip · assignment-count summary · Edit profile · overflow Delete
- **Drawer tabs** (hide a tab the caller cannot read):
  - **Profile** — identity including code, contact, active toggle, account linking
  - **Assignments** (`teacherAssignments`; subject + homeroom kinds) — add/edit modal · delete confirm
  - **Availability** (`teacherUnavailabilities`) — `ACCESS_CONTROL_ASSIGN` or `SCHOOL_STRUCTURE_CONFIGURE`
  - **Timetable** — teacher-scoped week (`getTeacherTimetable`); `QUERY_TIMETABLE_READ`; rows link to class timetable occurrences
  - **Evaluations** — assessments on assigned class subjects for the current period; `GRADE_READ` or `GRADE_INPUT`; rows link to `/classes/{classId}/evaluations/{id}`
  - **Family feedback** — campaigns for this teacher; `FAMILY_FEEDBACK_CAMPAIGN_READ`; rows link to `/school/family-feedback/{id}`
  - **Documents** — issuance history by year; generate/retry/void `teacher-timetable.v1`; `QUERY_TIMETABLE_READ`
- **Modals:** Create teacher (optional portal invite) · Edit profile · Add/edit assignment · Add/edit/delete unavailability · Generate/void document

### 7.5 School — Calendar

- **Entity:** `CalendarEvent` · **Simple** (row `···` only; mutation modals are URL-backed)
- **List:** search title · main filter event type
- **Row menu:** Edit · Duplicate · Delete

### 7.6 School — Activities

- **Entity:** `Activity` · **Complex drawer**
- **Drawer:** Enrollments (`ActivityEnrollment`) · optional class timetable link via `ClassActivityEnrollment` + schedule

### 7.7 School — Announcements

- **Entity:** `Announcement` · **Complex drawer**
- **Drawer:** Content · Targets sub-collection · Publish

### 7.8 School — Incidents

- **Entity:** `Incident` · **Complex drawer**
- **List:** search student · main filter class · filter category · severity · **resolution status**
- **List row:** show primary involved student + count or labels when multiple (`studentIncidentInvolvements`) — not first-involvement only
- **Drawer header:** Edit · **Resolve** (hidden when `status = resolved`)
- **Drawer body:** Summary · **Involved students** (read-only) · **Applied sanctions** (`studentDisciplinaryActions` read-only post-resolve)
- **Resolve modal:** involved students + role + optional `DisciplinaryAction` per student + notes → `resolveIncidentWithOutcomes` *(shipped)*

### 7.8.1 School — Family feedback

- **Entity:** family-feedback campaign (command/query only; not a generic Core entity) · **Complex drawer**
- **List:** search assignment label · filter status · CTA New campaign (`FAMILY_FEEDBACK_CAMPAIGN_MANAGE`)
- **Drawer tabs:** Setup · Audience · Moderation · Results
- **Drawer header:** schedule · assign moderator · open/close/cancel · theme draft · publish/archive. Opening and scheduling explain missing moderator/date prerequisites; confirmation cannot bypass them. Close is available only when open, theme editing only when closed with retained answers, moderator reassignment only before publication, and archive for published or cancelled campaigns. The moderator picker displays the selected draft value. Backend eligibility and permissions remain authoritative.
- **API:** campaign commands plus `preview-family-feedback-audience`, `list-family-feedback-comments` (moderator), `get-family-feedback-aggregate-review`
- **Copy:** “Family feedback” / “Retour des familles” — never mix with Assessments / Évaluations

### 7.9 Classes — Students (roster)

- Same drawer as school student list; cards default, table via More menu

### 7.10 Classes — Timetable

- **Entities:** `LessonSession` · `ActivitySession` · timed `Assessment`
- **Layout:** Week grid · URL-backed occurrence drawer
- **CTA:** **New session wizard** (modal or stepped flow):
  1. Pick type: **Lesson** · **Activity** · **Assessment**
  2. Pick context: class subject (lesson) · activity (+ optional `ClassActivityEnrollment`) · assessment template
  3. Schedule fields: date/time, recurrence → `createSchedule` + `materializeSchedule` when recurring
  4. Validate → occurrence appears on grid
- **Alternate create:** Lessons / Activities / Assessments screens — optional **Add to timetable** inline on create/edit modal
- **Drawer tabs:** Details · Attendance (`AttendanceRecord`) · Logbook (lessons only)
- **Header:** Edit · Take attendance *(session-mode classes; daily mode uses `/attendance` day board)*

### 7.11 Classes — Lessons (teaching)

- **Entity:** `ClassSubject` · **Complex drawer**
- **Drawer tabs:** Progression · Logbook
- Create/edit: optional **Schedule on timetable**

### 7.12 Classes — Assessments (evaluations)

- **Entities:** `Assessment` · `AssessmentResult`
- **List:** main filter **kind** (all / homework / quiz / project / other) · kind badge on row · timed items show schedule hint when on timetable
- **Drawer tabs:** Details · Grading. Grading is exclusive by `kind` — homework → submissions;
  quiz/project/other → grades grid.
- **CTA — New assessment modal:**
  1. Pick **kind** on create only. Kind is **read-only on edit** — no homework↔quiz conversion.
  2. Core fields: title, subject/class subject, dates, grading config
  3. Homework: required due date; payload clears `startsAt` / `endsAt` / `lessonSessionId`
  4. Quiz/project/other: required date + start/end in the school timezone, **or** a lesson session. Do not invent a UTC slot.
  5. Optional **Add to timetable** (`createSchedule`) is a later Schedule feature
- **Timetable link:** non-homework with `startsAt`/`endsAt` or `lessonSessionId` can appear on the timetable grid when scheduled; occurrence times are still required on the assessment itself
- **No** `/homework` route or nav tab

### 7.13 Classes — Report cards

- **Entity:** `ReportCardResult` · **Complex drawer**
- **Drawer header:** Publish · Regenerate

### 7.14 Classes — Daily attendance

- **Entities:** `Attendance` · `AttendanceRecord`
- **Nav:** only when `attendanceMode = daily`
- **List:** rows = **days** (not student matrix). **New roll call** remains available on an empty list for daily-mode classes; class-scoped `ATTENDANCE_RECORD` gates the action, direct modal URL, and submission.
- **Create:** `?modal=create-roll-call` opens a date and active-roster form. Default to today in the school timezone; allow today/past civil dates only. Students start unmarked; Present/Absent/Late are explicit choices. Mark all present fills only unmarked students. Save requires a nonempty, fully loaded, completely marked roster and uses one `record-class-daily-attendance` command. Existing dates link to their drawer instead of being overwritten through creation. Keep drafts on failure; success opens the saved day with list filters preserved.
- **Drawer:** same pattern as timetable session drawer
- **Commands:** `record-class-daily-attendance` · `record-daily-attendance`

### 7.15 Finance — Fees

- **Entity:** `CatalogService` · **Simple** (row `···` only — no drawer)
- Human labels stay **fees / frais**. Route stays `/finance/fees`.
- Row menu: Edit · Activate · Archive (no hard-delete)
- Create as **active**. Amounts are integer minor units; currency from API (create form last-resort `XOF`)

### 7.16 Finance — Billing

- **Entity:** `StudentCharge` · **Complex drawer**
- Enroll via assign modal (`?modal=assign-fee`), including bounded batch (≤100 students)
- Preserve history: waive / adjust / cancel commands; do not offer generic hard deletion
- **Drawer header (max 2 primary):** Record payment · Allocate. Waive / Adjust / Cancel in overflow `···`
- Allocation preview is a **modal** on the billing drawer, not a sidebar item
- Reverse allocation is a **modal** on the billing drawer (`?modal=unallocate`); it is not a cash refund
- Record payment modal: deposit-only (`account_only`) / FIFO / targeted + preview

### 7.17 Finance — Payments

- **Entity:** `Payment` · **Simple** (row `···` only)
- Receipt and disbursement history. Reverse via FormModal (`?modal=reverse`). Refund available balance via FormModal (`?modal=refund`)
- Payment itself has no drawer

### 7.17.1 Finance — Reconciliation

- **Surface:** simple page `/finance/reconciliation`
- Permission: `FINANCIAL_REPORT_READ`
- Named query `getFinanceReconciliation` — not an extra allocation sidebar item

### 7.18 Configuration — School profile

- **Entity:** `School` · four read-only sections, each with one permission-gated Edit action: Identity (name, persisted short name), Issuing identity (issuing name, address, phone, email, school code), Location (city, country, time zone, financial currency), Official document assets.
- Each section owns a URL modal (`identity`, `issuing`, `location`, `assets`). Saves include only that section’s fields. Short name is required and survives school renaming. School Type is absent.
- The assets modal saves uploads, removals and public-branding choices immediately, states this behavior, and closes with Done. Stamp/signature remain private. Currency changes remain blocked after financial activity.

### 7.19 Configuration — Academic calendar

- **Entities:** `AcademicYear` · `AcademicPeriod`
- Accordion by year; term-period publish via modals
- Weekly period slots live on `/configuration/period-grid`, not in this accordion

### 7.19.1 Configuration — Weekly period grid

- **Entity:** `PeriodDefinition` · layout page at `/configuration/period-grid`
- Year `<select>` lists every year (draft, published, archived) in `?year=`, defaulting to the workspace year when that year is in the list
- Slots are weekly (`dayOfWeek` + times); single-row form and optional **quick-setup wizard** (preset → tweak template/weekdays → batch create)
- Mutations require `SCHOOL_STRUCTURE_CONFIGURE`

### 7.20 Configuration — Grade levels

- **Entity:** `GradeLevel` · **Complex drawer**
- New route: `/configuration/grade-levels/[[id]]`

### 7.21 Configuration — Classes

- **Entity:** `ClassGroup` · **Complex drawer** (URL-backed)
- **Profile fields:** `attendanceMode` · `homeroomStaffId` · capacity · labels
- **Tab:** **Staff assignments** (class-level only)
- `homeroomStaffId` stores the staff coordinator only. Homeroom teachers come from current `TeacherAssignment` rows with kind `homeroom`; these are distinct business facts.
- The profile query loads teacher assignments for the selected class and its academic year into route state. Optional forbidden enrichment leaves the teacher display empty.
- Teacher labels require active teacher profiles and active assignments within their validity interval. Staff assignments never fill missing subject or homeroom teacher labels.

### 7.22 Configuration — Subjects catalog

- **Entity:** `ClassSubject` / catalog entries · **Complex drawer**
- Global `Subject`: inline in catalog flows

### 7.23 Configuration — Report card models

- **Entities:** `ReportCardDefinition` · sections tree · **Complex drawer**.
- `REPORT_CARD_CONFIGURE` enables name/description and section editing, including published models. Year, grade level, default/publication state and existing IDs remain fixed. Grading settings are inherited from the level/year policy, with no independent scale selector.
- Section forms edit labels, group/subject role, subject mapping, parent, order and positive weight/coefficient. Descendant parents and deletion of nonempty groups are forbidden. Revision-checked saves reject stale editors.
- Changes affect future explicit generation/regeneration only. Existing results, review decisions and published documents retain their captured content.

### 7.24 Configuration — Grade scales

- **Entity:** `GradeScale` · accordion scales with nested interval rows, matching the academic-year layout. Each interval has a visible permission-gated Edit button and Delete in its overflow menu. Sample lookup displays its matching code/mention beside the input, wrapping only when space requires it.
- Route: `/configuration/grade-scales`, beside Grade levels; legacy `/configuration/other/grade-scales` redirects with search/modal parameters preserved.
- Scale metadata and intervals have separate URL modals. Headers show limits, interval count, default/incomplete status. Expanded content includes Add interval and a rounded sample lookup.
- New scales have no intervals and are marked Incomplete; both server validation and pickers prevent their use. The first interval covers the whole scale; its minimum is anchored. Adding thresholds splits effective coverage. Only unused, non-default scales can lose their last interval.
- Users with `REPORT_CARD_CONFIGURE` can edit every school grade scale, including the default. Editing preserves its default status. The default scale has no Delete action, including via a modal deep link.

### 7.25 Configuration — Notification templates

- **Entity:** school notification templates · **Thin drawer**
- **List:** categorized cards; card click → `/configuration/notifications/{key}`; row `···` Edit → same URL + `?modal=edit`; primary CTA Reset all
- **Drawer:** read-only sections (channels/flags, in-app/push copy, rendered email HTML, SMS, placeholders); header Edit + overflow Reset this template
- **Modal:** edit copy by type (TipTap for `rich_message.body`; plaintext for in-app/push/SMS)

### 7.26 Configuration — Disciplinary catalog

- **Entity:** `DisciplinaryAction` · **Simple** list + row `···` menu
- Route: `/configuration/other/discipline`

### 7.26.2 Configuration — Subject categories

- **Entity:** `SubjectCategory` · **Simple** list + row `···` menu
- Route: `/configuration/other/subject-categories`
- Schools can add, rename, and delete categories. Delete is rejected while a subject still uses the category
- New schools start with Scientifique, Littéraire, Langues, Sciences humaines, Sport, and Arts
- Subject forms store `categoryId`. The six default names still use `catalogCategory()` for EN/FR labels

### 7.26.1 Configuration — Permission profiles

- **Entity:** `StaffPermissionProfile` · **Simple** list + row `···` menu at `/configuration/permission-profiles`
- **List:** search name/description · bound-staff count; CTA Add profile (`ACCESS_CONTROL_CONFIGURE`)
- **Editor:** name, description, grouped checklist of all non-platform permissions. No profile scope field. Edits review each affected staff member’s generated access changes and unresolved warnings before saving. Saved custom selections remain available for repair.
- **Commands:** `configurePermissionProfile`; catalog delete via entity delete (unique grants freeze as custom)

### 7.27 Account — Inbox

- **Entity:** `MessageDelivery` · **Thin drawer**

### 7.28 Configuration — Tools

- **Surface:** Layout variant at `/configuration/tools`
- **Tools:** Data import · timetable generation
- Generation requires scoped `TIMETABLE_CREATE` and updates the selected classes atomically. Generated sessions are immediately current for staff, teachers and families and printable; no publication lifecycle remains. Regeneration replaces only untouched pending generated sessions and preserves recorded work, linked records, manual exceptions and cancellations. Printing does not lock sessions.
- Weekly generation retains available recurring placements and repairs missing workload in available teaching slots while respecting teacher occupancy and subject spacing. Failures show localized class/subject names, the affected week, and placed/required counts; do not display raw solver messages or technical IDs.
- The timetable card exposes a Generate action without a term picker. The generation assistant retains its term presets, date-range controls and existing range defaults.
- Timetable generation selects current-year classes with searchable grade-grouped checkboxes, all selected initially, plus select-all/clear controls. Search does not alter selection. Subject settings and submitted overrides cover selected classes only. Generate the selected classes in one atomic school request; a failure leaves their current timetables intact. Preserve selection and settings when running again; reset them on reopening or changing school/year.
- The existing class list in the subject-settings panel is the sole inclusion and navigation surface; do not add a selector above the tabs. It shows every current-year class, grade headings and full-list selected/total counts, including excluded classes and single-class schools. Checkbox actions change inclusion only; included class names open their settings. Search never changes the displayed class. Excluding that class advances to the next included class in academic list order, wrapping when necessary; an empty selection clears the editor and disables generation. Preserve excluded drafts for re-inclusion, but omit them from the request. The generation button states the included class count on every setup tab.
- Workflow tools open URL-backed modals whose steps and substantive internal panels are addressable.
- The teacher assignments hub remains available at `/configuration/tools/teacher-assignments` without a card on the Tools page.

### 7.29 Configuration — Teacher assignments hub

- **Entity:** `TeacherAssignment` · standard list at `/configuration/tools/teacher-assignments`
- **Purpose:** School-wide assignment search and maintenance across teachers; complements the
  teacher-scoped Assignments drawer tab.
- **List:** search · class filter · teacher filter; create/edit/delete through URL-backed modals.

---

## 8. Entity → surface quick reference

Authoritative surface per entity. §7 has per-feature drawer/tab detail.

| Entity | Surface | Primary route |
|--------|---------|---------------|
| `Student` | Complex | `/school/students`, `/classes/{id}/students` |
| `StaffMember` | Complex | `/school/staff` |
| `Teacher` | Complex | `/school/teachers` |
| `Guardian` | Complex | `/school/guardians` |
| `Incident` | Complex | `/school/events` |
| `Activity` | Complex | `/school/activities` |
| `Announcement` | Complex | `/school/announcements` |
| Family feedback campaign | Complex | `/school/family-feedback` |
| `Assessment` | Complex | `/classes/{id}/evaluations` |
| `ClassSubject` / teaching | Complex | `/classes/{id}/teaching`, `/configuration/subjects` |
| `ReportCardResult` | Complex | `/classes/{id}/report-cards` |
| `ReportCardDefinition` | Complex | `/configuration/report-cards` |
| `StudentCharge` | Complex | `/finance/billing` |
| `ClassGroup` | Complex | `/configuration/classes` |
| `GradeLevel` | Complex | `/configuration/grade-levels` |
| `CalendarEvent` | Simple | `/school/calendar` |
| `MessageDelivery` | Thin | `/account/inbox` |
| `CatalogService` | Simple | `/finance/fees` |
| `Payment` | Simple | `/finance/payment` |
| Reconciliation | Simple page | `/finance/reconciliation` |
| `GradeScale` | Accordion with interval editors | `/configuration/grade-scales` |
| `DisciplinaryAction` | Simple | `/configuration/other/discipline` |
| `SubjectCategory` | Simple | `/configuration/other/subject-categories` |
| `PeriodDefinition` | Layout | `/configuration/period-grid` |
| `StaffPermissionProfile` | Simple | `/configuration/permission-profiles` |
| Notification templates | Thin | `/configuration/notifications` |
| `School` | Layout | `/configuration/school` |
| Dashboard / academic admin | Layout | `/dashboard`, `/configuration/academic` |
| Timetable occurrences | Layout + drawer | `/classes/{id}/timetable` |

Sub-entities (`studentIncidentInvolvements`, `staffPermissionAssignments`, `teacherAssignments`, `classActivityEnrollments`, etc.) appear as **drawer sub-collections** or modal payloads — never as standalone nav items.

---

## 9. API conventions (key commands)

| UI flow | Command / entity |
|---------|------------------|
| Log incident | `recordIncident` + `addStudentInvolvement` |
| Resolve incident | **`resolveIncidentWithOutcomes`** |
| Daily attendance bulk | `record-class-daily-attendance` |
| Staff permissions | `configurePermissionProfile` · `applyStaffPermissionProfile` · `reorderStaffPermissionProfiles` · `removeStaffPermissionProfile` · custom `assignStaffPermission` + permission catalog APIs |
| Timetable materialize | `createSchedule` · `materializeSchedule` |
| Class activity link | `classActivityEnrollments` entity CRUD |

Incident content editing uses `DISCIPLINE_UPDATE`; resolution uses `DISCIPLINE_VALIDATE`; cancellation and deletion use `DISCIPLINE_ARCHIVE`. The resolve command also checks the permissions needed to add or change participants and apply sanctions. Each visible action must display its own required permission.

Regenerate the API client in **edaya_backend** after API changes (`bun repo openapi generate`), then refresh the web dependency.

---

## 10. Agent implementation checklist

When building or refactoring a screen:

1. **Classify** the entity — complex · simple · thin · layout (§3).
2. **Match route** to §6 — do not invent parallel routes removed in §1.3.
3. **Apply toolbar** order and `<select>` main filter on standard list pages (§2.3); respect layout-variant exceptions (§2.4).
4. **Check locked decisions** (§4) — especially homework, roles, permissions, attendance mode, incident resolve.
5. **Do not** add resource UI, `/configuration/roles`, or `/homework` nav.

For interaction patterns, shared components, data loading, visuals, and state — read the other six agent specs (same index as root `AGENTS.md`).

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-06 | Conflict resolution §2.1–2.2; layout-variant toolbar exceptions |
| 2026-07-06 | Self-contained spec; removed cross-doc links |
| 2026-07-03 | §5.3.1 Staff permission UI; expanded incidents, timetable, assessments |
| 2026-07-03 | Initial normative spec |


### Personal communications

The personal inbox queries deliveries by login subject and selected recipient kind/id together, including for school owners. Selecting another profile never merges personal delivery or read state. The announcements entry is available to every signed-in profile; the backend restricts rows to current audiences and any explicitly granted administrative scope. Administrative mutations still require their canonical actions. Do not invent school-wide grants to make personal communications navigation visible.

## Marks approval

`/school/marks-review` is a paginated staff review queue gated by GRADE_VALIDATE. Rows link to the existing evaluation Grading drawer. Review, submit, and return use named commands and URL-backed confirmation modals. Draft marks are editable; Submitted and Approved marks are frozen. Return requires a reason. Review permission and separation of duties are determined by the server.

## Marks submission and corrections

Evaluation sheets use Draft → Submitted. Submission makes marks official and visible to families. Submitted grading settings and rosters are frozen. Selected scores, absence/exemption designations, and mark comments may be proposed in one immutable pending batch per evaluation, with a reason and confirmation summary. Staff review uses a read-only comparison and URL-addressed approve/reject modals. Only the author may withdraw; the author cannot review their own request across profiles. Published report source marks are permanently locked individually. Pending corrections block publication only for affected students. The school marks-review route lists correction requests and links to the evaluation Grading drawer.

## Account security

Account authentication is independent of school actors. `/account/security` supports verified email/phone linking and optional authenticator enrollment, including before school creation. Telegram and WhatsApp are phone OTP delivery channels, not social identity providers. Invitation preview/opening is not contact verification; acceptance retains the existing invitation lifecycle and checks verified Account contacts.

## Integration contract maintenance

Production route, navigation, modal and action changes must update the integration scenario contract and executable assertions in the same PR. Navigation assertions do not satisfy mutations; verify saved state after reload and applicable denied operations. Keep exclusions explicit and never count them as behavioral coverage.

## Teacher correction review

`/school/corrections` is the last School navigation item on desktop and mobile. Any of GRADE_VALIDATE, ATTENDANCE_VALIDATE, CLASS_LOGBOOK_VALIDATE, DISCIPLINE_VALIDATE, or REPORT_CARD_PUBLISH can expose it; the server scopes each workflow separately. `/school/marks-review` redirects to the queue with the Grades filter. The queue handles marks, submitted attendance, published report comments, validated logbooks, and staff-managed incidents. Other teacher workflows keep their existing lifecycle. Logbook validation and incident takeover are explicit staff actions; opening a detail never performs either action.

### Guardian messaging

`/school/messages` is a complex conversation collection with optional detail `/school/messages/{id}`. School enquiries and teacher conversations share one combined inbox by default, ordered and paged together by the server. Each row carries a School/Teacher tag; an optional `type=school|teacher` filter narrows the same list. Legacy `view` links map to that filter. Status and order filters are URL-backed. Conversation details show immutable text history, captured family context and actual authors. School replies use `?modal=reply`; teacher oversight is read-only. Dedicated SCHOOL_MESSAGES_READ, SCHOOL_MESSAGES_REPLY and TEACHER_MESSAGES_REVIEW permissions govern these surfaces independently of announcements.

Permission impact review in profile editing, profile assignment, manual assignment, and default-scope editing is tied to an immutable snapshot of the complete submitted command, including school, staff/profile/source identifiers, academic year, scopes, defaults inclusion, and validity. Inputs remain editable during review. Changes, closure/reset, or target replacement invalidate review; outdated responses cannot enable Save or replace newer reports/loading state. Save requires a successful review matching current inputs.


## Configurable grading models

Grade scales retain stable interval identifiers, codes, labels, minimum thresholds, pass/fail flags, and optional assigned points. Ordinary metadata edits preserve intervals. Each interval has its own form; upper bounds are derived on the server from the next minimum. Matching uses the greatest minimum at or below the rounded result, includes the final maximum, and rejects out-of-range values. Unique codes/thresholds and a first threshold equal to the scale minimum are required. Catalog saves use revisions and never recalculate marks; explicitly applying a scale to a grade level retains the confirmation/background-update flow. Continuous scale bounds must be representable at the selected precision so rounding cannot leave the scale. Seeded and onboarded scales use continuous intervals with stable IDs and derived upper bounds; there is no conversion step in the configuration page. Historical readers retain captured interval conventions.

Grade-level drawers own a URL-addressed grading modal for the current academic year. Each policy selects one scale, mandatory numeric-first or mention-first entry, and an aggregate label. Report models inherit that scale; they do not offer an independent conflicting selector. The configuration form collects explicit numeric equivalents for previous mention revisions when switching to numeric-first.

Calculation changes use exactly one confirmation before saving. The drawer displays Updating, Completed, or Failed with Retry. No impact dashboard or affected-record preview is provided. Drafts keep their opening revision and year so changes elsewhere cannot silently rebase an edit. Presentation labels do not recalculate marks.

Entry and correction forms use numeric fields or configured mention choices according to the policy. Original entries remain visible independently of derived values. Report displays use captured units, precision, and matched mentions rather than the mutable scale catalogue. Published results remain visible while a revised draft is reviewed, and the publish command sends that draft's exact policy revision and version. Bulk publication must not implicitly approve grading revisions.
