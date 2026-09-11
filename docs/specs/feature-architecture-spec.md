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
| `/configuration/roles` | **Staff drawer → Permissions** tab (`staffPermissionAssignments`) |
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

Global header (all modules): **School** · **Academic year + period** · **Language** · **User menu**.

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
| **Simple** | None | Row `···` menu → modals | Fee, GradeScale, Payment, DisciplinaryAction, Notification templates |
| **Thin drawer** | Sections only (no tabs) | Header actions → modals | CalendarEvent, Inbox delivery |
| **Layout variant** | None | Page-level or inline modals | Dashboard, School profile, Academic calendar accordion |

**Drawer entity header** (complex + thin): identity block + **up to 2 primary actions** → modals. Destructive actions in overflow `···` only. Body = related content only — not a repeat of list columns.

---

## 4. Locked UX decisions

These are **fixed** for v1. Do not introduce alternate flows without updating this spec.

| Topic | Decision |
|-------|----------|
| **Staff assignments (config)** | **Class-level only** in Configuration → Classes drawer (`staffAssignments` with `classGroupId`). Lesson/session/subject-level assignment is post-v1. |
| **Staff permissions** | **Staff drawer → Permissions** tab (`staffPermissionAssignments`). No `/configuration/roles`. |
| **Incident resolve** | **One modal** — involved students, role, optional `DisciplinaryAction` per student, resolution notes. Command: **`resolveIncidentWithOutcomes`** (atomic). Drawer: involved students read-only; edits only via Resolve modal. |
| **Assessments by `kind`** | **One route** `/evaluations`. Same routed drawer for all kinds: Details + Grading child tabs; Grading shows the exclusive work surface (homework submissions vs grades grid). List row: **kind badge**. |
| **Homework** | `Assessment` with `kind = homework` on evaluations screen — **no** `/homework` nav. |
| **Timed assessments** | No exam menu. Appear on **timetable grid** and **evaluations list** (`startsAt`/`endsAt` or `lessonSessionId`). |
| **Daily attendance** | **List of days** + drawer (same pattern as timetable session). Edits **permission-gated**, not mode-locked UI. |
| **Timetable ↔ Schedule** | **From timetable:** New session wizard (Lesson · Activity · Assessment) → creates `Schedule` + materialized occurrence. **From Lessons / Activities / Assessments:** optional inline schedule on create/edit. |
| **Activity on class timetable** | `ActivityEnrollment` (school roster) + **`ClassActivityEnrollment`** (activity ↔ class link for timetable). |
| **Student Grades tab** | Read-only **links** to class assessment drawer (`/evaluations/{id}`). |
| **Global Subject** | Inline create/edit in subjects catalog — **no** dedicated Subject admin route. |
| **Student Attendance tab** | **Mode-agnostic** — all `AttendanceRecord` rows (daily + session anchors). |
| **`attendanceMode` on class** | Required on create; editable on class profile. Warn on mid-year mode switch if records exist for the other mode; never delete historical records. |

---

## 5. Domain rules

### 5.1 Class attendance mode

| Field | Control |
|-------|---------|
| `attendanceMode` | `<select>`: Daily roll call · Per session |
| `homeroomStaffId` | Staff picker (daily mode: owner of day board) |

**API commands (existing):**

- Daily: `record-daily-attendance`, `record-class-daily-attendance` (require `attendanceMode = daily`)
- Session: lesson/activity/assessment attendance commands (session anchors)

### 5.2 Discipline

| Entity | Surface |
|--------|---------|
| `Incident` | Complex drawer at `/school/events/[[id]]` |
| `StudentIncidentInvolvement` | Sub-collection on incident drawer; resolve modal writes via `resolveIncidentWithOutcomes` |
| `StudentDisciplinaryAction` | Created in resolve modal; show in drawer post-resolve (target) |
| `DisciplinaryAction` | Simple list at `/configuration/discipline` — row `···` menu |

### 5.3 Permissions

- Persist via `staffPermissionAssignments` entity CRUD.
- Picker labels: `GET authorization/permission-catalog` + `POST authorization/scope/render`.
- Client builds `scopeIds`; server validates on save.

#### 5.3.1 Staff permission assignment UI

Permissions are managed on **Staff drawer → Permissions** tab only. There is **no** `/configuration/roles` matrix screen in v1.

| Surface | Rule |
|---------|------|
| **Location** | Staff drawer → **Permissions** tab (`/school/staff/{id}`) |
| **Mutation pattern** | **Modal-only** — no inline permission toggles, no CRUD matrix layout |
| **Manage affordance** | Drawer header **Manage permissions** scrolls/focuses Permissions tab, or user switches tab manually |
| **Gating** | Add / edit / delete require `ACCESS_CONTROL_ASSIGN` via `PermissionGate` (`hide` or `disable` + tooltip) |

**Permissions tab anatomy** (drawer sub-collection pattern):

Sub-collection tabs use a read-only list with header CTA and row actions that open modals — never inline edit forms in the tab body.

```
┌ Permissions ─────────────────────────────── [+ Add permission] ┐
│  • GRADE_INPUT — 6ème A, 6ème B          [Edit] [Delete]         │
│  • TIMETABLE_UPDATE — Whole school        [Edit] [Delete]         │
│  • CLASS_SUBJECT_UPDATE — 5ème:* (synced)  (read-only badge)      │
└───────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Header CTA** | `+ Add permission` → **StaffPermissionFormModal** (create) |
| **Row** | Permission label (i18n `permission.{CODE}`) · **scope label** from `scope/render` |
| **Synced rows** | `sourceStaffAssignmentId` set → read-only; show “synced from assignment” badge; **no** edit/delete |
| **Stale scope** | When `scope/render` reports missing segments → warn badge (do not block read) |
| **Row actions** | Edit → same modal (pre-filled); Delete → confirm → entity delete |
| **Empty state** | Message + `+ Add permission` when user can assign |

**Add / edit modal** (`StaffPermissionFormModal`):

| Field | Control | Rule |
|-------|---------|------|
| **Permission** | `<select>` from catalog | Required; options from `GET authorization/permission-catalog` |
| **Scope** | `ScopeBuilder` | Shown only when catalog entry has `scope` ≠ `platform`; hidden for tenant-wide permissions |
| **Tenant-wide** | — | Empty `scopeIds`; show hint “whole school” |
| **Submit** | Save | `staffPermissionAssignments` entity save; toast on success; refresh tab list |

**ScopeBuilder** — one control set per catalog `scope` grain:

| Grain | UI | `scopeIds` grammar (client composes; server validates) |
|-------|-----|--------------------------------------------------------|
| `class_group` | Multi-select checkboxes (classes) | Comma-separated class IDs |
| `grade_level` | Single `<select>` | Grade level ID |
| `class_subject` | Repeatable rows: class + subject **or** class wildcard (`classId:*`) | `classId:subjectId` paths, comma-separated |
| `grade_level_subject` | Same as `class_subject` | Same path grammar |
| `student` | Multi-select checkboxes (students) | Comma-separated student IDs |
| `activity` | Activity picker + optional class link | `activityId` or `classId:activityId` |
| `platform` | — | Not assignable in school UI (catalog only) |

Scope labels in the list use `POST authorization/scope/render` with `{ permission, scopeIds }[]` — do not hand-format scope strings in the UI.

**Data loading:**

- `querySchoolStaffPage` loads `permission-catalog` into the staff route state.
- Assignments load via the Permissions tab child route `PageQuery` (or with staff list when colocated); views built via `buildStaffPermissionAssignmentViews`.
- Mutations: `saveStaffPermissionAssignmentMutation` / `deleteStaffPermissionAssignmentMutation` with optimistic patch on route state + `entityVersions` bump for every affected entity family.

**Staff drawer → Assignments tab** (read-only): summary list of `staffAssignments` (class-level and other targets). Editing assignments happens in **Configuration → Classes** drawer (class-level tab) — not on this tab.

**Removed:** `/configuration/roles` route, roles matrix, `StaffRoleAssignment` UI, inline CRUD matrix toggles for permissions.

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
| School profile | `/configuration/school` | — |
| Academic calendar | `/configuration/academic` | — |
| Grade levels | `/configuration/grade-levels` | `/configuration/grade-levels/{id}` |
| Classes config | `/configuration/classes` | `/configuration/classes/{id}` |
| Subjects catalog | `/configuration/subjects` | `/configuration/subjects/{id}` |
| Report card models | `/configuration/report-cards` | `/configuration/report-cards/{id}` |
| Grade scales | `/configuration/grade-scales` | — |
| Notification templates | `/configuration/notifications` | — |
| Disciplinary catalog | `/configuration/discipline` | — |
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
- **List:** search name · main filter class · filter enrollment status · CTA Add student
- **Drawer header:** Edit profile · Change class
- **Drawer tabs:** Profile (identity, health, guardians, notes) · **Grades** (links → `/evaluations/{id}`) · **Attendance** (all records) · Incidents · Finance · Report card · **Enrollments** (history)

### 7.3 School — Guardians

- **Entity:** `Guardian` · **Complex drawer**
- **List:** search name · main filter relation type
- **Drawer header:** Edit · Link student
- **Drawer body:** Contact · account linking · linked students

### 7.4 School — Staff

- **Entity:** `StaffMember` · **Complex drawer**
- **List:** search name · main filter assigned class · filter active/inactive
- **Drawer header:** Edit profile · Manage permissions
- **Drawer tabs:** Profile · **Permissions** (`staffPermissionAssignments` via modals) · Assignments (read-only `staffAssignments` summary)

### 7.4.1 School — Teachers

- **Entity:** `Teacher` · **Complex drawer**
- **List:** search name · filter active/inactive · CTA Add teacher
- **Drawer header:** Edit profile
- **Drawer tabs:** Profile (includes account linking) · **Assignments** (`teacherAssignments`;
  subject + homeroom kinds) · **Availability** (`teacherUnavailabilities`)
- **Modals:** Create teacher (optional portal invite) · Edit profile · Add/edit assignment

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
  1. Pick **kind** (homework · quiz · project · other)
  2. Core fields: title, subject/class subject, dates, grading config
  3. Optional **Add to timetable** (non-homework): schedule fields → `createSchedule` / materialize when checked
- **Timetable link:** non-homework with `startsAt`/`endsAt` or `lessonSessionId` appear on timetable grid **and** this list
- **No** `/homework` route or nav tab

### 7.13 Classes — Report cards

- **Entity:** `ReportCardResult` · **Complex drawer**
- **Drawer header:** Publish · Regenerate

### 7.14 Classes — Daily attendance

- **Entities:** `Attendance` · `AttendanceRecord`
- **Nav:** only when `attendanceMode = daily`
- **List:** rows = **days** (not student matrix)
- **Drawer:** same pattern as timetable session drawer
- **Commands:** `record-class-daily-attendance` · `record-daily-attendance`

### 7.15 Finance — Fees

- **Entity:** `Fee` · **Simple** (row `···` only — no drawer)
- Row menu: Edit · Delete

### 7.16 Finance — Billing

- **Entity:** `StudentFee` · **Complex drawer**
- Preserve billing history: use the cancellation/adjustment commands; do not offer generic hard deletion.
- **Drawer header:** Record payment · Waive

### 7.17 Finance — Payments

- **Entity:** `Payment` · **Simple** (row `···` only)
- Row menu: View receipt → navigate to **billing** drawer (`/finance/billing/{studentFeeId}`) — cross-entity deep link; Payment itself has no drawer

### 7.18 Configuration — School profile

- **Entity:** `School` · **Layout variant** — single page, edit modal

### 7.19 Configuration — Academic calendar

- **Entities:** `AcademicYear` · `AcademicPeriod` · `PeriodDefinition`
- Accordion by year; period + **period definition** CRUD via modals
- `PeriodDefinition` rows are **weekly slots** (`dayOfWeek` + times); single-row form and optional **quick-setup wizard** (preset → tweak template/weekdays → batch create)

### 7.20 Configuration — Grade levels

- **Entity:** `GradeLevel` · **Complex drawer**
- New route: `/configuration/grade-levels/[[id]]`

### 7.21 Configuration — Classes

- **Entity:** `ClassGroup` · **Complex drawer** (URL-backed)
- **Profile fields:** `attendanceMode` · `homeroomStaffId` · capacity · labels
- **Tab:** **Staff assignments** (class-level only)

### 7.22 Configuration — Subjects catalog

- **Entity:** `ClassSubject` / catalog entries · **Complex drawer**
- Global `Subject`: inline in catalog flows

### 7.23 Configuration — Report card models

- **Entities:** `ReportCardDefinition` · sections tree · **Complex drawer**

### 7.24 Configuration — Grade scales

- **Entity:** `GradeScale` · **Simple** (row `···` only)

### 7.25 Configuration — Notification templates

- **Entity:** school notification templates · **Simple** (row edit → modal)

### 7.26 Configuration — Disciplinary catalog

- **Entity:** `DisciplinaryAction` · **Simple** list + row `···` menu

### 7.27 Account — Inbox

- **Entity:** `MessageDelivery` · **Thin drawer**

### 7.28 Configuration — Tools

- **Surface:** Layout variant at `/configuration/tools`
- **Tools:** Data import · teacher assignments · timetable generation · timetable publication
- Teacher assignments links to the canonical `/configuration/tools/teacher-assignments` hub;
  workflow tools open URL-backed modals whose steps and substantive internal panels are addressable.

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
| `Assessment` | Complex | `/classes/{id}/evaluations` |
| `ClassSubject` / teaching | Complex | `/classes/{id}/teaching`, `/configuration/subjects` |
| `ReportCardResult` | Complex | `/classes/{id}/report-cards` |
| `ReportCardDefinition` | Complex | `/configuration/report-cards` |
| `StudentFee` | Complex | `/finance/billing` |
| `ClassGroup` | Complex | `/configuration/classes` |
| `GradeLevel` | Complex | `/configuration/grade-levels` |
| `CalendarEvent` | Thin | `/school/calendar` |
| `MessageDelivery` | Thin | `/account/inbox` |
| `Fee` | Simple | `/finance/fees` |
| `Payment` | Simple | `/finance/payment` |
| `GradeScale` | Simple | `/configuration/grade-scales` |
| `DisciplinaryAction` | Simple | `/configuration/discipline` |
| Notification templates | Simple | `/configuration/notifications` |
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
| Staff permissions | `staffPermissionAssignments` save + permission catalog APIs |
| Timetable materialize | `createSchedule` · `materializeSchedule` |
| Class activity link | `classActivityEnrollments` entity CRUD |

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
