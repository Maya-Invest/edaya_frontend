# UI Architecture Reference

> **Applies to:** `apps/webapp` feature screens (staff webapp)  
> **Companion specs:** [app-shell-spec.md](../specs/app-shell-spec.md) · [shared-components-spec.md](../specs/shared-components-spec.md) · [design-language-spec.md](../specs/design-language-spec.md) · [data-loading-spec.md](../specs/data-loading-spec.md)

This document is the **target UI architecture catalog** for the EDAYA staff webapp (v1). It describes routes, entities, filters, drawer structure, complexity class, and **implementation progress** for sprint planning and gap closure.

**Normative spec for agents:** [v1-feature-architecture-spec.md](../specs/v1-feature-architecture-spec.md) — use that for *what* to build; use this reference for *status* and detailed feature cards.

**Implementation plan:** [v1-staff-webapp-implementation-plan.md](../sprints/v1-staff-webapp-implementation-plan.md) — phased execution (Phases 0–8).

Interaction rules (drawer anatomy, modals, simple vs complex entities) are defined in [app-shell-spec.md](../specs/app-shell-spec.md).

**Status legend**

| Tag | Meaning |
|-----|---------|
| **Built** | Matches target architecture |
| **Partial** | Route/view exists; refactor needed to match target |
| **Planned** | In v1 scope; not built or incomplete |
| **Post-v1** | Explicitly out of first release |

---

## 0. V1 release scope

### In scope

All sidebar modules and account surfaces in §1, except items listed under **Post-v1**.

### Post-v1 (deferred)

| Area | Domain entities | Notes |
|------|-----------------|-------|
| **Resource management** | `resources`, `resourceAssignments` | No staff UI in v1. Rooms, equipment, and resource booking are deferred. Scheduling/timetable does not expose resource assignment in v1. |

### V1 architecture invariants

Every in-scope feature conforms to [app-shell-spec.md](../specs/app-shell-spec.md):

- List → URL-backed drawer (complex) or row `···` menu (simple)
- Entity header: identity + up to 2 actions; body = related content only
- All mutations via modals; sub-collections read-only with `+ Add` → modal

### V1 progress tracker

Living checklist — check items off (`[x]`) as work lands. Mirrors [§6 gaps](#6-v1-implementation-gaps) and §3 feature cards.

#### Architecture & shell
- [ ] Drawer entity header (identity + top 2 actions) on all complex entities — `DrawerEntityHeader` built; pilot: `GuardianDetail`
- [ ] Main filter as `<select>` everywhere (chip bars → Filter panel) — `FilterSelect` + `FilterPanel` built; pilots: `AnnouncementsView`, `SchoolStudentsView`
- [ ] Filter button wired with secondary facets on list pages — `FilterPanel` built; pilot: `SchoolStudentsView`
- [ ] More menu: per-feature export / bulk actions

#### School
- [ ] Student drawer — **Enrollments** tab (history); **Grades** tab → links to assessments
- [ ] Staff drawer — **Permissions** tab (`staffPermissionAssignments`); remove reliance on `/configuration/roles`
- [x] Incidents — **Resolve** modal (involved students + disciplinary actions) ✅ *(2026-07-03 — `resolveIncidentWithOutcomes` + `IncidentResolveModal`)*

#### Classes
- [ ] Remove dedicated **Homework** nav/route; fold into Assessments (`kind` filter + row badge)
- [ ] Assessments — unified list + drawer (exclusive body section per `kind`)
- [ ] **Daily attendance** — list of days + drawer (session-like pattern)
- [ ] Timetable — New session flow (Lesson · Activity · Assessment) + inline schedule from source screens
- [ ] Student drawer **Attendance** tab — aggregate daily + session records

#### Finance
- [ ] Fees — row `···` menu only (remove drawer)
- [ ] Payments — row `···` menu; receipt → billing drawer
- [ ] Grade scales — row `···` menu (remove inline card edit)
- [ ] Notification templates — row edit → modal pattern

#### Configuration
- [x] Grade levels route + drawer — `/configuration/grade-levels/[[id]]` ✅ *(2026-07-03)*
- [x] Classes config — URL-backed drawer + **class-level staff assignments** tab ✅ *(2026-07-03)*
- [x] **`attendanceMode` on class create/edit** (Configuration → Classes) ✅ *(2026-07-03)*
- [x] **Conditional class nav** — `/attendance` tab only when `attendanceMode = daily` ✅ *(2026-07-03 — route stub; list UI Phase 4)*
- [ ] Academic calendar — period definition CRUD
- [ ] Disciplinary catalog simple list
- [ ] **Remove** `/configuration/roles` (permissions → Staff drawer)

#### Backend blockers
- [x] **B1** — `ClassActivityEnrollment` in `@edaya/core` + API ✅ *(web client: B5)*
- [x] **B2** — Run `bun run db:migrate:full` on staging/production Postgres *(dev Neon via `db:migrate:hyperdrive` — 2026-07-03)*
- [x] **B3** — Permission catalog + `scope/render` + `resolveResourcePath` ✅
- [x] **B4** — Atomic resolve-incident workflow ✅ (`resolve-incident-with-outcomes` · web modal wired — 2026-07-03)
- [x] **B5** — Regen `edaya_web` OpenAPI client *(2026-07-03 — `classActivityEnrollments` · `resolveIncidentWithOutcomes` · auth model entities)*

#### Post-v1 / cleanup
- [ ] Resources removed from v1 nav and planning

---

## 1. Shell modules

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

Global header selectors (all modules): **School** · **Academic year + period** · **Language** · **User menu**.

---

## 2. Pattern glossary

### List page toolbar

Toolbar order (left to right in the action cluster):

```
[Primary CTA]  [Search]  [Main filter ▾]  [Filter ▾]  [More ▾]
```

| Slot | Rule |
|------|------|
| **Primary CTA** | Exactly one create action → modal |
| **Search** | Always present on list pages (except layout variants). Instant text filter on primary label fields. Sits **next to** the main filter — not inside it. |
| **Main filter** | Always a **`<select>`** (single facet). Highest-frequency structured facet (e.g. class, status, category). One control, one dimension. Omit only on fixed tiny catalogs where search alone is sufficient. |
| **Filter button** | Secondary / advanced facets: extra status values, date range, scope, toggles that were previously chip bars |
| **More menu** | Export, import, bulk ops, view toggle, column settings |
| **Row `···` menu** | Per-row mutations; **primary surface for simple entities** |

**Do not** use chip bars or pill toggles for the main filter — migrate them to the **Filter** button panel for v1 consistency.

### Detail surface types

| Type | When | URL |
|------|------|-----|
| **Detail drawer** | Complex entity — related content beyond the list row | `/{module}/{entity}/[id]` |
| **Row menu only** | Simple entity — no meaningful browse context | List route only |
| **Layout variant** | Non-collection screen (dashboard, matrix, accordion…) | Module route |
| **Inline / row modal** | Single-record config (school profile) | Optional `[[id]]` |

### Drawer structure (complex entities)

1. **Shell header** — type chip + close  
2. **Entity header** — identity + up to 2 actions (+ `···` overflow; destructive in overflow only)  
3. **Body** — related content via **sections**, **tabs**, or **both**

### Class attendance mode

Each `ClassGroup` has `attendanceMode` (`daily` | `session`, default `session`). This is the **class-level switch** for how official roll call works. Backend workflows already enforce the mode.

| Mode | API value | Official roll | Where teachers mark |
|------|-----------|---------------|---------------------|
| **Daily roll call** | `daily` | One `Attendance` row per class per calendar day; records anchor on `attendanceId` | `/classes/{classId}/attendance` day board |
| **Per session** | `session` | `AttendanceRecord` per occurrence; anchor on `lessonSessionId`, `activitySessionId`, or `assessmentId` | Timetable (and activity/exam) session drawer → **Take attendance** |

**Configuration** (Configuration → Classes → drawer **Profile** tab, or create-class modal):

| Field | Control | Notes |
|-------|---------|-------|
| **Attendance mode** | `<select>`: Daily roll call · Per session | Required on create; editable on class profile |
| **Homeroom teacher** | Staff picker (`homeroomStaffId`) | Daily mode: primary owner of the day board |

**Class nav rule** — `CLASS_NAV_DEFS` filters by loaded class context:

```
attendanceMode = daily   → show  attendance  tab
attendanceMode = session → hide attendance tab; session attendance only on timetable drawer
```

**Student 360** — Attendance tab is **mode-agnostic**: list all `AttendanceRecord` rows regardless of anchor (daily board vs session).

**Mode switch mid-year** — allow edit; warn if records exist for the other mode. Never delete historical records.

**API (existing)** — `record-daily-attendance`, `record-class-daily-attendance` require `daily`; lesson/activity/assessment attendance commands use session anchors. Webapp today hardcodes `attendanceMode: 'session'` on class create.

### UX decisions (locked)

Decisions for implementation — update here if the plan changes.

| Topic | Decision |
|-------|----------|
| **Staff assignments (config)** | **Class-level only** in Configuration → Classes drawer (`classGroupId` target). Occurrence-level assignment (`lessonSession`, `classSubject`, etc.) deferred. |
| **Staff permissions** | No Configuration **roles** screen. Permissions live on **Staff drawer → Permissions** tab (`staffPermissionAssignments`). Roles entity removed from permission model. |
| **Incident resolve** | **One modal** — involved students, catalog action, `resolveIncidentWithOutcomes`, resolve incident. ✅ Shipped 2026-07-03. |
| **Assessment by `kind`** | **Same drawer** for all kinds; body shows **one exclusive section** (grades vs submissions). List row shows a **kind badge/flag**. |
| **Daily attendance** | **List of days** (like timetable sessions); day detail in **drawer** with attendance records. Record/edit gated by **permission**, not mode-specific UI locks. |
| **Timetable ↔ Schedule** | **From timetable:** New session → type (Lesson · Activity · Assessment) → subject/activity → validate (creates `Schedule` + materialized session). **From Lessons / Activities / Assessments:** create entity with optional **inline schedule**. Class-bounded activities appear on class timetable. |
| **Exam / timed assessment** | **No exam menu.** Timed assessments (`quiz` / `project` / `other` with `startsAt`/`endsAt` or `lessonSessionId`) appear on **timetable grid** and **`/evaluations` list** — same `Assessment` entity, two views. |
| **Activity on class timetable** | School-wide `ActivityEnrollment` (student roster) + **`ClassActivityEnrollment`** (links activity ↔ class for timetable). Backend ✅; web client regen (B5) before UI. |
| **Student 360 — Grades** | **Read-only links** to class assessment drawer (deep-link to `/evaluations/{id}`). |
| **Global `Subject`** | **Inline** create/edit when adding subjects in catalog — no dedicated Subject admin route. |

---

## 3. Feature catalog (target end state)

Each module opens with a **quick index**, then **feature cards** with full detail. Status: **Built** · **Partial** · **Planned**.

### 3.1 Dashboard

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/dashboard` | Built |

#### Dashboard `Built`

| | |
|---|---|
| **Route** | `/dashboard` |
| **Entity** | — (aggregated `SchoolOverview`) |
| **Layout** | Custom — KPI cards, action queue, upcoming, class risk |
| **Complexity** | Layout variant (no drawer) |

- Cards deep-link to modules; no list CTA

---

### 3.2 School

| Feature | Route | Status |
|---------|-------|--------|
| Student list | `/school/students/[[id]]` | Partial |
| Guardian list | `/school/guardians/[[id]]` | Built |
| Staff | `/school/staff/[[id]]` | Partial |
| School calendar | `/school/calendar/[[id]]` | Built |
| Activities | `/school/activities/[[id]]` | Built |
| Announcements | `/school/announcements/[[id]]` | Built |
| School incidents | `/school/events/[[id]]` | Partial |

#### Student list `Partial`

| | |
|---|---|
| **Route** | `/school/students/[[id]]` |
| **Entity** | `Student` |
| **Layout** | Table ↔ cards |
| **Complexity** | Complex drawer |

**List**
- Search: Student name
- Main filter (select): Class
- Filter: Enrollment status
- Primary CTA: Add student
- More: Export · table/cards toggle

**Drawer**
- Header: Edit profile · Change class
- Body (tabs + sections): Profile (identity, health, guardians, notes) · **Grades** (links → class `/evaluations/{id}`) · **Attendance** (all records — daily + session anchors) · Incidents · Finance · Report card · **Enrollments** (history)

#### Guardian list `Built`

| | |
|---|---|
| **Route** | `/school/guardians/[[id]]` |
| **Entity** | `Guardian` |
| **Layout** | Table |
| **Complexity** | Complex drawer |

**List**
- Search: Guardian name
- Main filter (select): Relation type
- Filter: Linked class
- Primary CTA: Add guardian
- More: Export

**Drawer**
- Header: Edit · Link student
- Body (sections): Contact · account linking · linked students sub-list

#### Staff `Partial`

| | |
|---|---|
| **Route** | `/school/staff/[[id]]` |
| **Entity** | `StaffMember` |
| **Layout** | Table |
| **Complexity** | Complex drawer |

**List**
- Search: Staff name
- Main filter (select): Assigned class
- Filter: Active/inactive · assigned class
- Primary CTA: Add staff
- More: Export

**Drawer**
- Header: Edit profile · Manage permissions
- Body (tabs): Profile · **Permissions** ([v1 spec §5.3.1](../specs/v1-feature-architecture-spec.md#531-staff-permission-assignment-ui) — `staffPermissionAssignments` add/edit/remove via modals) · Assignments (read-only summary of `staffAssignments`)

*Today: `/configuration/roles` matrix still exists — remove; permissions belong here.*

#### School calendar `Built`

| | |
|---|---|
| **Route** | `/school/calendar/[[id]]` |
| **Entity** | `CalendarEvent` |
| **Layout** | Timeline list (by month) |
| **Complexity** | Thin drawer (sections only) |

**List**
- Search: Event title
- Main filter (select): Event type
- Filter: Scope (school / classes) · date range
- Primary CTA: New event

**Drawer**
- Header: Edit · Duplicate
- Body: Dates · scope · description

#### Activities `Built`

| | |
|---|---|
| **Route** | `/school/activities/[[id]]` |
| **Entity** | `Activity` |
| **Layout** | Table |
| **Complexity** | Complex drawer |

**List**
- Search: Activity name
- Main filter (select): Category
- Filter: Period · capacity
- Primary CTA: New activity
- More: Export enrollments

**Drawer**
- Header: Edit · Manage enrollments
- Body: Description · **Enrollments** sub-collection (`ActivityEnrollment`; `+ Add student` → picker modal)
- Optional: **Schedule on class timetable** when activity is class-bounded — create `ClassActivityEnrollment` + `Schedule` + `ActivitySession`

#### Announcements `Built`

| | |
|---|---|
| **Route** | `/school/announcements/[[id]]` |
| **Entity** | `Announcement` |
| **Layout** | Table |
| **Complexity** | Complex drawer |

**List**
- Search: Title
- Main filter (select): Status
- Filter: Priority · audience · date range
- Primary CTA: New announcement
- More: Duplicate (future)

**Drawer**
- Header: Edit · Publish
- Body: Content · **Targets** sub-collection

#### School incidents `Partial`

| | |
|---|---|
| **Route** | `/school/events/[[id]]` |
| **Entity** | `Incident` |
| **Layout** | Table |
| **Complexity** | Complex drawer |

**Shipped (2026-07-03)**
- **Resolve** modal — involved students · role · optional `DisciplinaryAction` per student · resolution notes
- Atomic `resolve-incident-with-outcomes` command (all-or-nothing)
- Drawer **Involved students** sub-collection (read-only; edits via Resolve modal)
- Resolved status badge; Resolve hidden when `status = resolved`

**Remaining**
- List **resolution status** filter (Filter panel)
- List row still **single-student** (`mapIncidents` uses first involvement)
- Drawer **entity header** pattern (§3.1 — identity + top 2 actions)
- Applied **sanctions** not shown in drawer post-resolve
- **`/configuration/discipline`** catalog screen (sanctions load in modal from API today)

**List**
- Search: Student name
- Main filter (select): Class
- Filter: Category · severity · resolution status
- Primary CTA: Log incident
- More: Export log

**Drawer**
- Header: Edit · **Resolve** → single **Resolve incident** modal
- Body: Summary · **Involved students** sub-collection (read-only; edits via Resolve modal)

**Resolve modal** (one step): pick/update involved students · pick `DisciplinaryAction` from catalog per student · `resolveIncidentWithOutcomes` · marks incident resolved

---

### 3.3 Classes

Class context from sidebar **class picker**. Base path: `/classes/{classId}/…`

| Feature | Route segment | Status |
|---------|---------------|--------|
| Students (photo roster) | `students/[[id]]` | Partial |
| Timetable | `timetable/[[id]]` | Partial |
| Lessons | `teaching/[[id]]` | Built |
| Assessments | `evaluations/[[id]]` | Partial |
| Report cards | `report-cards/[[id]]` | Built |
| Daily attendance | `attendance/[[id]]` | Planned |

*Daily attendance nav segment visible only when the selected class has `attendanceMode = daily`.*

#### Students (photo roster) `Partial`

| | |
|---|---|
| **Route** | `/classes/{classId}/students/[[id]]` |
| **Entity** | `Student` |
| **Layout** | Cards (default) · table via More |
| **Complexity** | Complex drawer |

**List**
- Search: Student name
- Main filter (select): Status
- Primary CTA: Add student
- More: Table/cards toggle · export · print photos

**Drawer**
- Same as [Student list](#student-list-partial) (school)

#### Timetable `Partial`

| | |
|---|---|
| **Route** | `/classes/{classId}/timetable/[[id]]` |
| **Entity** | `LessonSession` · `ActivitySession` · `Assessment` (timed, non-homework) |
| **Layout** | Week grid |
| **Complexity** | Complex drawer |

**Create flows**
1. **Timetable → New session** — select type (**Lesson** · **Activity** · **Assessment**) → pick subject / activity / assessment context → validate (creates `Schedule` when recurring, materializes occurrence).
2. **Lessons / Activities / Assessments screens** — create entity with optional **Add to timetable** (inline schedule fields).

Class-bounded **Activity** occurrences appear on this grid when scheduled for the class.

**List** (week grid acts as collection; URL-backed occurrence drawer)
- Search: Session / subject label
- Main filter (select): Week
- Filter: Session kind · subject
- Primary CTA: New session (+ recurring schedule shortcuts)
- More: Export PDF
- Note: prev/next week controls stay adjacent to the week select

**Drawer**
- Header: Edit · Take attendance *(session-mode classes; use daily attendance list when `attendanceMode = daily`)*
- Body (tabs): Details · Attendance (`AttendanceRecord` sub-collection) · Logbook (lessons only)

*Same drawer pattern as [Daily attendance](#daily-attendance-planned) day rows.*

#### Lessons `Built`

| | |
|---|---|
| **Route** | `/classes/{classId}/teaching/[[id]]` |
| **Entity** | `ClassSubject` |
| **Layout** | Subject list + progress |
| **Complexity** | Complex drawer |

**List**
- Search: Subject name
- Main filter (select): Teacher
- Filter: Progress band
- More: Open config catalog

**Drawer**
- Header: Edit subject · Delete
- Body (tabs): Progression · Logbook
- Create flow: optional **Schedule on timetable** when adding/editing class subject

#### Assessments `Partial`

Homework is no longer a separate nav item — it is an `Assessment` **kind** (`homework`) on the same screen as quizzes, projects, and other evaluations.

| | |
|---|---|
| **Route** | `/classes/{classId}/evaluations/[[id]]` |
| **Entity** | `Assessment` · `AssessmentResult` |
| **Layout** | Cards |
| **Complexity** | Complex drawer |

**List**
- Search: Title / subject
- Main filter (select): Kind (all / homework / quiz / project / other)
- Filter: Grading or submission status · subject · date
- Row: **kind badge** (homework · quiz · project · other); timed assessments also show schedule hint when on timetable
- Primary CTA: New assessment (modal picks kind; optional **Add to timetable** for non-homework)
- More: Export marks · export submissions (future)

**Drawer**
- Header: Enter grades · Edit
- Body: Summary · **one exclusive section** by `kind`:
  - `homework` → submissions (`assessmentResults`)
  - `quiz` / `project` / `other` → grades grid (`assessmentResults`)

**Timetable link** — non-homework assessments with `startsAt`/`endsAt` (or `lessonSessionId`) appear on [Timetable](#timetable-partial) **and** this list. No separate exam route.

*Today: dedicated `/homework` route and nav tab still exist — remove and fold into evaluations.*

#### Report cards `Built`

| | |
|---|---|
| **Route** | `/classes/{classId}/report-cards/[[id]]` |
| **Entity** | `ReportCardResult` |
| **Layout** | Table (per student) |
| **Complexity** | Complex drawer |

**List**
- Search: Student name
- Main filter (select): Publication status
- Primary CTA: Generate all
- More: Export PDFs · publish all (future)

**Drawer**
- Header: Publish · Regenerate
- Body: Summary · section breakdown

#### Daily attendance `Planned`

Visible in class nav **only** when `ClassGroup.attendanceMode = daily`. See [Class attendance mode](#class-attendance-mode). **Same list + drawer pattern as timetable sessions** — one row per day, not a student matrix on the list page.

| | |
|---|---|
| **Route** | `/classes/{classId}/attendance/[[id]]` |
| **Entity** | `Attendance` · `AttendanceRecord` |
| **Layout** | Table / card list of **days** |
| **Complexity** | Complex drawer |

**List**
- Search: Date label / week
- Main filter (select): Month or week
- Filter: Completion status (marked / partial / unmarked)
- Primary CTA: Mark today *(if permitted)*
- Row: date · summary counts (present / absent / …) · completion indicator

**Drawer** *(one `Attendance` day — mirrors timetable session drawer)*
- Header: Edit day metadata · Mark / update attendance *(permission-gated)*
- Body (tabs): Summary · **Attendance** (`AttendanceRecord` sub-collection per student)

**Mutations** — `record-class-daily-attendance` (bulk) or `record-daily-attendance` (single student). Who can edit is **permission-based** (`TIMETABLE_UPDATE` / attendance permissions), not a separate UX mode.

*Today: no route; API + domain model exist.*

---

### 3.4 Finance

| Feature | Route | Status |
|---------|-------|--------|
| Fees | `/finance/fees` | Partial |
| Billing | `/finance/billing/[[id]]` | Built |
| Payments | `/finance/payment` | Partial |

#### Fees `Partial`

| | |
|---|---|
| **Route** | `/finance/fees` |
| **Entity** | `Fee` |
| **Layout** | Table + KPI strip |
| **Complexity** | Simple (row `···` menu) |

**List**
- Search: Fee name
- Main filter (select): Category
- Filter: Period · active/archived
- Primary CTA: New fee
- More: Export catalog
- Row `···`: Edit · Delete

*Today: drawer exists — refactor to row menu only.*

#### Billing `Built`

| | |
|---|---|
| **Route** | `/finance/billing/[[id]]` |
| **Entity** | `StudentFee` |
| **Layout** | Table + KPI strip |
| **Complexity** | Complex drawer |

**List**
- Search: Student name
- Main filter (select): Payment status
- Filter: Class · fee type · amount range
- Primary CTA: Assign fee
- More: Export · send reminders (future)

**Drawer**
- Header: Record payment · Waive
- Body: Summary · installments sub-list

#### Payments `Partial`

| | |
|---|---|
| **Route** | `/finance/payment` |
| **Entity** | `Payment` |
| **Layout** | Ledger table + KPI strip |
| **Complexity** | Simple (row `···` menu) |

**List**
- Search: Student name
- Main filter (select): Class
- Filter: Status · date range · fee type
- Primary CTA: Record payment
- More: Export treasury
- Row `···`: View receipt → billing drawer

---

### 3.5 Configuration

| Feature | Route | Status |
|---------|-------|--------|
| School profile | `/configuration/school` | Built |
| Academic calendar | `/configuration/academic` | Partial |
| Grade levels | `/configuration/grade-levels/[[id]]` | Planned |
| Classes | `/configuration/classes/[[id]]` | Partial |
| Subjects catalog | `/configuration/subjects/[[id]]` | Built |
| Report card models | `/configuration/report-cards/[[id]]` | Built |
| Grade scales | `/configuration/grade-scales` | Partial |
| Notification templates | `/configuration/notifications` | Partial |
| Disciplinary catalog | `/configuration/discipline` | Planned |

*Removed from v1 target: **Roles & permissions** (`/configuration/roles`) — permissions move to [Staff drawer](#staff-partial).*

#### School profile `Built`

| | |
|---|---|
| **Route** | `/configuration/school` |
| **Entity** | `School` |
| **Layout** | Single-record page |
| **Complexity** | Layout variant |

- Primary CTA: Edit school → modal
- Read-only fields on page; no drawer

#### Academic calendar `Partial`

| | |
|---|---|
| **Route** | `/configuration/academic` |
| **Entity** | `AcademicYear` · `AcademicPeriod` · `PeriodDefinition` |
| **Layout** | Accordion (by year) |
| **Complexity** | Layout variant |

- Search: Academic year label
- Main filter (select): Published / draft
- Primary CTA: Create year → modal
- Filter: —
- Inline: expand year → periods; period + **period definition** CRUD via modals

*Today: no period-definition admin.*

#### Grade levels `Planned`

| | |
|---|---|
| **Route** | `/configuration/grade-levels/[[id]]` |
| **Entity** | `GradeLevel` |
| **Layout** | Table (by cycle) |
| **Complexity** | Complex drawer |

**List**
- Search: Grade level name
- Main filter (select): Cycle / stage
- Filter: Active/archived
- Primary CTA: Add grade level

**Drawer**
- Body (tabs): Profile · Default subjects (`gradeLevelSubjects`)

#### Classes `Partial`

| | |
|---|---|
| **Route** | `/configuration/classes/[[id]]` |
| **Entity** | `ClassGroup` |
| **Layout** | Table (grouped by grade level) |
| **Complexity** | Complex drawer |

**List**
- Search: Class name
- Main filter (select): Grade level
- Primary CTA: Add class
- More: Export structure

**Drawer**
- Body (tabs/sections): **Profile** (`name`, `gradeLevelId`, `capacity`, `homeroomStaffId`, **`attendanceMode`**) · **Staff assignments** (`staffAssignments` with `classGroupId` target only) · student count

**Staff assignments tab** — class-level only for v1: assign staff + responsibility label to this class. Occurrence-level targets deferred.

**Profile fields**

| Field | Control |
|-------|---------|
| Name | Text |
| Grade level | Select |
| Capacity | Number (optional) |
| Homeroom teacher | Staff picker |
| **Attendance mode** | Select: **Daily roll call** (`daily`) · **Per session** (`session`) |

*Today: row edit modal only; `attendanceMode` hardcoded to `session` on create.*

#### Subjects catalog `Built`

| | |
|---|---|
| **Route** | `/configuration/subjects/[[id]]` |
| **Entity** | `GradeLevelSubject` |
| **Layout** | Grouped list (by level or category) |
| **Complexity** | Complex drawer |

**List**
- Search: Subject name
- Main filter (select): Group by (level / category)
- Filter: Grade level · category
- Primary CTA: Add subject
- More: Import (future)

**Drawer**
- Body: Details · matters/chapters (`gradeLevelSubjectMatters`); level-group drawer for bulk view
- **`Subject`** created/edited **inline** when adding catalog entries — no global Subject admin route

#### Report card models `Built`

| | |
|---|---|
| **Route** | `/configuration/report-cards/[[id]]` |
| **Entity** | `ReportCardDefinition` |
| **Layout** | List |
| **Complexity** | Complex drawer |

**List**
- Search: Model name
- Main filter (select): Status
- Filter: Grade level · scale
- Primary CTA: New model
- More: Duplicate

**Drawer**
- Header: Edit · Publish
- Body: Structure tree · preview

#### Grade scales `Partial`

| | |
|---|---|
| **Route** | `/configuration/grade-scales` |
| **Entity** | `GradeScale` |
| **Layout** | Table or cards |
| **Complexity** | Simple (row `···` menu) |

**List**
- Search: Scale name
- Main filter (select): Default (all / default only)
- Primary CTA: Add scale
- Row `···`: Edit · Delete · Set default

*Today: inline card edit.*

#### Notification templates `Partial`

| | |
|---|---|
| **Route** | `/configuration/notifications` |
| **Entity** | `SchoolNotificationTemplates` |
| **Layout** | Categorized cards |
| **Complexity** | Simple (row edit → modal) |

**List**
- Search: Template name / key
- Main filter (select): Channel
- Primary CTA: Reset all
- Per-template: Edit → modal

#### Disciplinary catalog `Planned`

| | |
|---|---|
| **Route** | `/configuration/discipline` |
| **Entity** | `DisciplinaryAction` |
| **Layout** | Table |
| **Complexity** | Simple (row `···` menu) |

**List**
- Search: Action name
- Main filter (select): Kind (sanction / reward)
- Primary CTA: Add action
- Row `···`: Edit · Delete

---

### 3.6 Account

Reachable from the **user menu** (not sidebar).

| Feature | Route | Status |
|---------|-------|--------|
| Inbox | `/account/inbox/[[id]]` | Built |
| Notification settings | `/account/notifications` | Built |
| Profile | `/account` (modal) | Built |

#### Inbox `Built`

| | |
|---|---|
| **Route** | `/account/inbox/[[id]]` |
| **Entity** | `MessageDelivery` |
| **Layout** | List |
| **Complexity** | Thin drawer (sections only) |

**List**
- Search: Sender / subject
- Main filter (select): Read / unread
- Filter: Date range · channel

**Drawer**
- Body: Message body · delivery status

#### Notification settings `Built`

| | |
|---|---|
| **Route** | `/account/notifications` |
| **Entity** | — (user preferences) |
| **Layout** | Form sections |
| **Complexity** | Layout variant |

- Primary CTA: Save preferences

#### Profile `Built`

| | |
|---|---|
| **Route** | `/account` (modal from user menu) |
| **Entity** | — (session user) |
| **Layout** | Modal |
| **Complexity** | Layout variant |

- Edit profile → modal

---

## 4. Complexity summary (v1 target)

**Complex (drawer)**  
Student · Guardian · Staff · Activity · Announcement · Incident · Timetable session · ClassSubject · Assessment · ReportCardResult · StudentFee · ClassGroup · GradeLevel · GradeLevelSubject · ReportCardDefinition · MessageDelivery · Attendance (daily day row)

**Simple (row `···` menu)**  
Fee · GradeScale · SchoolNotificationTemplates · Payment · DisciplinaryAction

**Thin drawer (sections only)**  
CalendarEvent · MessageDelivery (inbox)

**Layout variant (no drawer)**  
Dashboard · School profile · Academic calendar · Notification settings · Profile

**Removed from v1 target**  
`/configuration/roles` matrix — permissions on Staff drawer

**Post-v1**  
Resource · ResourceAssignment — no staff UI

---

## 5. Route index (v1 target)

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
| Daily attendance | `/classes/{classId}/attendance` | `…/attendance/{id}` *(nav when `attendanceMode = daily`)* |
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
| Notifications | `/configuration/notifications` | — |
| Disciplinary catalog | `/configuration/discipline` | — |
| Account inbox | `/account/inbox` | `/account/inbox/{id}` |

*Removed: `/configuration/roles` — see [Staff drawer](#staff-partial).*

---

## 6. V1 implementation gaps

Work remaining to reach the target architecture in §3. Track completion in [§0 progress tracker](#v1-progress-tracker). **Backend dependencies** that block UI work are in [§6.1](#61-backend-blockers). Ordered by priority.

| Priority | Area | Today | Target |
|----------|------|-------|--------|
| **P0** | Grade levels | No route | `/configuration/grade-levels` + drawer |
| **P0** | Staff assignments | API only | Class config drawer — **class-level** `staffAssignments` tab |
| **P0** | Drawer entity header | Footer / body identity | Identity + top 2 actions per §3.1 (all complex entities) |
| **P1** | Staff permissions UI | `/configuration/roles` matrix | **Staff drawer → Permissions** tab; remove roles route |
| **P1** | Homework nav | Dedicated `/homework` tab + route | Fold into **Assessments** (`kind` filter + row badge on `/evaluations`) |
| **P1** | Classes config | Row edit modal | URL-backed drawer + class-level staff assignments + **`attendanceMode`** |
| **P1** | **`attendanceMode` UI** | Hardcoded `session` on create | Expose on class create/edit; drive conditional class nav |
| **P1** | Disciplinary catalog | No screen | `/configuration/discipline` simple list |
| **P1** | Period definitions | Shell context only | CRUD under Academic calendar |
| **P1** | Main filter UI | Chip bars / pills on many screens | **`<select>`** for main filter; secondary facets in Filter panel |
| **P1** | Simple entities | Drawer or inline edit | Fee, grade scale, notification templates → row `···` only |
| **P1** | Incidents | Resolve modal shipped; list still single-student | Resolution filter · multi-student list · drawer header · sanctions in drawer |
| **P2** | Student enrollments | Change-class only | **Enrollments** tab (history) on student drawer |
| **P2** | Daily attendance | No screen | List of days + drawer when `attendanceMode = daily` |
| **P2** | Session attendance UX | Partial on timetable | Timetable drawer (session-mode); same drawer pattern as daily |
| **P2** | Timetable create flows | Partial | New session wizard + inline schedule from Lessons / Activities / Assessments |
| **P2** | Class timetable activities | Client has `classActivityEnrollments` | Wire activity ↔ class on class timetable UI |
| **P2** | Payments | List only | Row menu; receipt links to billing drawer |
| **P2** | Filter button | Unused or empty on many screens | Secondary facets (status bands, date range, scope) |
| **P2** | More menu | Export stub | Per-feature export/bulk |
| **P2** | Dashboard attendance nudge | — | Unmarked daily classes for homeroom teacher (optional) |
| **—** | Resources | Component exists | **Post-v1** — remove from v1 nav and planning |

### 6.1 Backend blockers

Requirements that **blocked** webapp delivery. Reassessed against `edaya_backend` + `edaya_web` as of 2026-07-03.

**Verdict:** **All blockers resolved** (B1–B5). Re-run **B2** on staging/production Postgres if not yet migrated. Re-run **B5** after each backend API change.

| ID | Priority | Blocker | Blocks (UI / §3) | Status | Notes |
|----|----------|---------|------------------|--------|-------|
| **B1** | ~~P0~~ | **`ClassActivityEnrollment`** | Class timetable — link activity to class | ✅ **Resolved** | Backend + web client (`classActivityEnrollments` in OpenAPI bindings). |
| **B2** | ~~P1~~ | **Permission model DB cutover** | Staff drawer Permissions on legacy Postgres | ✅ **Done (dev Neon)** | `db:migrate:hyperdrive` 2026-07-03: 139 permission rows migrated, 0038+ applied. Re-run on staging/prod if separate branches. |
| **B3** | ~~P1~~ | **Permission matrix UX APIs** | Staff permission picker scope labels | ✅ **Resolved** | `GET authorization/permission-catalog` · `POST authorization/scope/render` · `scope/resolve-resource-path.ts`. |
| **B4** | ~~P2~~ | **Atomic resolve-incident workflow** | Incident Resolve modal — all-or-nothing | ✅ **Resolved** | `resolve-incident-with-outcomes` · `BehaviorServiceWorkflow.resolveIncidentWithOutcomes` · web `IncidentResolveModal` + `resolveIncidentWithOutcomesMutation`. |
| **B5** | ~~P0~~ | **OpenAPI client regen (`edaya_web`)** | Features using new/changed API entities | ✅ **Done (2026-07-03)** | Includes `classActivityEnrollments` · `resolveIncidentWithOutcomes` · auth model entities. Re-run after backend API changes. |

#### Backend blockers — progress

- [x] **B1** — `ClassActivityEnrollment` shipped in `@edaya/core` + API + web client
- [x] **B2** — Migrations + staff-access cutover on dev Neon (2026-07-03)
- [x] **B3** — Permission catalog + scope render + resource path helpers
- [x] **B4** — Atomic resolve-incident workflow (backend + web — 2026-07-03)
- [x] **B5** — Regen `edaya_web` client (2026-07-03 — `classActivityEnrollments` · `resolveIncidentWithOutcomes` · auth model)

#### Backend ready (not blockers)

These §3 targets already have domain + API support — webapp work only:

| UI target | Backend surface |
|-----------|-----------------|
| Class activity on timetable | `classActivityEnrollments` entity CRUD · links `Activity` ↔ `ClassGroup` |
| `attendanceMode` on class | `ClassGroup.attendanceMode` · entity save |
| Daily attendance list + drawer | `Attendance` entity · `record-daily-attendance` · `record-class-daily-attendance` |
| Class-level staff assignments | `StaffAssignment` (`classGroupId` target) · entity CRUD · permission sync |
| Staff permissions drawer | `staffPermissionAssignments` entity CRUD · `permission-catalog` · `scope/render` |
| Timetable new session / schedule | `createSchedule` · `materializeSchedule` · `lessonSessions` / `activitySessions` / timed `assessments` |
| Assessments (all kinds) | `Assessment` + `AssessmentResult` · homework / timed rules in domain |
| Incident resolve | `resolve-incident-with-outcomes` *(atomic)* · legacy: `addStudentInvolvement` · `applyDisciplinaryAction` · `resolveIncident` |
| Disciplinary catalog | `disciplinaryActions` entity CRUD |
| Period definitions admin | `periodDefinitions` entity CRUD |
| Grade levels config | `gradeLevels` entity CRUD |
| Student enrollment history | `enrollments` entity list/query |
| Account invitations | `accountInvitations` + send/resend/revoke commands |
| Global `Subject` inline | `subjects` entity save (from catalog flows) |

---

## 7. Per-feature checklist (template)

Copy when adding or refactoring a screen. Full rules in [app-shell-spec.md §7](../specs/app-shell-spec.md#7-entity-implementation-checklist).

```markdown
### Feature: <Name>
- Module:
- Route:
- Entity:
- Complexity: complex | simple | variant
- Layout: list | cards | table | calendar | custom
- List: primary CTA · **search** · **main filter (`<select>`)** · filter button · more · row ···
- Drawer (if complex): entity header actions · body structure · tabs/sections
- Modals: create · edit · delete · sub-entity
- Permissions:
- API queries / mutations:
- V1 status: built | partial | planned | post-v1
```

---

## 8. Related backend entities

Canonical names match `CoreEntityMap` in `@edaya/core`.

| UI feature | Primary API entities |
|------------|---------------------|
| Student 360 | `students`, `studentHealthProfiles`, `studentNotes`, `guardianLinks`, `enrollments` |
| Staff | `staffMembers`, `staffAssignments` (class-level in config), `staffPermissionAssignments` (staff drawer) |
| School calendar | `calendarEvents` |
| Activities | `activities`, `activityEnrollments`, `classActivityEnrollments` |
| Timetable | `schedules`, `lessonSessions`, `activitySessions`, `assessments` (timed, non-homework) |
| Lessons | `classSubjects`, `classSubjectMatters`, `classSubjectProgress`, `gradeLevelSubjects` |
| Assessments | `assessments` (all kinds incl. `homework`), `assessmentResults` |
| Report cards | `definitions`, `sections`, `results`, `gradeScales` |
| Finance | `fees`, `studentFees`, `payments` |
| Structure | `schools`, `academicYears`, `academicPeriods`, `periodDefinitions`, `classGroups` (`attendanceMode`, `homeroomStaffId`), `gradeLevels` |
| Attendance (daily) | `attendances`, `attendance` (`AttendanceRecord` with `attendanceId`) |
| Attendance (session) | `attendance` (`AttendanceRecord` with `lessonSessionId` / `activitySessionId` / `assessmentId`) |
| Discipline | `incidents`, `disciplinaryActions`, `studentDisciplinaryActions`, `studentIncidentInvolvements` |
| Access | `staffPermissionAssignments` (staff drawer — no roles route) |
| Account | `messageDeliveries` |
| Post-v1 | `resources`, `resourceAssignments` |

---

## 9. Domain entity coverage (v1 target)

Audit of all **52** `CoreEntityKey` values.  
**Coverage:** **Primary** · **Sub** · **Supporting/infra** · **Gap** (v1 target missing) · **Post-v1** (deferred).

### 9.1 Summary

| Coverage | Count |
|----------|------:|
| **Primary** (v1 target) | 23 |
| **Sub-entity** | 18 |
| **Supporting / infra** | 2 |
| **Gap** (v1 UI work remaining) | 7 |
| **Post-v1** | 2 |

All v1 in-scope entities are either covered at **Primary/Sub**, **Supporting**, or listed as a **Gap** with a target in §6. **Post-v1** entities are excluded from gap counts.

### 9.2 Full entity map

| Core entity key | Domain type | V1 coverage | Feature / parent |
|-----------------|-------------|-------------|------------------|
| `schools` | `School` | **Primary** | School profile |
| `academicYears` | `AcademicYear` | **Primary** | Academic calendar |
| `academicPeriods` | `AcademicPeriod` | **Sub** | Academic calendar accordion |
| `periodDefinitions` | `PeriodDefinition` | **Gap** | Academic calendar admin (planned) |
| `gradeLevels` | `GradeLevel` | **Gap** | Grade levels config (planned) |
| `staffMembers` | `StaffMember` | **Primary** | Staff directory |
| `staffAssignments` | `StaffAssignment` | **Gap** | Class config drawer — **classGroupId only** (v1) |
| `accountInvitations` | `AccountInvitation` | **Sub** | Account linking · onboarding |
| `staffPermissionAssignments` | `StaffPermissionAssignment` | **Primary** | Staff drawer → Permissions tab |
| `attachments` | `Attachment` | **Infra** | Profile photos / uploads |
| `resources` | `Resource` | **Post-v1** | — |
| `resourceAssignments` | `ResourceAssignment` | **Post-v1** | — |
| `fees` | `Fee` | **Primary** | Fees (simple row menu target) |
| `studentFees` | `StudentFee` | **Primary** | Billing |
| `payments` | `Payment` | **Primary** | Payments ledger |
| `schedules` | `Schedule` | **Sub** | Timetable |
| `lessonSessions` | `LessonSession` | **Primary** | Timetable drawer |
| `activitySessions` | `ActivitySession` | **Primary** | Timetable drawer |
| `attendances` | `Attendance` | **Gap** | Daily attendance board when `attendanceMode = daily` |
| `calendarEvents` | `CalendarEvent` | **Primary** | School calendar |
| `attendance` | `AttendanceRecord` | **Sub** | Daily board · session drawer · Student attendance tab |
| `announcements` | `Announcement` | **Primary** | Announcements |
| `announcementTargets` | `AnnouncementTarget` | **Sub** | Announcement drawer |
| `messageDeliveries` | `MessageDelivery` | **Primary** | Account inbox |
| `schoolNotificationTemplates` | `SchoolNotificationTemplates` | **Primary** | Notification templates |
| `subjects` | `Subject` | **Supporting** | Inline in subjects catalog (no dedicated route) |
| `subjectMatters` | `SubjectMatter` | **Sub** | Subject / class-subject matters |
| `gradeLevelSubjects` | `GradeLevelSubject` | **Primary** | Subjects catalog · Grade level drawer |
| `gradeLevelSubjectMatters` | `GradeLevelSubjectMatter` | **Sub** | Subjects catalog drawer |
| `classGroups` | `ClassGroup` | **Primary** | Classes config (`attendanceMode`, homeroom) |
| `classSubjects` | `ClassSubject` | **Primary** | Lessons (teaching) |
| `classSubjectMatters` | `ClassSubjectMatter` | **Sub** | Lessons progression |
| `classSubjectProgress` | `ClassSubjectProgress` | **Sub** | Lessons progression tab |
| `activities` | `Activity` | **Primary** | Activities |
| `activityEnrollments` | `ActivityEnrollment` | **Sub** | Activity drawer (school-wide student roster) |
| `classActivityEnrollments` | `ClassActivityEnrollment` | **Sub** | Activity ↔ class link · class timetable |
| `assessments` | `Assessment` | **Primary** | Assessments (`evaluations` route; all kinds) |
| `assessmentResults` | `AssessmentResult` | **Sub** | Assessment drawer — grades · homework submissions |
| `gradeScales` | `GradeScale` | **Primary** | Grade scales (simple row menu target) |
| `definitions` | `ReportCardDefinition` | **Primary** | Report card models |
| `sections` | `ReportCardDefinitionSection` | **Sub** | Model structure tree |
| `results` | `ReportCardResult` | **Primary** | Class report cards |
| `students` | `Student` | **Primary** | Student list (school + class) |
| `enrollments` | `StudentClassEnrollment` | **Gap** | Student **Enrollments** tab (planned) |
| `guardians` | `Guardian` | **Primary** | Guardian list |
| `guardianLinks` | `GuardianStudentLink` | **Sub** | Guardian · Student profile |
| `studentNotes` | `StudentNote` | **Sub** | Student profile |
| `studentHealthProfiles` | `StudentHealthProfile` | **Sub** | Student profile |
| `studentDisciplinaryActions` | `StudentDisciplinaryAction` | **Partial** | Created via Resolve modal; not yet shown in incident drawer |
| `disciplinaryActions` | `DisciplinaryAction` | **Gap** | Disciplinary catalog screen (`/configuration/discipline`) |
| `studentIncidentInvolvements` | `StudentIncidentInvolvement` | **Partial** | Incident drawer involved-students sub-collection |
| `incidents` | `Incident` | **Primary** | School incidents |

### 9.3 V1 gaps → features

| Entity gap | Delivers feature (§3) |
|------------|----------------------|
| `gradeLevels` | Configuration → Grade levels |
| `staffAssignments` | Class config drawer — class-level staff tab |
| `classActivityEnrollments` | Activity drawer / class timetable — link activity to class |
| `periodDefinitions` | Academic calendar admin |
| `attendanceMode` (on `classGroups`) | Classes config profile · conditional `/attendance` nav |
| `attendances` | Classes → Daily attendance (daily mode only) |
| `enrollments` | Student drawer → Enrollments tab |
| `disciplinaryActions` | Configuration → Disciplinary catalog |
| `studentDisciplinaryActions` | Incidents drawer — show applied sanctions post-resolve |
| `studentIncidentInvolvements` | Incidents list — multi-student row representation |

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial catalog from app-shell spec + webapp route audit |
| 2026-07-03 | §9 domain entity coverage audit vs `CoreEntityMap` |
| 2026-07-03 | Reframed as v1 **target end state**; resources post-v1; gap tracker aligned |
| 2026-07-03 | §3 reformatted: module index + feature cards (readable layout) |
| 2026-07-03 | Toolbar rule: Search + main filter (`<select>`); chip bars → Filter panel |
| 2026-07-03 | Homework folded into Assessments — remove dedicated `/homework` nav |
| 2026-07-03 | `ClassGroup.attendanceMode` spec + §0 progress tracker; daily vs session attendance |
| 2026-07-03 | §2 UX decisions locked: staff permissions, incidents, assessments, timetable, roles removal |
| 2026-07-03 | §6.1 Backend blockers — API/domain gaps vs UI-only gaps |
| 2026-07-03 | §6.1 reassessed: B1/B3 resolved; B5 active (web client regen) |
| 2026-07-03 | B2: `db:migrate:full` runs legacy staff-access cutover before migration 0038 |
| 2026-07-03 | B4 + incident resolve: `resolve-incident-with-outcomes` backend + `IncidentResolveModal` web; §0/§6.1 all blockers ✅ |
| 2026-07-03 | Added normative [v1-feature-architecture-spec.md](../specs/v1-feature-architecture-spec.md); reference doc = progress catalog |
| 2026-07-03 | Added [shared-components-spec.md](../specs/shared-components-spec.md) to companion specs |
| 2026-07-03 | Normative §5.3.1 permissions UI; reference Staff card links to spec |
| 2026-07-03 | Added [v1-staff-webapp-implementation-plan.md](../sprints/v1-staff-webapp-implementation-plan.md) |
