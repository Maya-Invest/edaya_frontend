# UI Architecture Reference

> **Applies to:** `apps/webapp` feature screens (staff webapp)  
> **Companion specs:** [app-shell-spec.md](../specs/app-shell-spec.md) · [design-language-spec.md](../specs/design-language-spec.md) · [data-loading-spec.md](../specs/data-loading-spec.md)

This document is the **target UI architecture catalog** for the EDAYA staff webapp (v1). It describes the **desired end state** — routes, entities, filters, drawer structure, and complexity class — for sprint planning and API/UI gap closure.

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

| Slot | Rule |
|------|------|
| **Primary CTA** | Exactly one create action → modal |
| **Search** | Instant filter on primary label fields |
| **Main filter** | Highest-frequency facet (inline chips or select) |
| **Filter button** | Advanced facets (date range, scope, secondary status…) |
| **More menu** | Export, import, bulk ops, view toggle, column settings |
| **Row `···` menu** | Per-row mutations; **primary surface for simple entities** |

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

---

## 3. Feature catalog (target end state)

Implementation status in the rightmost column: **Built** · **Partial** · **Planned**.

### 3.1 Dashboard

| Field | Target |
|-------|--------|
| **Route** | `/dashboard` |
| **Layout** | **Custom** — KPI cards, action queue, upcoming, class risk |
| **Detail surface** | — (cards deep-link to modules) |
| **Status** | **Built** |

---

### 3.2 School module

| Feature | Route | Entity | Display | Complexity | Main filter | Secondary filters | Primary CTA | Entity header | Drawer body | Status |
|---------|-------|--------|---------|------------|-------------|-------------------|-------------|---------------|-------------|--------|
| **Student list** | `/school/students/[[id]]` | `Student` | Table ↔ cards | Complex | Class | Enrollment status | Add student | Edit profile · Change class | **Tabs + sections:** Profile (identity, health, guardians, notes) · Grades · Attendance · Incidents · Finance · Report card · **Enrollments** (history) | **Partial** |
| **Guardian list** | `/school/guardians/[[id]]` | `Guardian` | Table | Complex | Search | Relation; linked class | Add guardian | Edit · Link student | Sections: contact · account linking · linked students | **Built** |
| **Staff** | `/school/staff/[[id]]` | `StaffMember` | Table | Complex | Search | Role; active; class | Add staff | Edit profile · Manage assignments | **Tabs:** Profile · Permissions · **Assignments** (class/subject links) | **Partial** |
| **School calendar** | `/school/calendar/[[id]]` | `CalendarEvent` | Timeline list | Complex (thin) | Event type | Scope; date range | New event | Edit · Duplicate | Sections: dates, scope, description | **Built** |
| **Activities** | `/school/activities/[[id]]` | `Activity` | Table | Complex | Category | Period; capacity | New activity | Edit · Manage enrollments | Sections + Enrollments sub-collection | **Built** |
| **Announcements** | `/school/announcements/[[id]]` | `Announcement` | Table | Complex | Status | Priority; audience | New announcement | Edit · Publish | Sections: content · Targets sub-collection | **Built** |
| **School incidents** | `/school/events/[[id]]` | `Incident` | Table | Complex | Class | Category; severity; status | Log incident | Edit · Resolve | Sections: summary · **Involved students** sub-collection · linked `studentDisciplinaryActions` | **Partial** |

---

### 3.3 Classes module

Class context from sidebar **class picker**. Routes: `/classes/{classId}/…`

| Feature | Route segment | Entity | Display | Complexity | Main filter | Primary CTA | Entity header | Drawer body | Status |
|---------|---------------|--------|---------|------------|-------------|-------------|---------------|-------------|--------|
| **Students (photo roster)** | `students/[[id]]` | `Student` | **Cards** default | Complex | Status | Add student | Same as school student | Same as school student | **Partial** (cards + entity header) |
| **Timetable** | `timetable/[[id]]` | `LessonSession` \| `ActivitySession` \| `Assessment` (exam) | Week grid | Complex | Week navigation | New session | Edit · Take attendance | **Tabs:** Details · Attendance · Logbook | **Partial** |
| **Lessons** | `teaching/[[id]]` | `ClassSubject` | List + progress | Complex | Search | — | Edit · Delete | **Tabs:** Progression · Logbook | **Built** |
| **Homework** | `homework/[[id]]` | `Assessment` (`kind: homework`) | Card list | Complex | Status | New homework | Edit · Grade submissions | Sections + submissions (`assessmentResults`) | **Built** |
| **Assessments** | `evaluations/[[id]]` | `Assessment` | Cards | Complex | Grading status | New evaluation | Enter grades · Edit | Sections + grades grid | **Built** |
| **Report cards** | `report-cards/[[id]]` | `ReportCardResult` | Table | Complex | Publication status | Generate all | Publish · Regenerate | Sections: summary · breakdown | **Built** |
| **Daily attendance** | `attendance/[[id]]` | `Attendance` | Day board | Complex | Date | Mark day | — | **Tabs:** Summary · Records (`attendance`) | **Planned** |

---

### 3.4 Finance module

| Feature | Route | Entity | Display | Complexity | Main filter | Primary CTA | Detail surface | Status |
|---------|-------|--------|---------|------------|-------------|-------------|----------------|--------|
| **Fees** | `/finance/fees` | `Fee` | Table + KPI | **Simple** | Category | New fee | Row `···`: Edit · Delete | **Partial** (drawer today) |
| **Billing** | `/finance/billing/[[id]]` | `StudentFee` | Table + KPI | Complex | Payment status | Assign fee | Entity header + installments sub-list | **Built** |
| **Payments** | `/finance/payment` | `Payment` | Ledger + KPI | **Simple** | Class; status | Record payment | Row `···`: View receipt → billing drawer | **Partial** |

---

### 3.5 Configuration module

| Feature | Route | Entity | Display | Complexity | Primary CTA | Detail surface | Status |
|---------|-------|--------|---------|------------|-------------|----------------|--------|
| **School profile** | `/configuration/school` | `School` | Single-record | Variant | Edit school | Read-only fields + edit modal | **Built** |
| **Academic calendar** | `/configuration/academic` | `AcademicYear` · `AcademicPeriod` · `PeriodDefinition` | Accordion | Variant | Create year | Years expand inline; periods + **period definitions** CRUD via modals | **Partial** (no period-definition admin) |
| **Grade levels** | `/configuration/grade-levels/[[id]]` | `GradeLevel` | Table | Complex | Add grade level | Drawer: Profile · Default subjects (`gradeLevelSubjects`) | **Planned** |
| **Classes** | `/configuration/classes/[[id]]` | `ClassGroup` | Table | Complex | Add class | Drawer: Profile · **Staff assignments** · Student count | **Partial** (row modal today) |
| **Subjects catalog** | `/configuration/subjects/[[id]]` | `GradeLevelSubject` | Grouped list | Complex | Add subject | Drawer: Details · Matters/chapters | **Built** |
| **Report card models** | `/configuration/report-cards/[[id]]` | `ReportCardDefinition` | List | Complex | New model | Sections: structure tree · preview | **Built** |
| **Grade scales** | `/configuration/grade-scales` | `GradeScale` | Table/cards | **Simple** | Add scale | Row `···`: Edit · Delete · Set default | **Partial** (inline card edit) |
| **Notification templates** | `/configuration/notifications` | `SchoolNotificationTemplates` | Categorized cards | **Simple** | Reset all | Row Edit → modal | **Partial** |
| **Roles & permissions** | `/configuration/roles/[[role]]` | `StaffPermissionAssignment` | List → matrix drawer | Complex | — | Tabs: Permissions matrix · Members | **Built** |
| **Disciplinary catalog** | `/configuration/discipline` | `DisciplinaryAction` | Table | **Simple** | Add action | Row `···` only | **Planned** |

---

### 3.6 Account module

| Feature | Route | Entity | Display | Complexity | Detail surface | Status |
|---------|-------|--------|---------|------------|----------------|--------|
| **Inbox** | `/account/inbox/[[id]]` | `MessageDelivery` | List | Complex (thin) | Sections: body · delivery status | **Built** |
| **Notification settings** | `/account/notifications` | — | Form sections | Variant | — | **Built** |
| **Profile** | `/account` (modal) | — | Modal | Variant | — | **Built** |

---

## 4. Complexity summary (v1 target)

| Classification | Features |
|----------------|----------|
| **Complex (drawer)** | Student, Guardian, Staff, Activity, Announcement, Incident, Timetable session, ClassSubject, Homework, Assessment, ReportCardResult, StudentFee, ClassGroup, GradeLevel, GradeLevelSubject, ReportCardDefinition, MessageDelivery, Attendance (daily board) |
| **Simple (row `···` menu)** | Fee, GradeScale, SchoolNotificationTemplates, Payment, DisciplinaryAction |
| **Thin drawer (sections only)** | CalendarEvent |
| **Layout variant** | Dashboard, School profile, Academic calendar accordion |
| **Matrix in drawer** | Roles & permissions |
| **Post-v1** | Resource, ResourceAssignment — no staff UI |

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
| Homework | `/classes/{classId}/homework` | `…/homework/{id}` |
| Assessments | `/classes/{classId}/evaluations` | `…/evaluations/{id}` |
| Report cards (class) | `/classes/{classId}/report-cards` | `…/report-cards/{id}` |
| Daily attendance | `/classes/{classId}/attendance` | `…/attendance/{id}` |
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
| Roles | `/configuration/roles` | `/configuration/roles/{role}` |
| Account inbox | `/account/inbox` | `/account/inbox/{id}` |

---

## 6. V1 implementation gaps

Work remaining to reach the target architecture in §3. Ordered by priority.

| Priority | Area | Today | Target |
|----------|------|-------|--------|
| **P0** | Grade levels | No route | `/configuration/grade-levels` + drawer |
| **P0** | Staff assignments | API only | Class drawer + Staff **Assignments** tab |
| **P0** | Drawer entity header | Footer / body identity | Identity + top 2 actions per §3.1 (all complex entities) |
| **P1** | Classes config | Row edit modal | URL-backed drawer + staff assignments |
| **P1** | Disciplinary catalog | No screen | `/configuration/discipline` simple list |
| **P1** | Period definitions | Shell context only | CRUD under Academic calendar |
| **P1** | Simple entities | Drawer or inline edit | Fee, grade scale, notification templates → row `···` only |
| **P1** | Incidents | Single student focus | Involved students + `studentDisciplinaryActions` workflow |
| **P2** | Student enrollments | Change-class only | **Enrollments** tab (history) on student drawer |
| **P2** | Daily attendance | No screen | `/classes/{classId}/attendance` day board |
| **P2** | Payments | List only | Row menu; receipt links to billing drawer |
| **P2** | Filter button | Inline chips only | Advanced facets behind Filter ▾ |
| **P2** | More menu | Export stub | Per-feature export/bulk |
| **—** | Resources | Component exists | **Post-v1** — remove from v1 nav and planning |

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
- List: primary CTA · search · main filter · filter button · more · row ···
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
| Staff | `staffMembers`, `staffAssignments`, `staffPermissionAssignments` |
| School calendar | `calendarEvents` |
| Timetable | `schedules`, `lessonSessions`, `activitySessions`, `assessments` (exam sessions) |
| Lessons | `classSubjects`, `classSubjectMatters`, `classSubjectProgress`, `gradeLevelSubjects` |
| Homework | `assessments` (`kind: homework`), `assessmentResults` |
| Assessments | `assessments`, `assessmentResults` |
| Report cards | `definitions`, `sections`, `results`, `gradeScales` |
| Finance | `fees`, `studentFees`, `payments` |
| Structure | `schools`, `academicYears`, `academicPeriods`, `periodDefinitions`, `classGroups`, `gradeLevels` |
| Discipline | `incidents`, `disciplinaryActions`, `studentDisciplinaryActions`, `studentIncidentInvolvements` |
| Access | `staffPermissionAssignments` |
| Account | `messageDeliveries` |
| Post-v1 | `resources`, `resourceAssignments` |

---

## 9. Domain entity coverage (v1 target)

Audit of all **51** `CoreEntityKey` values.  
**Coverage:** **Primary** · **Sub** · **Supporting/infra** · **Gap** (v1 target missing) · **Post-v1** (deferred).

### 9.1 Summary

| Coverage | Count |
|----------|------:|
| **Primary** (v1 target) | 23 |
| **Sub-entity** | 17 |
| **Supporting / infra** | 2 |
| **Gap** (v1 work remaining) | 8 |
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
| `staffAssignments` | `StaffAssignment` | **Gap** | Class drawer · Staff assignments tab (planned) |
| `accountInvitations` | `AccountInvitation` | **Sub** | Account linking · onboarding |
| `staffPermissionAssignments` | `StaffPermissionAssignment` | **Sub** | Staff permissions · Roles matrix |
| `attachments` | `Attachment` | **Infra** | Profile photos / uploads |
| `resources` | `Resource` | **Post-v1** | — |
| `resourceAssignments` | `ResourceAssignment` | **Post-v1** | — |
| `fees` | `Fee` | **Primary** | Fees (simple row menu target) |
| `studentFees` | `StudentFee` | **Primary** | Billing |
| `payments` | `Payment` | **Primary** | Payments ledger |
| `schedules` | `Schedule` | **Sub** | Timetable |
| `lessonSessions` | `LessonSession` | **Primary** | Timetable drawer |
| `activitySessions` | `ActivitySession` | **Primary** | Timetable drawer |
| `attendances` | `Attendance` | **Gap** | Daily attendance board (planned) |
| `calendarEvents` | `CalendarEvent` | **Primary** | School calendar |
| `attendance` | `AttendanceRecord` | **Sub** | Session attendance · Student attendance tab |
| `announcements` | `Announcement` | **Primary** | Announcements |
| `announcementTargets` | `AnnouncementTarget` | **Sub** | Announcement drawer |
| `messageDeliveries` | `MessageDelivery` | **Primary** | Account inbox |
| `schoolNotificationTemplates` | `SchoolNotificationTemplates` | **Primary** | Notification templates |
| `subjects` | `Subject` | **Supporting** | Global catalog lookups |
| `subjectMatters` | `SubjectMatter` | **Sub** | Subject / class-subject matters |
| `gradeLevelSubjects` | `GradeLevelSubject` | **Primary** | Subjects catalog · Grade level drawer |
| `gradeLevelSubjectMatters` | `GradeLevelSubjectMatter` | **Sub** | Subjects catalog drawer |
| `classGroups` | `ClassGroup` | **Primary** | Classes config |
| `classSubjects` | `ClassSubject` | **Primary** | Lessons (teaching) |
| `classSubjectMatters` | `ClassSubjectMatter` | **Sub** | Lessons progression |
| `classSubjectProgress` | `ClassSubjectProgress` | **Sub** | Lessons progression tab |
| `activities` | `Activity` | **Primary** | Activities |
| `activityEnrollments` | `ActivityEnrollment` | **Sub** | Activity drawer |
| `assessments` | `Assessment` | **Primary** | Evaluations · Homework |
| `assessmentResults` | `AssessmentResult` | **Sub** | Grades · Homework submissions |
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
| `studentDisciplinaryActions` | `StudentDisciplinaryAction` | **Gap** | Incident resolve workflow (planned) |
| `disciplinaryActions` | `DisciplinaryAction` | **Gap** | Disciplinary catalog (planned) |
| `studentIncidentInvolvements` | `StudentIncidentInvolvement` | **Gap** | Incident involved-students sub-collection (planned) |
| `incidents` | `Incident` | **Primary** | School incidents |

### 9.3 V1 gaps → features

| Entity gap | Delivers feature (§3) |
|------------|----------------------|
| `gradeLevels` | Configuration → Grade levels |
| `staffAssignments` | Classes config drawer · Staff assignments tab |
| `periodDefinitions` | Academic calendar admin |
| `attendances` | Classes → Daily attendance |
| `enrollments` | Student drawer → Enrollments tab |
| `disciplinaryActions` | Configuration → Disciplinary catalog |
| `studentDisciplinaryActions` + `studentIncidentInvolvements` | Incidents drawer enhancement |

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial catalog from app-shell spec + webapp route audit |
| 2026-07-03 | §9 domain entity coverage audit vs `CoreEntityMap` |
| 2026-07-03 | Reframed as v1 **target end state**; resources post-v1; gap tracker aligned |
