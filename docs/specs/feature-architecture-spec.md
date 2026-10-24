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
| **Complex** | URL-backed read-only drawer | Entity-header actions → modals; sub-collections read-only, `+ Add` → modal | Student, Staff, Assessment, Incident, CatalogService (fees), Billing |
| **Simple** | None | Row `···` menu → modals | Payment, GradeScale, DisciplinaryAction, CalendarEvent |
| **Thin drawer** | Sections only (no tabs) | Header actions → modals | Inbox delivery, Notification templates |
| **Layout variant** | None | Page-level or inline modals | Dashboard, School profile, Academic calendar accordion, Finance checks |

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
| **Subject** | Owned by the selected grade and academic year; create/edit in the Subjects tab, including before any class exists. |
| **Subject workload** | Configuration → Subjects → existing Edit subject form includes weekly periods and session span bounds. Values belong to the subject for the selected academic year and mirror to its classes. Class progression and Chapters tabs contain no workload editor. |
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
| **Catalog** | `/configuration/permission-profiles` — simple list (discipline analog). Read `ACCESS_CONTROL_READ`; create/edit/delete `ACCESS_CONTROL_MANAGE`. |
| **Location (grants)** | Staff drawer → **Permissions** tab (`/school/staff/{id}`) |
| **Mutation pattern** | **Modal-only** for custom grants and apply/remove; reorder via explicit up/down. No inline permission toggles, no CRUD matrix layout |
| **Navigation** | Staff drawer has Profile and Permissions tabs. Permission actions live inside Permissions; no redundant Manage permissions header button. Legacy staff Assignments URLs redirect to Permissions. |
| **Gating** | Apply / remove / reorder / custom add-edit-delete require `ACCESS_CONTROL_MANAGE` via `PermissionGate` (`hide` or `disable` + tooltip) |

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
| **Locked profile groups** | Bindings in `sortOrder` (0 = highest). Each group starts collapsed and independently expands its permission list. The profile name, permission count, effective scope tags, warning summary and gated actions remain visible. Effective scope tags sit beside the profile name and wrap when needed. Tags deduplicate by typed scope identity and exclude unavailable or ineffective grants. Expansion follows binding identity through reordering and resets for a different staff member, school or year. Later profiles **skip** permissions already claimed by an earlier profile — muted hint “already granted by {profile}”. No row Edit/Delete on stamped grants. |
| **Reorder** | Up/down rewrites `sortOrder` then re-resolves that staff for the selected year (first-wins). An unresolved earlier profile still claims the permission; later profiles cannot silently broaden it. |
| **Remove profile** | Confirm → drop binding, re-resolve remaining. Custom grants remain. |
| **Apply / edit profile** | Modal: profile picker, include-defaults checkbox (on initially), grouped scope selections relevant to the bundle. Review generated access changes before save. Appends at lowest rank for the selected year. Re-applying the same profile updates saved selections and keeps rank. |
| **Allowed scope types** | Permission names in the profile checklist, applied profile rows and custom permission rows show wrapping scope-type tags from the same catalog and `permissionSelectionGrains` mapping used by the editor. These describe accepted types, independently of effective scope tags. Manual permission options include the types before selection; the selected permission shows tags. |
| **Default scopes** | Selected-year summary with every saved scope rendered as a wrapping tag, an explicit empty state, and Edit modal with grouped selections. Review added, changed and removed access before saving. Re-resolves profile and manual assignments that include defaults. |
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
| `subject` | Grade → Subject / All subjects → All classes / Selected classes | `gradeLevelId`, optional `subjectId`, optional `classGroupId`; repeat entries for multiple classes |
| `student` | Repeatable StudentPicker | `studentId` |
| `activity` | Activity and/or class selection | `activityId` and/or `classGroupId` |
| `platform` | Not assignable in school UI | — |

Subject scope uses the grade-owned Subject identity. No class restriction includes matching classes created later in the grant’s academic year. `subjectClassRequired` in the permission catalog requires a selected class and disables the global All subjects wildcard; a profile uses this constraint when all its Subject-capable permissions require a class. Mixed profiles can also select unrestricted Subject scopes for compatible permissions; the preview reports the class-required permissions that remain unresolved. Defaults remain permission-independent and the existing preview reports permissions that cannot resolve. Changing the grade preserves restricted mode and requires selecting a compatible class again; changing the subject preserves the class. `ClassSubject` remains the teaching record, never a permission scope.

Every entry carries its `kind`. Selecting all targets is explicit: `{ kind: "all", grain }`. Empty selections deny; they never mean whole school. Scope editing preserves all entries and the grant's validity dates.

Scope labels use `POST authorization/scope/render` with `{ academicYearId, items: [{ permission, scopes }] }`. Default selection labels use `POST authorization/scope-selections/render` with `{ academicYearId, scopes }`, returning `{ scopes: [{ scope, label, missing }] }`. It accepts mixed selection grains, requires access-control read authorization, and validates resource ownership and academic placement independently of any permission. The web never creates or parses delimited authorization paths.

The session contains one typed action-grant display. UI checks use that action's scopes and validity; owner labels and preset names never bypass those checks. The server remains authoritative for resource policies.

**Data loading:**

- `querySchoolStaffPage` loads `permission-catalog` into the staff route state.
- Assignments load via the Permissions tab child route `PageQuery` (or with staff list when colocated); views built via `buildStaffPermissionAssignmentViews`.
- Mutations: `configurePermissionProfile` / `applyStaffPermissionProfile` / `reorderStaffPermissionProfiles` / `removeStaffPermissionProfile` for bound grants; `assignStaffPermission` / `removeStaffPermission` for manual sources and `configureStaffPermissionScopeDefaults` for defaults. Preview commands never write. Optimistic patch + `entityVersions` bump (`staff`).

**Staff assignments:** managed in the Configuration → Levels and Classes → Classes drawer. Staff drawers have no Assignments tab; old `/school/staff/{id}/assignments` links redirect to Permissions, preserving query parameters.

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
| Finance landing | `/finance` | Redirect to `/finance/fees` |
| Fees | `/finance/fees` | `/finance/fees/{feeId}` |
| Billing | `/finance/billing` | `/finance/billing/{chargeId}` (Overview) |
| Billing payments applied | `/finance/billing/{chargeId}/payments` | Same persistent billing drawer |
| Billing history | `/finance/billing/{chargeId}/history` | Same persistent billing drawer |
| Payments | `/finance/payment` | — |
| Legacy reconciliation | `/finance/reconciliation` | Redirect to `/configuration/tools/finance-checks` |
| School profile | `/configuration/school` | — |
| Academic calendar | `/configuration/academic` | — |
| Weekly period grid | `/configuration/period-grid` | — |
| Levels and Classes | `/configuration/structure` | Selected level in `?gradeLevel=` |
| Grade level details tab | `/configuration/structure/details` | Level fields and grading configuration |
| Classes config tab | `/configuration/structure/classes` | `/configuration/structure/classes/{id}` |
| Subjects config tab | `/configuration/structure/subjects` | `/configuration/structure/subjects/{id}` |
| Report card models | `/configuration/structure/details` | `/configuration/structure/details/report-cards/{id}` |
| Other configurations | `/configuration/other` | — |
| Grade scales | `/configuration/grade-scales` | — |
| Notification templates | `/configuration/notifications` | `/configuration/notifications/{key}` |
| Disciplinary catalog | `/configuration/other/discipline` | — |
| Subject categories | `/configuration/other/subject-categories` | — |
| Permission profiles | `/configuration/permission-profiles` | — |
| Configuration tools | `/configuration/tools` | — |
| Finance checks | `/configuration/tools/finance-checks` | — |
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
- **Names:** Create/edit accepts an empty first name with a required last name. Display names omit surrounding whitespace; no placeholder or inferred name component is added.
- **List:** search name · main filter relation type
- **Drawer header:** Edit · Link student
- **Drawer body:** Contact · account linking · linked students

### 7.4 School — Staff

- **Account scope:** human staff only. Apply `accountKind = human` to lists, counts and direct drawer lookup before pagination. Service-account lifecycle and permission changes use the dedicated service-account API, never ordinary staff forms.
- **Entity:** `StaffMember` · **Complex drawer**
- **List:** search name · main filter assigned class · filter active/inactive
- **Drawer header:** Edit profile
- **Drawer tabs:** Profile · **Permissions** (locked profile groups + editable custom `staffPermissionAssignments`)
- **Create:** optional permission bundle (rank 0) with scope selections for the current academic year. The form loads profiles and the permission catalog together without depending on a prior Permissions-tab visit. Disable the profile picker while loading; show an error and retry on failure. Staff creation without a profile remains available. A selected profile requires ready scope metadata before submission.

### 7.4.1 School — Teachers

- **Entity:** `Teacher` · **Complex drawer** (**Teacher 360**)
- **Nav:** School → Teachers count chip from `getAppShellCounts.teacherCount` (school-wide total)
- **List:** search name · filter active/inactive · CTA Add teacher · row `···` (Edit profile · Delete)
- **Drawer header:** photo (immediate publish, like guardian) · active/inactive chip · assignment-count summary · Edit profile · overflow Delete
- **Drawer tabs** (hide a tab the caller cannot read):
  - **Profile** — identity including code, contact, active toggle, account linking
  - **Assignments** (`teacherAssignments`; subject + homeroom kinds) — Homeroom assignments first, then Teaching assignments, both always visible with localized empty states. Rows lead with class or class · subject; omit repeated assignment-kind labels. Retain one Add assignment CTA, class timetable links, add/edit modal and delete confirmation.
  - **Availability** (`teacherUnavailabilities`) — `ACCESS_CONTROL_MANAGE` or `SCHOOL_STRUCTURE_CONFIGURE`
  - **Timetable** — teacher-scoped academic-year agenda (`getTeacherTimetable`), gated by `QUERY_TIMETABLE_READ`; chronological day groups in the school time zone with fixed teacher identity, tabs and Today/date controls above an independently scrolling session list with bold date headings. Initially jump to today (clamped to year bounds), or the URL date; insert one empty day marker when the target has no sessions. Today is disabled outside the selected year. Rows retain links to class timetable occurrences.
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

- Permission catalog grouping: **Assessments and marks** / **Évaluations et notes** contains `ASSESSMENT_READ`, `ASSESSMENT_MANAGE`, `GRADE_READ`, `GRADE_MANAGE`, and `GRADE_VALIDATE`. `GRADE_SCALE_CONFIGURE` belongs to Academic configuration. Retired exam identifiers have no compatibility aliases.
- Assessment read or management authority admits the assessment workspace independently of marks. Create, edit, delete and direct edit/delete modal submission check `ASSESSMENT_MANAGE` for the relevant class/subject and assessment; edits check both old and proposed subjects. Grading controls retain their mark permissions.
- The bounded assessment context supplies setup and optional authorized mark results. Mark-read scope is independent from assessment setup scope. List/detail statistics distinguish authorized zero progress from unavailable results; unavailable marks show no numeric progress or average. Setup-only users have no Grading tab. Editing reloads the definition through the bounded context without requiring a general assessment read grant.

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

- **Entity:** `CatalogService` · **Complex drawer**, human label **fees / frais**.
- Sidebar finance order is **Fees → Billing → Payments**; finance pages omit a duplicate local switcher. `/finance` redirects to `/finance/fees`.
- `/finance/fees` is the financial overview above the searchable catalog with category and status controls inside one Filter button. Add fee is the primary action. Catalog filters never constrain financial totals.
- Headline cards match fee details: **Billed**, **Payments**, **Outstanding**, **Overdue**. Billed shows the net amount after adjustments and waivers, with a top-right chip for distinct assigned students. Payments shows active allocations applied to charges. Overdue shows its amount in the dark-red destructive text token, with distinct overdue students in a top-right chip. Scope is the selected school/year and authorized `PAYMENT_READ` records; catalog filters never affect these totals. Omit Received/Refunded and scope captions. Cancelled charges contribute no obligation; overdue is bounded by remaining obligations. Errors and unavailable data never become zero.
- `/finance/fees/{feeId}` opens the URL-backed drawer with an **Overview** tab. Header: name, category, status, academic year, default amount; **Edit fee** and **Assign fee**; overflow **Archive** / **Activate**. Assignment requires an active fee and authorization.
- Overview shows Billed, Payments, Outstanding and Overdue cards. The Billed card has a top-right chip for distinct assigned students (excluding cancelled charges); there is no separate Students assigned card. The Overdue card places its student count in a top-right chip. Show description, enrollment mode, default amount and read-only original terms. Links open Billing filtered by fee, optionally outstanding/overdue. Account receipts, refunds and credit are not fee-level settlement measures.
- Assign fee is a modal with the selected fee fixed, single/batch ≤100 students. Mutations preserve the current editor's unmodified fields. Catalog edits affect future assignments only; existing labels, amounts, schedules and archived history remain intact.
- Fees navigation allows catalog-read or payment-read users. Catalog-only users see configuration without financial amounts. Use the configured currency and integer minor units; no fallback currency.

### 7.16 Finance — Billing

- **Entity:** `StudentCharge` · **Complex drawer**, one assigned fee for one student. No grouped invoice entity.
- List has no financial summary cards. **Assign fee** is the primary action. Student/fee search, class selector, secondary fee/status/due filters and server-side sorting/pagination apply before matching counts and export. Reminder exports deduplicate student/year accounts.
- `/finance/billing/{chargeId}` = **Overview**; `/payments` = **Payments**; `/history` = **History**. Header persists across tabs, with assigned fee, student, status and remaining balance.
- At most two visible header actions: **Record payment**, **Apply credit**. Overflow: adjustment, waiver, reverse allocation, cancellation, **Download account invoice** (clearly account-wide).
- Action eligibility must guard controls, direct modal URLs and submissions. Hide missing permissions; disable state-blocked actions with explanations. Recording requires an open balance; applying credit requires `PAYMENT_ALLOCATE`, balance and credit; reverse allocation requires `PAYMENT_ALLOCATE` and active allocations, not payment-reversal permission. Adjustment/waiver require recording permission, balance, and no prior corresponding event. Cancellation requires recording plus cancellation permissions, no active allocations, and a reason. Waivers require reasons. Backend limits remain authoritative.
- Overview preserves original amount, reduction amounts, net payable, applied, remaining, original schedule with partial attribution, and cancellation facts/zero current obligation. Charge-level reductions must not be silently redistributed across installments.
- The Payments tab filters account history to this charge. Active totals exclude reversals; source-less allocations are **Account credit**. Receipt actions refer only to the linked eligible payment.
- History derives only persisted creation, adjustment, waiver, cancellation, allocation and reversal facts, newest first with deterministic ties; unavailable actors are **Not recorded**. No new audit-log system.

### 7.17 Finance — Payments

- **Entity:** `Payment` · **Simple**, `/finance/payment`, no drawer and no collection-summary cards.
- Primary **Record payment**; refunds in More; receipts and refunds remain distinct. Reverse only recorded receipts. Receipt/settlement documents require eligible source records.
- Shared route-owned payment form: select student then explicitly select fees and allocation amounts. Billing entry preselects its student/fee. **Deposit only** and **Oldest due first** remain explicit alternatives, never silent fallbacks. Preview receipt, existing credit, allocations and resulting credit with submission semantics. Preserve method/date/reference/notes, failed drafts and duplicate-submission protection. Students without charges can select deposit-only.

### 7.17.1 Configuration Tools — Finance checks

- `/configuration/tools/finance-checks` contains the existing reconciliation report, loading state and export. `/finance/reconciliation` redirects compatibly.
- Preserve `FINANCIAL_REPORT_READ` and `getFinanceReconciliation`. Report-only users can reach Tools without import/timetable authority. Unrelated planning data must not block this page. Finance checks is absent from Finance navigation.

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
- Mutations require `SCHOOL_CONFIGURE`

- The resizable SVAR calendar is the sole weekly view, including empty years. Legacy `display` parameters have no effect. Dragging an empty range opens the existing slot creation modal with snapped times and weekday. Slot cards expose Edit and Delete on hover, focus or selection; deletion retains confirmation. Weekday/time data and existing mutation modals remain authoritative. Dragging changes start/end time and optionally weekday while preserving duration; resizing changes end time. Both use five-minute steps, same-day and destination-overlap checks.

### 7.20 Configuration — Grade levels

- **Entity:** `GradeLevel` · **Layout selection** in the unified Levels and Classes screen.
- `/configuration/structure` defaults to Details. A flat level rail selects `?gradeLevel=`; Details, Subjects and Classes are nested route tabs. Mobile uses a labeled level selector above the tabs. Keep empty levels visible and sort with the shared level ordering.
- The Details tab owns level fields, grading summary, one Edit level form containing grading settings, and overflow Delete. Creation uses the same fields. Preserve separate structure/grading permissions and calculation-change confirmation. Level forms use `create-level`, `edit-level`, and `delete-level`; old `level-grading` links redirect to `edit-level`.
- Classes and subjects are scoped to the selected level and workspace academic year. Creation defaults to that level. Workload stays in Edit subject and applies to matching classes; edit weekly workload in periods, never inferred chapter hours. Keep the subject list free of weekly-period labels. Class rows open the drawer, whose Edit action owns class changes; omit redundant grade-level columns and row edit menus.
- Subject and class drawers remain read-only with their existing chapters / profile / staff-assignment surfaces. Old `/configuration/grade-levels`, `/configuration/classes` and `/configuration/subjects` URLs redirect, retaining valid entity, tab and modal context. Grade-scale catalog stays separate.
- The sidebar exposes one combined entry with the union of the former entries’ read permissions; each tab and mutation retains its own permission gates.

### 7.21 Configuration — Classes

- **Entity:** `ClassGroup` · **Complex drawer** (URL-backed)
- **Profile fields:** `attendanceMode` · `homeroomStaffId` · capacity · labels
- **Tab:** **Staff assignments** (class-level only)
- `homeroomStaffId` stores the staff coordinator only. Homeroom teachers come from current `TeacherAssignment` rows with kind `homeroom`; these are distinct business facts.
- The profile query loads teacher assignments for the selected class and its academic year into route state. Optional forbidden enrichment leaves the teacher display empty.
- Teacher labels require active teacher profiles and active assignments within their validity interval. Staff assignments never fill missing subject or homeroom teacher labels.

### 7.22 Configuration — Subjects catalog

- **Entity:** `Subject` · **Complex drawer**
- Each Subject belongs to one grade and academic year. Same-name subjects remain distinct by ID. Subject chapters are shared with class offerings; class progress stays independent.
- Create and edit use atomic subject/chapter commands with scoped `ACADEMIC_PROGRAM_MANAGE`. Categories keep catalogue permissions. No standalone class subject creation.
- Chapter imports accept `subjectId` to resolve ambiguous names. Subjects and chapters may be created before classes.

### 7.23 Configuration — Report card models

- **Entities:** `ReportCardDefinition` · sections tree · **Complex drawer**.
- `REPORT_CARD_CONFIGURE` enables name/description, optional passing threshold and section editing, including published models. The threshold may be any value within the inherited scale bounds and precision, including inside an interval; blank disables classification. Overall averages at or above it pass. Year, grade level, default/publication state and existing IDs remain fixed. Grading settings are inherited from the level/year policy, with no independent scale selector.
- Section forms edit labels, group/subject role, subject mapping, parent, order and positive weight/coefficient. Descendant parents and deletion of nonempty groups are forbidden. Revision-checked saves reject stale editors.
- Changes affect future explicit generation/regeneration only. Existing results, review decisions and published documents retain their captured content.

### 7.24 Configuration — Grade scales

- **Entity:** `GradeScale` · accordion scales with nested interval rows, matching the academic-year layout. Each interval has permission-gated Edit and Delete actions in its overflow menu. Sample lookup displays its matching code/mention beside the input, wrapping only when space requires it.
- Route: `/configuration/grade-scales`, immediately above Levels and Classes in the configuration menu; legacy `/configuration/other/grade-scales` redirects with search/modal parameters preserved.
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

- **Entity:** `StaffPermissionProfile` · **Complex** list + read-only drawer at `/configuration/permission-profiles/{id}`; rows open the drawer and have no action menu.
- **List:** search name/description · bound-staff count; CTA Add profile (`ACCESS_CONTROL_MANAGE`)
- **Drawer:** DrawerEntityHeader with Edit and overflow Delete, description, permission and assigned-staff counts, and expanded permission groups with localized labels and supported scope types. Show saved codes absent from the current catalog using the label fallback.
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
| `ClassSubject` / teaching | Complex | `/classes/{id}/teaching`, `/configuration/structure/subjects` |
| `ReportCardResult` | Complex | `/classes/{id}/report-cards` |
| `ReportCardDefinition` | Complex | `/configuration/structure/details` |
| `StudentCharge` | Complex | `/finance/billing` |
| `ClassGroup` | Complex | `/configuration/structure/classes` |
| `GradeLevel` | Layout selection | `/configuration/structure` |
| `CalendarEvent` | Simple | `/school/calendar` |
| `MessageDelivery` | Thin | `/account/inbox` |
| `CatalogService` | Complex | `/finance/fees` |
| `Payment` | Simple | `/finance/payment` |
| Finance checks | Layout variant | `/configuration/tools/finance-checks` |
| `GradeScale` | Accordion with interval editors | `/configuration/grade-scales` |
| `DisciplinaryAction` | Simple | `/configuration/other/discipline` |
| `SubjectCategory` | Simple | `/configuration/other/subject-categories` |
| `PeriodDefinition` | Layout | `/configuration/period-grid` |
| `StaffPermissionProfile` | Complex | `/configuration/permission-profiles` |
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

Grade scales retain stable interval identifiers, codes, labels, minimum thresholds and optional assigned points. Passing is an optional report-card model setting for the overall average only; it is never interval or scale metadata. Ordinary metadata edits preserve intervals. Each interval has its own form; upper bounds are derived on the server from the next minimum. Matching uses the greatest minimum at or below the rounded result, includes the final maximum, and rejects out-of-range values. Unique codes/thresholds and a first threshold equal to the scale minimum are required. Catalog saves use revisions and never recalculate marks; explicitly applying a scale to a grade level retains the confirmation/background-update flow. Continuous scale bounds must be representable at the selected precision so rounding cannot leave the scale. Seeded and onboarded scales use continuous intervals with stable IDs and derived upper bounds; there is no conversion step in the configuration page. Historical readers retain captured interval conventions.

Grade-level drawers own a URL-addressed grading modal for the current academic year. Each policy selects one scale, mandatory numeric-first or mention-first entry, and an aggregate label. Report models inherit that scale; they do not offer an independent conflicting selector. The configuration form collects explicit numeric equivalents for previous mention revisions when switching to numeric-first.

Calculation changes use exactly one confirmation before saving. The drawer displays Updating, Completed, or Failed with Retry. No impact dashboard or affected-record preview is provided. Drafts keep their opening revision and year so changes elsewhere cannot silently rebase an edit. Presentation labels do not recalculate marks.

Entry and correction forms use numeric fields or configured mention choices according to the policy. Original entries remain visible independently of derived values. Report displays use captured units, precision, and matched mentions rather than the mutable scale catalogue. Published results remain visible while a revised draft is reviewed, and the publish command sends that draft's exact policy revision and version. Bulk publication must not implicitly approve grading revisions.

### Report card templates in level Details

Levels and Classes → Details contains Report card templates below the level's grading settings. The collection is scoped to the selected level and workspace academic year, with multiple templates supported. Show all templates in that scope without search or status-filter controls; legacy search/status parameters do not restrict the collection. The section header exposes only Add model; omit its export menu and standalone row Edit buttons. Clicking a template opens its drawer, which retains editing actions. Template cards keep the white card surface on hover and selection, using the border and focus ring for feedback. Creation captures and displays that level/year as read-only; scope changes discard the open create surface. Existing template mutations and REPORT_CARD_CONFIGURE gates remain in effect. The combined navigation entry includes REPORT_CARD_CONFIGURE and there is no separate templates entry.

The Details layout owns ReportCardsPageState and its PageQuery. Template drawers use `/configuration/structure/details/report-cards/{id}`; closing returns to Details with the level selection and filters retained. Changing level or year closes the prior drawer/modal. Legacy `/configuration/report-cards` URLs redirect, retaining modal/filter context; a template deep link resolves its own level and academic year before editing. Grading scales stay separate. No persistence or report-generation behavior changes.


## Canonical permission catalog and resource selections

The API catalog's `staffAssignable`, `serviceAccountAssignable`, `assignmentTargets` and `scopePolicy` determine picker availability. Do not infer eligibility from action names or maintain permission-specific scope exceptions. Unscoped actions have no scope/default controls, supported-scope badges, or effective-scope labels. Their internal `school` grant marker is never a user selection. Profiles automatically include their unscoped actions; mixed profiles expose resource selectors only for resource-scoped members. Default scopes contain resource selections only. Empty resource selections grant no access; broad access requires explicit All at a supported grain. Preserve preview/save identity, ordering, first-wins and unresolved/shadowed warnings.

## School intake configuration and annual profiles

Other configurations contains separate school-wide Academic disciplines and Placement statuses catalogues. Academic disciplines are independent of subject categories, chapters and disciplinary sanctions. Codes are immutable and school-unique ignoring case; labels/names and active state are editable. New subjects require a discipline. Legacy unlinked subjects display Not configured and support unrelated edits; a mapped subject retains its required association. Teacher annual discipline selections share this catalogue and do not create teaching assignments or permissions. Existing inactive references remain readable, while new selections require active entries. Referenced entries cannot be deleted.

Student and teacher annual information belongs to the explicitly selected academic year, surviving within-year transfers without being copied into a new year. Editors capture person, school and year; stale context blocks saving. Student annual information includes placement status and a three-state repeating value. Teacher declarations include disciplines, nullable nonnegative fractional hours and their explicit period. Removal deletes only the annual profile. The initial catalogue is empty; subject names never supply automatic mappings.

All staff-facing business fields must have a contextual editor, established command/workflow or read-only display. The field-coverage reference records list availability, detail/editor surfaces, permissions and deliberate exclusions. Platform/service-account administration, credentials, internal processing metadata and deferred resource booking are excluded from ordinary staff forms. Teacher signatures and self-service notification contacts remain owner-controlled. Health, financial and family-feedback restrictions continue to apply.

Onboarding template subjects require explicit review of each discipline code and name before provisioning. The initial inputs are blank. Staff may deliberately reuse a code/name across template subjects to share a discipline. Provisioning validates the reviewed catalogue inside its transaction and rejects missing, conflicting or inactive mappings; it cannot create unlinked subjects.

### Durable school imports

Configuration → Tools → Import owns a durable, school/year-scoped batch. `modalTarget` retains the batch identity across reloads. The route state calls generated `imports` APIs; components only present settings, file selection, read-only preview, history, correction downloads and progress. No browser parser, matcher, validator or execution loop is authoritative.

The single session setting is `S | M | O`, initially `M`. File metadata has no conflict option. The optional `on_existing` column overrides individual rows; the preview displays the effective code. Saving settings invalidates the preview. Confirmation uses the exact validated revision and digest. Failed mutations retain drafts.

Templates and correction reports come from the server's versioned contracts. Correct files externally, retain row IDs and re-upload as a new file revision. Table preview shows source references, current/imported/resulting values, authorized targets and issue codes. Blocked rows remain visible while independent ready rows run. Closing the modal stops polling only; scheduled work continues. UI refreshes use scoped domain version families. History and download access remain subject to current business permissions.

Human-staff phone is optional in create/edit, detail and configurable directory columns. Profile roles remain descriptive and never grant authority.

Phone import previews normalize a leading `#` to `+` only for phone fields, retaining original source cells. Guardian imports accept a last name with an empty first name. Blank first names preserve existing values in M and clear in O; missing columns preserve.
