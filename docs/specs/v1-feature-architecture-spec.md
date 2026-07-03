# V1 Feature Architecture Spec

> **Applies to:** `apps/webapp` — routes, modules, entities, domain UX rules  
> **Normative:** agents and implementers **must** follow this document for *what* to build.  
> **Companion specs (how to build):**
> - [app-shell-spec.md](./app-shell-spec.md) — list · drawer · modal interaction patterns
> - [design-language-spec.md](./design-language-spec.md) — visual design
> - [data-loading-spec.md](./data-loading-spec.md) — loading · entity store · mutations  
> **Living catalog & progress:** [ui-architecture-reference.md](../reference/ui-architecture-reference.md) — per-feature cards, gap tracker, entity audit (not normative for agents)

**Implementation plan:** [v1-staff-webapp-implementation-plan.md](../sprints/v1-staff-webapp-implementation-plan.md) — phased sprints (Phases 0–8)

This document is the **target end-state architecture** for the EDAYA staff webapp v1. It defines modules, routes, entity surfaces, and locked product decisions. It does **not** track sprint progress — use the reference doc for that.

---

## 1. Scope

### 1.1 In scope

All sidebar modules and account surfaces listed in §3, conforming to [app-shell-spec.md](./app-shell-spec.md).

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

### 2.3 List toolbar (all list pages)

Order: **`[Primary CTA] [Search] [Main filter ▾] [Filter ▾] [More ▾]`**

| Slot | Rule |
|------|------|
| **Primary CTA** | One create action → modal |
| **Search** | Always present; instant text filter on primary labels |
| **Main filter** | Always **`<select>`** — one high-frequency facet. **No chip bars or pill toggles.** |
| **Filter** | Secondary facets (status bands, date range, scope) |
| **More** | Export, bulk ops, view toggle |

### 2.4 Routing

```
/{module}/{entity}           → list
/{module}/{entity}/[id]      → list + detail drawer (complex entities only)
```

- Complex entities: row click → URL-backed drawer (`[[id]]` optional segment).
- Simple entities: row `···` menu only — **no drawer**, **no** `/[id]` route unless deep links are explicitly required.

---

## 3. Surface types

Every feature **must** declare one surface type. Implementation **must** match [app-shell-spec.md §3.5](./app-shell-spec.md#35-simple-entities).

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
| **Assessments by `kind`** | **One route** `/evaluations`. Same drawer for all kinds; body shows **one exclusive section** (submissions vs grades grid). List row: **kind badge**. |
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

---

## 6. Route index

| Module | List route | Detail route |
|--------|------------|--------------|
| Dashboard | `/dashboard` | — |
| Students (school) | `/school/students` | `/school/students/{id}` |
| Guardians | `/school/guardians` | `/school/guardians/{id}` |
| Staff | `/school/staff` | `/school/staff/{id}` |
| School calendar | `/school/calendar` | `/school/calendar/{id}` |
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
- **List:** search name · main filter assigned class
- **Drawer header:** Edit profile · Manage permissions
- **Drawer tabs:** Profile · **Permissions** (`staffPermissionAssignments`) · Assignments (read-only `staffAssignments` summary)

### 7.5 School — Calendar

- **Entity:** `CalendarEvent` · **Thin drawer**
- **List:** search title · main filter event type
- **Drawer header:** Edit · Duplicate

### 7.6 School — Activities

- **Entity:** `Activity` · **Complex drawer**
- **Drawer:** Enrollments (`ActivityEnrollment`) · optional class timetable link via `ClassActivityEnrollment` + schedule

### 7.7 School — Announcements

- **Entity:** `Announcement` · **Complex drawer**
- **Drawer:** Content · Targets sub-collection · Publish

### 7.8 School — Incidents

- **Entity:** `Incident` · **Complex drawer**
- **List:** search student · main filter class · filter category · severity · **resolution status**
- **Drawer header:** Edit · **Resolve** (hidden when `status = resolved`)
- **Drawer body:** Summary · **Involved students** (read-only)
- **Resolve modal:** involved students + role + optional sanction + notes → `resolveIncidentWithOutcomes`

### 7.9 Classes — Students (roster)

- Same drawer as school student list; cards default, table via More menu

### 7.10 Classes — Timetable

- **Entities:** `LessonSession` · `ActivitySession` · timed `Assessment`
- **Layout:** Week grid · URL-backed occurrence drawer
- **CTA:** New session wizard (Lesson · Activity · Assessment)
- **Drawer tabs:** Details · Attendance (`AttendanceRecord`) · Logbook (lessons only)
- **Header:** Edit · Take attendance *(session mode)*

### 7.11 Classes — Lessons (teaching)

- **Entity:** `ClassSubject` · **Complex drawer**
- **Drawer tabs:** Progression · Logbook
- Create/edit: optional **Schedule on timetable**

### 7.12 Classes — Assessments (evaluations)

- **Entities:** `Assessment` · `AssessmentResult`
- **List:** main filter **kind** (all / homework / quiz / project / other) · kind badge on row
- **Drawer:** one body section by `kind` — homework → submissions; quiz/project/other → grades grid
- **CTA:** New assessment (pick kind; optional timetable for non-homework)
- **No** `/homework` route

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
- **Drawer header:** Record payment · Waive

### 7.17 Finance — Payments

- **Entity:** `Payment` · **Simple** (row `···` only)
- Row menu: View receipt → navigate to billing drawer

### 7.18 Configuration — School profile

- **Entity:** `School` · **Layout variant** — single page, edit modal

### 7.19 Configuration — Academic calendar

- **Entities:** `AcademicYear` · `AcademicPeriod` · `PeriodDefinition`
- Accordion by year; period + **period definition** CRUD via modals

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

---

## 8. Entity → surface quick reference

| Entity | Surface | Primary route |
|--------|---------|---------------|
| `Student` | Complex | `/school/students`, `/classes/{id}/students` |
| `StaffMember` | Complex | `/school/staff` |
| `Guardian` | Complex | `/school/guardians` |
| `Incident` | Complex | `/school/events` |
| `Assessment` | Complex | `/classes/{id}/evaluations` |
| `ClassGroup` | Complex | `/configuration/classes` |
| `GradeLevel` | Complex | `/configuration/grade-levels` |
| `Fee` | Simple | `/finance/fees` |
| `Payment` | Simple | `/finance/payment` |
| `GradeScale` | Simple | `/configuration/grade-scales` |
| `DisciplinaryAction` | Simple | `/configuration/discipline` |
| `CalendarEvent` | Thin | `/school/calendar` |

Sub-entities (`studentIncidentInvolvements`, `staffPermissionAssignments`, `classActivityEnrollments`, etc.) appear as **drawer sub-collections** or modal payloads — never as standalone nav items.

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

Regenerate OpenAPI client after backend API changes (`bun run openapi:generate`).

---

## 10. Agent implementation checklist

When building or refactoring a screen:

1. **Classify** the entity — complex · simple · thin · layout (§3).
2. **Match route** to §6 — do not invent parallel routes removed in §1.3.
3. **Apply toolbar** order and `<select>` main filter (§2.3).
4. **Follow** [app-shell-spec.md](./app-shell-spec.md) for drawer anatomy, modals, sub-collections.
5. **Follow** [data-loading-spec.md](./data-loading-spec.md) for `PageQuery`, entity store, `runMutation`.
6. **Follow** [design-language-spec.md](./design-language-spec.md) for visuals.
7. **Check locked decisions** (§4) — especially homework, roles, permissions, attendance mode, incident resolve.
8. **Do not** add resource UI, `/configuration/roles`, or `/homework` nav.
9. **Update progress** in [ui-architecture-reference.md](../reference/ui-architecture-reference.md) when a feature reaches target — not in this spec.

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial normative spec distilled from ui-architecture-reference v1 target state |
