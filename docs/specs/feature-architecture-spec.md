# Feature architecture and content contracts

Normative for the staff `apps/webapp`. This document owns domain meaning, capabilities, required information, permissions and transaction semantics. Shared UI specs own composition and interaction. Neither code discrepancies nor a feature's greater specificity overrides a shared UI rule; deviations require a named exception.

## 1. Scope and boundaries

All staff navigation, class-scoped routes, configuration, finance, account, authentication and onboarding surfaces in §6 must satisfy the contracts below. Teacher, guardian and student portals remain separate products; this workspace manages their actors without becoming their sign-in portal.

Resource management (`resources`, `resourceAssignments`) and room/resource booking have no staff surface. Permission profiles and Staff Permissions replace a roles matrix; `/configuration/roles` must not expose one. Homework is an assessment kind on evaluations, never a separate homework route; timed assessments do not create a separate exam menu. These are product boundaries, not permission to remove authorized business information.

## 2. Shell, routes and navigation

Sidebar order must be Dashboard, Inbox, School, Classes, Finance, Configuration. Inbox / Boîte de réception owns My inbox / Ma boîte de réception, School messages / Messages de l’école, and Corrections / Corrections, in that order. The global account trigger opens one dialog containing Profile, Notifications and Security. Queue links must not be duplicated in School or the account dialog; recipient scopes, workflow grants and existing routes remain independent. Child badges retain their established meanings; no combined Inbox count is permitted. Sidebar context is School then Academic year then navigation. Language and account remain global. Term selection belongs beside affected academic content: dashboard, assessments/metrics, report cards, grade corrections, timetable planning, relevant drawer tabs and logbook exports. It must not appear for unrelated finance, attendance or configuration. Generation term presets belong inside its workspace.

Class routes use `/classes/{classId}/…` and the shared class picker. Daily-mode classes expose Attendance; session-mode classes use occurrence Attendance on the timetable. The `homeroomStaffId` administrative coordinator is not a teaching assignment or a permission grant.

Standard collections use title/count left and Search, Filter, `···` right. All facets are in Filter; primary collection actions are first in `···`. Every feature below declares its collection or named specialized composition. List uses Subject-list rows; Table compares structured fields. No implicit card-grid alternate is permitted.

Inspection uses `/{module}/{entity}/{id}` with domain child routes for tabs. Forms use `modal`, `modalTarget`, `modalStep`, `modalTab`; focused tasks use `task`, `taskTarget`, `taskStep`, `taskPanel`. Corrections retain query-addressed `correction={id}` inspection. A presentation choice must not add an API operation.

## 3. Common contract inherited by every feature

Each §7 contract includes the following mandatory defaults, supplemented only by its explicit assignments:

- **Collection:** only the declared type is permitted; “both” means Table default with List alternate. Listed row fields are ordered defaults; identities and essential status/context are mandatory. Optional directory fields use the authorized Columns model. Search matches the declared identity text over the complete authorized dataset. No implicit additional facet/sort is permitted. Default ordering is identity ascending with stable ID ties unless a contract specifies another order; date queues use their declared chronology. Server support is required for full-dataset sorting; unavailable sorts are omitted rather than applied to loaded rows only.
- **Inspection:** the listed sections/tabs are ordered and required when authorized. Every field in a section is labeled and read-only; stored business values must not be inferred from absent data. Optional fields show Not provided; required missing configuration shows Not configured; unqueryable history shows Unavailable. Optional decorative sections alone may be omitted. Authorized related collections remain visible when empty. Content named as history may show only persisted facts.
- **Actions:** `Collection` means its `···`; `Record` means the drawer header (first two non-destructive actions visible, rest overflow); `Section` means that section's `···`; `Row` means the named collection-only/subrecord row menu; `Selection` means its action bar; `Task` means persistent task actions. Destructive actions are in overflow before their confirmation. A row shortcut must match the authoritative action's label, eligibility and result. Unlisted create/delete/bulk operations must not be inferred from entity CRUD.
- **Eligibility:** an action requires its canonical effective permission in the exact school/year/record scope, compatible business lifecycle, valid form and no duplicate pending command. Unauthorized actions are hidden; permitted but state-blocked actions remain disabled with a reason. Direct URLs and submit handlers check the same gates; server authority remains final. A missing related-domain grant removes that domain, not its parent identity; partially restricted fields must say Restricted without leaking counts.
- **Editing:** bounded changes use modals, with 32rem default and only the app-shell's assigned 48rem forms. Substantial imports, timetable generation, multistudent grading and class/session attendance use focused workspaces. Single-record attendance/marks and bulk confirmations stay bounded. Save units remain the existing commands; no implied atomicity or new endpoint.
- **States:** initial loading, same-scope refresh, loading more, no records, no matches, denial, local load failure, mutation failure and saved/refresh-failed must follow the app-shell matrix. Each authorized tab/section resolves independently; errors never become zeros or empty successes. Unavailable detail must offer a valid return destination without exposing forbidden data.
- **Continuity:** canonical return is the owning route in §6 (or selected class/level/year page). Related navigation replaces the one drawer and preserves originating record/tab through contextual Back; Close restores the underlying collection. Search, facets, sort, view, loaded position and focus survive inspection/task return. Scope changes guard dirty work and close incompatible targets. Direct links resolve authorized records independently of loaded/filter-matching rows.

Related collections use Table for structured marks, attendance, financial records, enrollments, assignments, availability and documents; List for narrative history, incidents, announcements, campaigns and conversations. Their default columns/row facts are the ordered fields in their content contract; primary action belongs to their menu. They have no extra facets unless explicitly named below. Search matches their named person/title identity; purely chronological event history is a reading section, not a searchable collection. All subrecord edits and deletions use their row menu; no unrelated drawer footer duplicates them.

Named exceptions and their exact boundaries are defined in the app-shell spec. The assignments below must not authorize extra visual variants.

## 4. Domain invariants

These requirements must remain true for every assigned UI surface.

| Topic | Decision |
|-------|----------|
| **Staff assignments (config)** | **Class-level only** in Configuration → Classes drawer (`staffAssignments` with `classGroupId`). No lesson/session/subject-level staff-assignment surface is permitted. |
| **Staff permissions** | Catalog at `/configuration/permission-profiles`. Runtime authority stays grant rows on **Staff drawer → Permissions**. No `/configuration/roles` matrix. |
| **Incident resolve** | **One modal** — involved students, role, optional `DisciplinaryAction` per student, resolution notes. Command: **`resolveIncidentWithOutcomes`** (atomic). Drawer: involved students read-only; edits only via Resolve modal. |
| **Assessments by `kind`** | **One route** `/evaluations`. Same routed drawer for all kinds: Details + Grading child tabs; Grading shows read-only homework submission/results or marks; entry opens its assigned form/task. List row: **kind badge**. |
| **Timed assessments** | No exam menu. Quiz/project/other require a visible date and start/end (school timezone) or `lessonSessionId`. They appear on the evaluations list; a separate **Add to timetable** action is outside the supported assessment flow. |
| **Homework** | `Assessment` with `kind = homework` on evaluations screen — **no** `/homework` nav. Kind is frozen on edit (no homework↔quiz conversion). |
| **Daily attendance** | **List of days** + drawer (same pattern as timetable session). Edits **permission-gated**, not mode-locked UI. |
| **Timetable ↔ Schedule** | **From timetable:** New session wizard (Lesson · Activity · Assessment) → creates `Schedule` + materialized occurrence. **From Lessons / Activities:** optional schedule fields within the create/edit form. Assessments require occurrence times; a separate Add to timetable action is outside this assessment flow. |
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
| `Incident` | Inspection drawer at `/school/events/[[id]]` |
| `StudentIncidentInvolvement` | Sub-collection on incident drawer; resolve modal writes via `resolveIncidentWithOutcomes` |
| `StudentDisciplinaryAction` | Created in resolve modal; show in drawer post-resolve |
| `DisciplinaryAction` | Simple list inside `/configuration/other` — row `···` menu |

### 5.3 Permissions

- Runtime authority is `staffPermissionAssignments` grant rows. Policies never read a profile name.
- School-owned **permission profiles** are reusable permission bundles at `/configuration/permission-profiles`; they may mix permission scope types. Scope selections belong to staff assignments. Bound grants are stamped with `sourceProfileId` and `sourceProfileBindingId` and stay locked. Manual assignment sources stay add/edit/delete; their generated grants carry `sourceManualAssignmentId`.
- Picker labels: `GET authorization/permission-catalog` + `POST authorization/scope/render`.
- Client edits typed `customScopes` and `useDefaultScopes`. Each staff member has default scope selections for each academic year. Generation unions compatible custom selections with defaults when enabled; it never overwrites custom selections. Empty or incompatible resource selections produce no runtime grant; unscoped actions need no user scope selection. The saved assignment remains with persistent warnings and regenerates when repaired. The server validates the action, target, year and validity on save. Manual grants and staff assignments are separate facts; no permission rows are copied from assignments.

#### 5.3.1 Staff permission assignment UI

Grant rows stay on **Staff drawer → Permissions**. Profile **templates** live in Configuration. There is **no** `/configuration/roles` matrix screen.

| Surface | Rule |
|---------|------|
| **Catalog** | `/configuration/permission-profiles` — list with a read-only profile drawer. Read `ACCESS_CONTROL_READ`; create/edit/delete `ACCESS_CONTROL_MANAGE`. |
| **Location (grants)** | Staff drawer → **Permissions** tab (`/school/staff/{id}`) |
| **Mutation pattern** | **Modal-only** for custom grants and apply/remove; reorder via explicit up/down. No inline permission toggles, no CRUD matrix layout |
| **Navigation** | Staff drawer has Profile and Permissions tabs. Permission actions live inside Permissions; no redundant Manage permissions header button. Legacy staff Assignments URLs redirect to Permissions. |
| **Gating** | Apply / remove / reorder / custom add-edit-delete require `ACCESS_CONTROL_MANAGE` via `PermissionGate` (hide when unauthorized; disable only when permitted but state-blocked, with an accessible reason) |

**Permissions tab anatomy** (drawer sub-collection pattern):

Sub-collections must be read-only with one scoped menu and row actions opening forms; no inline editing in the tab body.

Permissions menu: Apply profile first, Add permission second. Default scopes has its own Edit action in its section menu. Profile binding row menus own Move up, Move down and Remove; manual source row menus own Edit and Delete. Reorder commands are the explicit X-PERMISSION-ORDER exception.

| Element | Behavior |
|---------|----------|
| **Locked profile groups** | Bindings in `sortOrder` (0 = highest). Each group starts collapsed and independently expands its permission list. The profile name, permission count, effective scope tags, warning summary and gated actions remain visible. Effective scope tags sit beside the profile name and wrap when needed. Tags deduplicate by typed scope identity and exclude unavailable or ineffective grants. Expansion follows binding identity through reordering and resets for a different staff member, school or year. Later profiles **skip** permissions already claimed by an earlier profile — muted hint “already granted by {profile}”. No row Edit/Delete on stamped grants. |
| **Reorder** | Up/down rewrites `sortOrder` then re-resolves that staff for the selected year (first-wins). An unresolved earlier profile still claims the permission; later profiles cannot silently broaden it. |
| **Remove profile** | Confirm → drop binding, re-resolve remaining. Custom grants remain. |
| **Apply / edit profile** | Modal: profile picker, include-defaults checkbox (on initially), grouped scope selections relevant to the bundle. Review generated access changes before save. Appends at lowest rank for the selected year. Re-applying the same profile updates saved selections and keeps rank. |
| **Allowed scope types** | Permission names in the profile checklist, applied profile rows and custom permission rows show wrapping scope-type tags from the same catalog and `permissionSelectionGrains` mapping used by the editor. These describe accepted types, independently of effective scope tags. Manual permission options include the types before selection; the selected permission shows tags. |
| **Default scopes** | Selected-year summary with every saved scope rendered as a wrapping tag, an explicit empty state, and Edit modal with grouped selections. Review added, changed and removed access before saving. Re-resolves profile and manual assignments that include defaults. |
| **Additional permissions** | Manual assignment sources, including unresolved requests. Section menu Add permission → **StaffPermissionFormModal** (custom only). |
| **Row** | Permission label (i18n `permission.{CODE}`) · **scope label** from `scope/render` |
| **Stale scope** | When `scope/render` reports missing segments → warn badge (do not block read) |
| **Custom row actions** | Edit → same modal (pre-filled); Delete → confirm → `removeStaffPermission`. Hidden on stamped rows. |
| **Staff create** | Optional profile with relevant custom scope selections and include-defaults flag (rank 0). No implicit whole-school access. Defaults for a new staff member start empty. |
| **Empty state** | Explicit no-permissions message naming Apply profile / Add permission in the scoped menu when authorized |

**Add / edit modal** (`StaffPermissionFormModal`):

| Field | Control | Rule |
|-------|---------|------|
| **Permission** | `<select>` from catalog | Required; options from `GET authorization/permission-catalog` |
| **Include defaults** | Checkbox | On initially; adds compatible selected-year defaults to saved custom selections |
| **Custom scopes** | `PermissionScopeSelections` + `ScopeBuilder` | Explicit resource selections compatible with the catalog scope policy; unscoped actions have no scope/default controls |
| **Submit** | Review changes → Save | `assignStaffPermission` preview then save; show added/changed/removed access and unresolved warnings; toast on success; refresh tab list |

**ScopeBuilder** — one control set per allowed resource grain from catalog `scopePolicy`:

| Grain | UI | Typed scope fields |
|-------|----|--------------------|
| `class_group` | Repeatable class selections | `classGroupId` |
| `grade_level` | Repeatable grade selections | `gradeLevelId` |
| `subject` | Grade → Subject / All subjects → All classes / Selected classes | `gradeLevelId`, optional `subjectId`, optional `classGroupId`; repeat entries for multiple classes |
| `student` | Repeatable StudentPicker | `studentId` |
| `activity` | Activity and/or class selection | `activityId` and/or `classGroupId` |
| `platform` | Not assignable in school UI | — |

Subject scope uses the grade-owned Subject identity. No class restriction includes matching classes created later in the grant’s academic year. `scopePolicy.subjectClassRequired` in the permission catalog requires a selected class and disables the global All subjects wildcard; a profile uses this constraint when all its Subject-capable permissions require a class. Mixed profiles can also select unrestricted Subject scopes for compatible permissions; the preview reports the class-required permissions that remain unresolved. Defaults remain permission-independent and the existing preview reports permissions that cannot resolve. Changing the grade preserves restricted mode and requires selecting a compatible class again; changing the subject preserves the class. `ClassSubject` remains the teaching record, never a permission scope.

Every entry carries its `kind`. Selecting all targets is explicit: `{ kind: "all", grain }`. Empty selections deny; they never mean whole school. Scope editing preserves all entries and the grant's validity dates.

Scope labels use `POST authorization/scope/render` with `{ academicYearId, items: [{ permission, scopes }] }`. Default selection labels use `POST authorization/scope-selections/render` with `{ academicYearId, scopes }`, returning `{ scopes: [{ scope, label, missing }] }`. It accepts mixed selection grains, requires access-control read authorization, and validates resource ownership and academic placement independently of any permission. The web never creates or parses delimited authorization paths.

The session contains one typed action-grant display. UI checks use that action's scopes and validity; owner labels and preset names never bypass those checks. The server remains authoritative for resource policies.

**Data loading:**

- `querySchoolStaffPage` loads `permission-catalog` into the staff route state.
- Assignments load via the Permissions tab child route `PageQuery` (or with staff list when colocated); views built via `buildStaffPermissionAssignmentViews`.
- Mutations: `configurePermissionProfile` / `applyStaffPermissionProfile` / `reorderStaffPermissionProfiles` / `removeStaffPermissionProfile` for bound grants; `assignStaffPermission` / `removeStaffPermission` for manual sources and `configureStaffPermissionScopeDefaults` for defaults. Preview commands never write. Permission-review writes must wait for authoritative success, then reconcile and bump `entityVersions` (`staff`).

**Staff assignments:** managed in the Configuration → Levels and Classes → Classes drawer. Staff drawers have no Assignments tab; old `/school/staff/{id}/assignments` links redirect to Permissions, preserving query parameters.

**Forbidden surfaces:** `/configuration/roles` route, roles matrix, `StaffRoleAssignment` UI, inline CRUD matrix toggles for permissions. Do **not** treat `StaffMember.profileRole` as authority.

#### 5.3.2 Canonical catalog and resource selections

The API catalog's `staffAssignable`, `serviceAccountAssignable`, `assignmentTargets` and `scopePolicy` determine picker availability. Do not infer eligibility from action names or maintain permission-specific scope exceptions. Unscoped actions have no scope/default controls, supported-scope badges, or effective-scope labels. Their internal `school` grant marker is never a user selection. Profiles automatically include their unscoped actions; mixed profiles expose resource selectors only for resource-scoped members. Default scopes contain resource selections only. Empty resource selections grant no access; broad access requires explicit All at a supported grain. Preserve preview/save identity, ordering, first-wins and unresolved/shadowed warnings.

#### 5.3.3 Permission impact review

Permission impact review in profile editing, profile assignment, manual assignment, and default-scope editing is tied to an immutable snapshot of the complete submitted command, including school, staff/profile/source identifiers, academic year, scopes, defaults inclusion, and validity. Inputs remain editable during review. Changes, closure/reset, or target replacement invalidate review; outdated responses cannot enable Save or replace newer reports/loading state. Save requires a successful review matching current inputs.

### 5.4 School intake and annual profiles

Other configurations contains separate school-wide Academic disciplines and Placement statuses catalogues. Academic disciplines are independent of subject categories, chapters and disciplinary sanctions. Codes are immutable and school-unique ignoring case; labels/names and active state are editable. New subjects require a discipline. Legacy unlinked subjects display Not configured and support unrelated edits; a mapped subject retains its required association. Teacher annual discipline selections share this catalogue and do not create teaching assignments or permissions. Existing inactive references remain readable, while new selections require active entries. Referenced entries cannot be deleted.

Student and teacher annual information belongs to the explicitly selected academic year, surviving within-year transfers without being copied into a new year. Editors capture person, school and year; stale context blocks saving. Student annual information includes placement status and a three-state repeating value. Teacher declarations include disciplines, nullable nonnegative fractional hours and their explicit period. Removal deletes only the annual profile. The initial catalogue is empty; subject names never supply automatic mappings.

All staff-facing business fields must have a contextual editor, established command/workflow or read-only display. List, detail and editor surfaces must expose authorized business fields and make deliberate read-only exclusions explicit. Platform/service-account administration, credentials, internal processing metadata and deferred resource booking are excluded from ordinary staff forms. Teacher signatures and self-service notification contacts remain owner-controlled. Health, financial and family-feedback restrictions continue to apply.

Onboarding template subjects require explicit review of each discipline code and name before provisioning. The initial inputs are blank. Staff may deliberately reuse a code/name across template subjects to share a discipline. Provisioning validates the reviewed catalogue inside its transaction and rejects missing, conflicting or inactive mappings; it cannot create unlinked subjects.

### 5.5 Grading policies and captured results

Grade scales retain stable interval identifiers, codes, labels, minimum thresholds and optional assigned points. Passing is an optional report-card model setting for the overall average only; it is never interval or scale metadata. Ordinary metadata edits preserve intervals. Each interval has its own form; upper bounds are derived on the server from the next minimum. Matching uses the greatest minimum at or below the rounded result, includes the final maximum, and rejects out-of-range values. Unique codes/thresholds and a first threshold equal to the scale minimum are required. Catalog saves use revisions and never recalculate marks; explicitly applying a scale to a grade level retains the confirmation/background-update flow. Continuous scale bounds must be representable at the selected precision so rounding cannot leave the scale. Seeded and onboarded scales use continuous intervals with stable IDs and derived upper bounds; there is no conversion step in the configuration page. Historical readers retain captured interval conventions.

Levels and Classes → Details owns the unified URL-addressed level form, including grading settings for the current academic year. Each policy selects one scale, mandatory numeric-first or mention-first entry, and an aggregate label. Report models inherit that scale; they do not offer an independent conflicting selector. The configuration form collects explicit numeric equivalents for previous mention revisions when switching to numeric-first.

Calculation changes use exactly one confirmation before saving. Level Details displays Updating, Completed, or Failed with Retry. No impact dashboard or affected-record preview is provided. Drafts keep their opening revision and year so changes elsewhere cannot silently rebase an edit. Presentation labels do not recalculate marks.

Entry and correction forms use numeric fields or configured mention choices according to the policy. Original entries remain visible independently of derived values. Report displays use captured units, precision, and matched mentions rather than the mutable scale catalogue. Published results remain visible while a revised draft is reviewed, and the publish command sends that draft's exact policy revision and version. Bulk publication must not implicitly approve grading revisions.

## 6. Route index

| Module | List route | Detail route |
|--------|------------|--------------|
| Dashboard | `/dashboard` | — |
| Students (school) | `/school/students` | `/school/students/{id}` |
| Guardians | `/school/guardians` | `/school/guardians/{id}` |
| Staff | `/school/staff` | `/school/staff/{id}` |
| Teachers | `/school/teachers` | `/school/teachers/{id}` |
| School calendar | `/school/calendar` | X-CALENDAR event actions; no inspection drawer |
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
| Permission profiles | `/configuration/permission-profiles` | `/configuration/permission-profiles/{id}` |
| Configuration tools | `/configuration/tools` | — |
| Finance checks | `/configuration/tools/finance-checks` | — |
| Activity log | `/configuration/tools/activity-log` | `/configuration/tools/activity-log/{eventId}` |
| Teacher assignments hub | `/configuration/tools/teacher-assignments` | — |
| Inbox → My inbox | `/account/inbox` | `/account/inbox/{id}` |
| Account Security section | `/account/security`; `?modal=account-profile&modalTab=security` | `unlink={identifierId}` confirmation; account-level access without school |
| Inbox → School messages | `/school/messages` | `/school/messages/{id}` |
| Inbox → Corrections | `/school/corrections` | `?correction={id}` |
| Legacy marks review | `/school/marks-review` | Redirect to Corrections with `workflow=grades` |
| Academic disciplines | `/configuration/other/academic-disciplines` | — |
| Placement statuses | `/configuration/other/placement-statuses` | — |
| Account Notifications section | `/account/notifications`; `?modal=account-profile&modalTab=notifications` | Personal settings within X-ACCOUNT |
| Account Profile section | `?modal=account-profile&modalTab=profile` | X-ACCOUNT; captured invoking route |
| Login / demo | `/login`, `/login/demo` | X-ACCOUNT; bounded auth steps |
| Invitation | `/invite/{token}` | X-ACCOUNT; verified acceptance flow |
| Onboarding | `/onboarding` | X-ACCOUNT; provisioning steps |
| Entry routes | `/`, `/school`, `/classes`, `/configuration` | Authorized canonical landing/selection, no extra feature |
| Design evidence | `/__design` | Development-only component specimen, no production navigation |


---

### 6.1 Inspection addresses and canonical defaults

Human labels must not invent alternate route slugs. The record URL resolves the first authorized domain in the order below; a hidden sole-domain strip does not remove its address. A domain with read authority but no data remains accessible. Section drawers resolve at the record URL without synthetic single tabs.

| Family | Ordered tab labels → child slug |
| --- | --- |
| School / Class Students | Profile → `profile`; Grades → `grades`; Attendance → `attendance`; Incidents → `incidents`; Finance → `finances`; Report cards → `report-card`; Enrollments → `enrollments`; Documents → `documents` |
| Teachers | Profile → `profile`; Assignments → `assignments`; Availability → `availability`; Timetable → `timetable`; Assessments → `evaluations`; Family feedback → `family-feedback`; Documents → `documents` |
| Staff | Profile → `profile`; Permissions → `permissions` |
| Class teaching | Students → `students`; Progression → `progression`; Logbook → `logbook` |
| Configuration Classes | Class information → `profile`; Assignments → `assignments` |
| Activities | Activity information → `profile`; Participation → `students`; Scheduling → `classes` |
| Assessments | Details → `details`; Grading → `grading` |
| Family feedback | Setup → `setup`; Audience → `audience`; Moderation → `moderation`; Results → `results` |
| Timetable occurrences | Details → `details`; Attendance → `attendance`; Logbook → `logbook` for lessons only |
| Billing | Overview → record URL; Payments → `payments`; History → `history` |

Guardians, Subjects, Fees, daily attendance, report results/models, Incidents, Announcements, My inbox, permission profiles, notification templates, Conversations, Corrections and activity-log events use ordered sections. Subject configuration child URLs for progression/logbook must resolve to the subject's ordered information/chapters surface; class progress and logbook capabilities remain at Class teaching. Compatibility aliases must preserve valid scope and guard dirty work, without exposing a competing composition.

### 6.2 Compatibility route families

Aliases are navigation contracts, not additional compositions. They must retain valid query/target context and never broaden authorization.

| Alias | Canonical destination |
| --- | --- |
| `/configuration/staff/{id?}` | `/school/staff/{id?}` |
| `/configuration/roles/{staffId?}` | Staff collection or that staff member's Permissions; never a roles matrix |
| `/school/staff/{id}/assignments` | `/school/staff/{id}/permissions` |
| `/school/teacher-assignments` | `/configuration/tools/teacher-assignments` |
| `/classes/{classId}/subjects/{id?}` | Class teaching; selected record's Progression when identified |
| `/classes/{classId}/homework/{id?}` | Class evaluations; preserve a specified assessment identity |
| `/configuration/grade-levels/...` | Levels and Classes Details with resolved level |
| `/configuration/classes/...` | Levels and Classes Classes with resolved level/class |
| `/configuration/subjects/...`, `/configuration/structure/subjects/level/{level?}` | Levels and Classes Subjects with resolved level/subject |
| `/configuration/report-cards/{id?}` | Level Details models, resolving model level/year |
| `/configuration/other/grade-scales` | `/configuration/grade-scales` |
| `/finance/reconciliation` | `/configuration/tools/finance-checks` |
| `/school/marks-review` | `/school/corrections?workflow=grades` with valid remaining filters |

## 7. Feature specifications

Each feature must apply its complete content/surface contract plus §3 defaults and its domain rules. Ordered content is a requirement, not an illustrative list.

### 7.1 Dashboard

**Composition:** X-DASHBOARD; no entity drawer or collection-view alternate. Order: active school/year/term context; KPI summaries (student count, today’s attendance rate, overdue fee count, unpublished report count, open/high-severity incidents); action queue; upcoming school/session events; domain summaries; class-risk Table. Domain summaries must expose authorized attendance/absences/pending justifications, grading completion/published reports/incomplete classes, overdue amounts/students with balances/recent payments, and open/severe incidents/active activities/unresolved discipline. Class-risk rows must show class, attendance, incidents, grading completion, overdue fees, coordinator and domain-provided risk level. Upcoming events must name kind/title, date/time and destination. Each KPI must name measure, unit, scope and update/loading state; each queue row must identify record, reason for attention and destination. No unauthorized totals or fabricated zero.

**Actions and editing:** summary/queue activation is navigation to its canonical feature, preserving context. Queue actions belong to that queue's menu and use that feature's permission/lifecycle; the dashboard must not add a competing mutation workflow. Missing year, unavailable metric and no pending work are separate states. Return is `/dashboard`.

**Domain rules**

- KPI cards and action queue deep-link to modules

### 7.2 School — Students

**Collection:** both, Table default. Ordered row facts: published portrait/name, school and ministry matricules, current class, enrollment/active status. Search name/matricule; facets class, enrollment status and pending portrait review. Optional columns include identity/contact, annual declarations, guardian relationships and authorized health fields. No health information appears merely because the directory is readable.

**Inspection purpose:** student context across independent school domains. Header: published portrait, canonical name, matricules, current class/year and status. Tabs and ordered content must be:

| Tab | Required ordered content and related rows |
| --- | --- |
| Profile | Published/proposed portrait review when pending; canonical and original supplied names, birth date, gender, nationality and supplied identity/contact/address; selected-year placement/repeating declarations; authorized blood type, medical conditions, allergies, medications, emergency protocols, last health visit and health notes (retaining full supplied medical text); guardians with contact, relationship, occupation and per-student flags; notes |
| Grades | Selected period, class/subject assessment identity, kind/date, original value, captured derived score/mention and submission state; links to assessment inspection, no embedded entry form |
| Attendance | Mode-agnostic date/session anchor, class/subject, status, lateness/reason and review state; daily and session records remain distinguishable |
| Incidents | Date, title/category, student's role, severity, status and applied outcome; links to incident inspection |
| Finance | Authorized account scope, obligations, payments/credit and outstanding amounts; charge/payment rows identify fee, date, amount, status and source; no inaccessible zero |
| Report cards | Year/period/model, draft/review/publication state, captured result and available document; link to class report result |
| Enrollments | Class placement history with year/class and available dates/status; Optional Subjects with offering identity and Annual/period/Not enrolled choice |
| Documents | Year-scoped issuance identity/type, issue time, status and eligible download/retry/void actions; failure reason and unavailable output are explicit |

**Actions:** Collection Add student; Record Edit profile and Change class; remaining supported record lifecycle actions in overflow. Profile portrait section owns Approve, Reject and Replace published through bounded review forms; annual/health/guardian sections own their scoped Edit/Link actions. Attendance section owns Declare only for daily mode (session mode offers timetable navigation); Enrollments row owns Enroll/Update/Withdraw; Documents menu owns Generate and issuance rows own Download/Retry/Void. Related grade/incident/report navigation replaces the drawer with contextual Back.

**Editing and eligibility:** profile uses the wide form; transfer, attendance, relationships, document generation and optional-subject selection use bounded forms with their current commands. Student creation uses `STUDENT_CREATE`, editing `STUDENT_MANAGE`, health reads/edits `STUDENT_HEALTH_READ`/`STUDENT_HEALTH_UPDATE`, optional choices/transfers `ENROLLMENT_MANAGE`; each academic/finance/document domain retains its independent canonical grant. Published portrait decisions, publication locks and document status eligibility must not be bypassed. No mass student edit is implied.

**Domain rules**

- **Entity:** `Student` · **Inspection drawer**
- **Portrait review:** Approve / Reject / Replace published on the Profile tab (URL modals). Guardian and staff self-photos publish immediately from their own surfaces.

### 7.3 School — Guardians

**Collection:** Table only. Row order: guardian name, phone/email, linked-student count, account association; search name/contact; relationship-type facet.

**Inspection purpose and order:** one reading context, sections without tabs: Contact (canonical/original names, all supplied phone/email contacts, address and occupation); Account association (linked account or invitation state and verified-contact context); Linked students (student identity/class, relationship and each student's notification/pickup/financial flags). Missing contact and unlinked account must be explicit; unavailable relationship counts must not show zero.

**Actions:** Collection Add guardian; Record Edit and Link student; account section owns invitation/link actions; relationship Row Edit/Unlink. Delete belongs to record overflow only where the existing command permits it. `PARENT_READ` gates reads and `PARENT_MANAGE` gates management, with actor-scoped invitation checks. Profile editing uses the wide form; linking/relationship changes use bounded forms. Student links replace inspection and preserve Back; canonical return is Guardians.

**Domain rules**

- **Entity:** `Guardian` · **Inspection drawer**
- **Names:** Create/edit accepts an empty first name with a required last name. Display names omit surrounding whitespace; no placeholder or inferred name component is added.

### 7.4 School — Staff

**Collection:** Table only, human staff only. Row order: name, contact, descriptive profile role, active state, assignment context; search name/contact; facets assigned class and active state. Service accounts must not appear in counts or direct detail.

**Inspection purpose and order:** Profile and Permissions tabs. Profile shows photo, canonical/original identity, optional phone/email, descriptive role, active status and account association. Permissions shows selected year, saved default-scope summary, ordered profile bindings with scope/warnings, manual assignment sources, then generated effective grants. Bindings must show profile name, rank, permission count, effective scope and unresolved/shadowed warnings before expansion; permissions show localized code label and scope/validity. Assignment context never becomes a staff Assignments tab.

**Actions:** Collection Add staff member; Record Edit profile, with supported Delete in overflow. Profile account section owns invitation actions. Permissions scoped menu owns Apply profile then Add permission; Defaults owns Edit; profile-binding Row Edit selections/Move up/Move down/Remove; manual source Row Edit/Delete; generated stamped grants have no direct mutations. Permission forms are wide and require matching impact review; profile forms are wide. Reorder is X-PERMISSION-ORDER. Staff read/manage and access-control read/manage are independent; a readable staff profile must not imply readable grants. No selected profile may save before its scope metadata is ready.

**Domain rules**

- **Account scope:** human staff only. Apply `accountKind = human` to lists, counts and direct drawer lookup before pagination. Service-account lifecycle and permission changes use the dedicated service-account API, never ordinary staff forms.
- **Entity:** `StaffMember` · **Inspection drawer**
- **Drawer tabs:** Profile · **Permissions** (locked profile groups + editable custom `staffPermissionAssignments`)
- **Create:** optional permission bundle (rank 0) with scope selections for the current academic year. The form loads profiles and the permission catalog together without depending on a prior Permissions-tab visit. Disable the profile picker while loading; show an error and retry on failure. Staff creation without a profile remains available. A selected profile requires ready scope metadata before submission.

Human-staff phone is optional in create/edit, detail and configurable directory columns. Profile roles remain descriptive and never grant authority.

### 7.4.1 School — Teachers

**Collection:** Table only. Row order: portrait/name, code, contact, active state, authorized assignment count. Search name/code/contact; active-state facet.

**Inspection purpose:** teacher identity, assignments and separate academic domains. Header names the teacher/code, active status and authorized assignment summary. Tabs must have this order:

| Tab | Ordered required content |
| --- | --- |
| Profile | Canonical/original identity, code, phone/email and supplied address, active status; account association; selected-year disciplines and nullable hours with explicit period |
| Assignments | Homeroom group then Teaching group, each with explicit empty state; rows class, subject for teaching, validity and active state; timetable link |
| Availability | Date/time interval, applicable recurrence where stored, reason and availability status in school timezone |
| Timetable | Selected year/date and Today controls, chronological day groups of class, subject/activity/assessment, start/end and occurrence state (X-TEACHER-AGENDA) |
| Assessments | Period, assigned class/subject, assessment title/kind/date and authorized result state; link to assessment |
| Family feedback | Campaign identity, class/subject context, status, dates and authorized published summary; link to campaign |
| Documents | Year, document type/identity, issued time, status and output; explicit failure/unavailable state |

**Actions:** Collection Add teacher; Record Edit profile, overflow Delete. Assignments menu Add assignment and Row Edit/Delete; Availability menu Add unavailability and Row Edit/Delete; annual-profile section Edit/Remove; account section invite/link; Documents menu Generate and Row Download/Retry/Void. Forms remain bounded; profile is wide. Read/manage staff/teacher capabilities, active assignment validity and the independent `TIMETABLE_READ`, mark, campaign and document gates apply. Availability requires `ACCESS_CONTROL_MANAGE` or `SCHOOL_CONFIGURE`. No active-state toggle appears in read-only Profile. Teacher timetable rows replace inspection with occurrence details and retain teacher/date Back context.

**Domain rules**

- **Entity:** `Teacher` · **Inspection drawer** (**Teacher 360**)
- **Nav:** School → Teachers count chip from `getAppShellCounts.teacherCount` (school-wide total)
- **Drawer tabs** (hide a tab the caller cannot read):
  - **Profile** — identity including code, contact, active status; changes through Edit profile, account linking
  - **Assignments** (`teacherAssignments`; subject + homeroom kinds) — Homeroom assignments first, then Teaching assignments, both always visible with localized empty states. Rows lead with class or class · subject; omit repeated assignment-kind labels. Retain Add assignment first in the section menu, class timetable links, add/edit modal and delete confirmation.
  - **Availability** (`teacherUnavailabilities`) — `ACCESS_CONTROL_MANAGE` or `SCHOOL_CONFIGURE`
  - **Timetable** — teacher-scoped academic-year agenda (`getTeacherTimetable`), gated by `TIMETABLE_READ`; chronological day groups in the school time zone with fixed teacher identity, tabs and Today/date controls above an independently scrolling session list with bold date headings. Initially jump to today (clamped to year bounds), or the URL date; insert one empty day marker when the target has no sessions. A wholly empty year also shows its explicit empty-year message; missing year bounds show Unavailable. Date navigation retains control focus and announces its target; initial positioning is instant and subsequent scrolling honors reduced motion. Today is disabled outside the selected year. Rows retain links to class timetable occurrences.
  - **Assessments** — assessments on assigned class subjects for the current period; `GRADE_READ` or `GRADE_MANAGE`; rows link to `/classes/{classId}/evaluations/{id}`
  - **Family feedback** — campaigns for this teacher; `FAMILY_FEEDBACK_CAMPAIGN_READ`; rows link to `/school/family-feedback/{id}`
  - **Documents** — issuance history by year; generate/retry/void `teacher-timetable.v1`; `TIMETABLE_READ`
- **Modals:** Create teacher (optional portal invite) · Edit profile · Add/edit assignment · Add/edit/delete unavailability · Generate/void document

### 7.5 School — Calendar

**Composition:** X-CALENDAR only; no List/Table alternate and no inspection drawer for `CalendarEvent`. Header has title, title search and one event-type Filter, plus collection menu. Date navigation and timezone precede the grid. An event shows title, type, date/start/end or all-day state and supplied description; overflowed text has a full-text disclosure. Empty dates remain navigable.

**Actions:** Collection Add event; contextual event menu Edit, Duplicate, Delete. Each opens a bounded URL form/confirmation and returns to the same date/range/event focus. Read requires timetable-read authority; writes use `TIMETABLE_MANAGE` in the affected class/school scope. Invalid ranges/overlap rules remain server-owned. Keyboard users must reach events and Add event without drag gestures; no invisible navigation chevron.


### 7.6 School — Activities

**Collection:** both, Table default. Row order: name, category, coach, active/date range, enrolled/capacity; search name/coach; facets category and activity state.

**Inspection purpose and order:** three tabs: Activity information (description, category, coach, capacity, start/end dates, schedule summary and state); Participation (student identity/class, enrollment state and stored enrollment dates); Scheduling (linked classes, class-activity association and actual schedule/session context, recurrence/start/end in school timezone). Participation and timetable class links are distinct relationships; missing capacity is not zero.

**Actions:** Collection Add activity; Record Edit activity; supported Delete in overflow. Participation menu Enroll students, Row Update/Withdraw; Scheduling menu Link class/Schedule and Row Edit/Unlink for supported associations. Bounded activity/relationship/schedule forms; no new batch operation. `ACTIVITY_READ` and canonical activity-management/enrollment/timetable grants independently gate each command; active state/capacity and existing enrollment limits are enforced by the server. Linked students/occurrences replace the drawer with Back.


### 7.7 School — Announcements

**Collection:** List only. Row order: title, publication state, audience summary, publication/scheduled date; search title; facets status and audience type. Default newest publication/creation first.

**Inspection purpose and order:** sections without tabs: Full content (title, complete rich body, authorized attachments); Audience (target kind and labeled class/grade/actor targets, explicitly scoped recipient counts where available); Publication and delivery context (draft/published/scheduled state, dates, author and persisted channel/outcome information). Missing delivery evidence must say Unavailable, not Delivered.

**Actions:** Collection Add announcement; Record Edit and Publish; overflow Delete. Audience menu Add target and Row Remove. Drafting uses `COMMUNICATION_DRAFT_MANAGE`; publication and administrative mutations require their canonical communication actions and lifecycle checks. Publish is disabled until the audience contains at least one valid target and must confirm audience/consequence. Bounded forms retain existing scheduling/publishing commands; personal recipients do not inherit administrative authority. Full content, rather than Edit/Delete, justifies inspection.


### 7.8 School — Incidents

**Collection:** List only. Row order: incident title/date, primary student plus participant count/labels, category/severity, resolution state; search student/title; facets class, category, severity and resolution. Default newest incident first.

**Inspection purpose and order:** sections without tabs: Facts (date/time, location if supplied, category, severity, description, status); Participants (all students with class, role and involvement facts); Outcomes (each student's applied disciplinary action, dates and resolution notes); History (persisted creation/changes/validation/takeover/resolution with actor/time; unavailable facts explicit). Multiple participants must never collapse to a misleading single-student identity.

**Actions:** Collection Log incident; Record Edit and Resolve; overflow Take over, Cancel and Delete when supported; participant changes belong to the incident workflow, not inline rows. Resolve is disabled with reason once resolved. `DISCIPLINE_CREATE` creates, `DISCIPLINE_MANAGE` edits/cancels/deletes, `DISCIPLINE_VALIDATE` resolves/takes over, plus participant/sanction permissions required by the command. Resolve uses the wide atomic outcomes form; other changes use bounded forms/confirmations. Explicit Take over may use X-REVIEW-DECISION; opening content never takes ownership.

**Domain rules**

- **Entity:** `Incident` · **Inspection drawer**
- **List row:** show primary involved student + count or labels when multiple (`studentIncidentInvolvements`) — not first-involvement only
- **Resolve modal:** involved students + role + optional `DisciplinaryAction` per student + notes → `resolveIncidentWithOutcomes`

### 7.8.1 School — Family feedback

**Collection:** List only. Row order: campaign/assignment label, teacher/class/subject context, status, opening/closing dates; search assignment label; status facet; newest campaign first.

**Inspection purpose:** four independently authorized tabs. Setup: assignment identity, teacher/class/subject, schedule, moderator and prerequisites. Audience: preview scope, eligible/ineligible recipient counts with reasons and captured audience state. Moderation: authorized comment text, anonymity-safe context, moderation state and reasons. Results: response counts, aggregate measures, themes and publication/archive state; anonymity/suppression rules remain authoritative and no raw participant inference is permitted.

**Actions:** Collection New campaign. Record visible actions in priority order are Schedule then Open; state-blocked actions retain their explanation. Overflow contains Assign moderator, Close, Cancel, Publish and Archive. Results section owns Edit theme draft; moderation rows own their authorized moderation decisions. All dates/reasons/theme changes use bounded forms; lifecycle transitions use confirmation or X-REVIEW-DECISION without changing semantics. `FAMILY_FEEDBACK_CAMPAIGN_MANAGE` manages campaigns, `FAMILY_FEEDBACK_MODERATE` controls comments within moderator scope; `FAMILY_FEEDBACK_PUBLISH` remains separate. Missing moderator/date disables opening/scheduling; close only while open, themes only closed with retained answers, reassignment before publication, archive published/cancelled only. Results not released to a caller must not appear as empty feedback.

**Domain rules**

- **Entity:** family-feedback campaign (command/query only; not a generic Core entity) · **Inspection drawer**
- **Drawer tabs:** Setup · Audience · Moderation · Results
- **API:** campaign commands plus `preview-family-feedback-audience`, `list-family-feedback-comments` (moderator), `get-family-feedback-aggregate-review`
- **Copy:** “Family feedback” / “Retour des familles” — never mix with Assessments / Évaluations

### 7.9 Classes — Students (roster)

**Collection:** both, Table default; class and year fixed by workspace context, not duplicated as a class facet. Row fields and student content are exactly §7.2; facets enrollment status and pending portrait review. Search name/matricule. Collection Add student uses the existing class placement flow and retains enrollment permission checks.

**Inspection/actions/editing:** the complete Student contract in §7.2 applies with canonical return `/classes/{classId}/students`. Its eight tabs have identical content/order and independent grants. A transfer does not silently move the underlying class collection; after the student leaves the current class, close to the class roster with a saved-result explanation and restore the nearest row focus. Student school identity and history remain intact.

### 7.10 Classes — Timetable

**Composition:** X-CALENDAR week grid, no collection alternate. Header names class/year; date/week and school timezone precede the grid; type/status facets share Filter. Occurrences identify kind, subject/activity/title, time and lifecycle status.

**Inspection purpose/order:** Details (kind/title, class, subject/activity, date/start/end/timezone, teacher, schedule/recurrence link and status); Attendance (scope, roster/review state, student, recorded status, lateness/reason and submission/correction information); lesson-only Logbook (lesson/chapter, completed content, objectives, homework, family summary, progress and validation/correction state). Non-lesson occurrences must not have an empty Logbook tab. Daily-mode class Attendance shows relevant history plus the day-board destination; it must not offer session recording.

**Actions:** Collection New session; Record Edit and Take attendance (session mode); overflow supported Cancel/Delete. Logbook section owns Edit/Submit/Validate/Request correction as allowed by lifecycle; Attendance section owns submission/review actions. `TIMETABLE_MANAGE` controls schedule changes; attendance/logbook recording/validation remain separate. New session is a bounded stepped form; whole-roster attendance is a workspace, single record a form; logbook editing a bounded form. Scope/date and grid position survive return. No room/resource booking.

**Domain rules**

- **Entities:** `LessonSession` · `ActivitySession` · timed `Assessment`
- **Layout:** Week grid · URL-backed occurrence drawer
- **Collection action:** **New session**, a bounded stepped modal:
  1. Pick type: **Lesson** · **Activity** · **Assessment**
  2. Pick context: class subject (lesson) · activity (+ optional `ClassActivityEnrollment`) · assessment template
  3. Schedule fields: date/time, recurrence → `createSchedule` + `materializeSchedule` when recurring
  4. Validate → occurrence appears on grid
- **Alternate create:** Lessons / Activities screens may offer scheduling fields inside create/edit forms. Assessments require occurrence times or a lesson link; a separate Add to timetable action is outside this assessment flow.
- **Drawer tabs:** Details · Attendance (`AttendanceRecord`) · Logbook (lessons only)
- **Header:** Edit · Take attendance *(session-mode classes; daily mode uses `/attendance` day board)*

### 7.11 Classes — Lessons (teaching)

**Collection:** List only. Row order: subject identity, category/discipline, participation summary and progression; search subject; facets availability and optional/compulsory status. No standalone class-subject creation action.

**Inspection purpose/order:** Students (subject/class context, compulsory/optional status and available roster, student identities, Annual/period choices and participation status); Progression (ordered shared chapters, sequence/title, class-specific progress/state and actual workload summary read-only); Logbook (session/date, teacher, chapter/content summary, objectives/homework and validation state). Essential missing historical rosters must say Unavailable. Chapter catalog identity is distinct from class progress.

**Actions:** Record Edit offering where the existing offering command allows it; Students selection bar Manage participation and Row Enroll/Update/Withdraw using the shared choice form. Progression section/row commands open bounded forms with academic-program grants; Logbook section/rows own entry/review/export with logbook grants. Workload editing is only Configuration Subject Edit; no duplicate workload editor here. Optional bulk choices use the bounded replacement form with explicit mixed-value choice, `ENROLLMENT_MANAGE`, revision/replay protection and no invented atomic save. Related student/session navigation preserves subject/tab Back context.

**Domain rules**

- **Entity:** `ClassSubject` · **Inspection drawer**
- **Drawer tabs:** Students (roster and optional participation) · Progression · Logbook
- Create/edit: optional **Schedule on timetable**

#### Optional subject participation

The Enrollments tab has Class and Optional Subjects sections. Class placement history remains visible. Optional Subjects lists every available optional offering with Annual, selected period labels or Not enrolled and an Enroll/Update action. Scoped ENROLLMENT_MANAGE enables the shared URL-backed selection popup. Annual and period choices are mutually exclusive; empty selection means Withdraw. Current/upcoming periods are selectable, completed selected periods are read-only labels. There are no enrollment date, reason, correction, history or restore controls.

The same selection fields serve teaching drawer bulk management. Mixed student choices require an explicit replacement choice. Failed mutations preserve drafts and replay identity; stale revisions refresh before retry. Confirmation activates current choices immediately; future periods activate at their start. Unchanged choices preserve activation. The backend chooses hard or soft deletion without a separate staff action. Saved attendance and marks remain, and marks continue contributing until manually deleted or exempted through existing permissions and publication protections.

Compulsory enrollment is automatic. Availability and optional status remain independent. Transfers carry remaining compatible choices and disclose unsupported choices for acknowledgment. New years require fresh optional choices. Live rosters, assessment/attendance revisions, draft reports and timetables refresh after changes. Past rosters without saved evidence explicitly show unavailable; no enrollment edit history is inferred. Class scheduling and offering disablement protections remain unchanged.

### 7.12 Classes — Assessments (evaluations)

**Collection:** Table only. Row order: title, kind, subject, due date or scheduled date/time, submission state, authorized completion/average. Search title/subject; facets kind and submission state; dates descending. Unauthorized marks produce no numeric statistics.

**Inspection purpose/order:** Details tab shows definition (title, kind, class/subject, description/instructions, homework due date or timed occurrence/link), grading policy/scale and publication/submission constraints. Grading tab shows read-only homework submissions when homework, otherwise student result rows with original entry, captured value/mention, absent/exempt state, comment and submission/correction status; authorized summary follows. Setup-only readers have no Grading tab. Results inspection must not contain live input cells.

**Actions:** Collection New assessment; Record Edit assessment and Enter marks (only when mark-authorized); overflow Delete. Grading section owns Submit marks and Request correction; result Row Enter/Edit/Correct mark and existing absence/exemption/comment actions. Multi-student entry is a focused workspace; individual entry/correction is a bounded form. Submission/correction reviews use explicit confirmations, preserve immutable batch and policy revisions, and do not invent a new batch endpoint. Setup and marks permissions are independent as specified below. Pending/published locks disable affected writes with an explanation. Return restores the same assessment/tab and collection filters.

**Domain rules**

- Permission catalog grouping: **Assessments and marks** / **Évaluations et notes** contains `ASSESSMENT_READ`, `ASSESSMENT_MANAGE`, `GRADE_READ`, `GRADE_MANAGE`, and `GRADE_VALIDATE`. `GRADE_SCALE_CONFIGURE` belongs to Academic configuration. Retired exam identifiers have no compatibility aliases.
- Assessment read or management authority admits the assessment workspace independently of marks. Create, edit, delete and direct edit/delete modal submission check `ASSESSMENT_MANAGE` for the relevant class/subject and assessment; edits check both old and proposed subjects. Grading controls retain their mark permissions.
- The bounded assessment context supplies setup and optional authorized mark results. Mark-read scope is independent from assessment setup scope. List/detail statistics distinguish authorized zero progress from unavailable results; unavailable marks show no numeric progress or average. Setup-only users have no Grading tab. Editing reloads the definition through the bounded context without requiring a general assessment read grant.

- **Entities:** `Assessment` · `AssessmentResult`
- **Drawer tabs:** Details · Grading. Grading is exclusive by `kind` — homework → submissions;
  quiz/project/other → read-only results table; entry uses a separate form/task.
- **Collection action — New assessment modal:**
  1. Pick **kind** on create only. Kind is **read-only on edit** — no homework↔quiz conversion.
  2. Core fields: title, subject/class subject, dates, grading config
  3. Homework: required due date; payload clears `startsAt` / `endsAt` / `lessonSessionId`
  4. Quiz/project/other: required date + start/end in the school timezone, **or** a lesson session. Do not invent a UTC slot.
- **Timetable link:** non-homework with `startsAt`/`endsAt` or `lessonSessionId` can appear on the timetable grid when scheduled; occurrence times are still required on the assessment itself
- **No** `/homework` route or nav tab

#### Submission and corrections

Evaluation sheets use Draft → Submitted. Submission makes marks official and visible to families. Submitted grading settings and rosters are frozen. Selected scores, absence/exemption designations, and mark comments may be proposed in one immutable pending batch per evaluation, with a reason and confirmation summary. Staff review uses a read-only comparison, one explicit Approve action and a URL-addressed Reject reason form; extra confirmation is reserved for the consequence cases declared by Corrections. Only the author may withdraw; the author cannot review their own request across profiles. Published report source marks are permanently locked individually. Pending corrections block publication only for affected students. The school Corrections queue lists grade correction requests; legacy marks-review URLs redirect there with the Grades filter.

### 7.13 Classes — Report cards

**Collection:** Table only. Row order: student, period/model, captured overall result/mention, review/publication state, document status. Search student; facets model and result state; student ascending. Term is shared academic context, not a duplicate facet.

**Inspection purpose/order:** sections without tabs: Result (student/class/year/period/model, captured sections/subject results, units/precision/mentions, overall average/classification and comments); Review/publication (draft and published versions separately, review decisions, policy revision, pending corrections/blockers); Document (issued version, status, preview/download where available); History (persisted generation/review/publication events, actor/time). No invented calculated values from current mutable scales.

**Actions:** Collection Generate report cards, then existing matching export; Record Publish and Regenerate; result/comment section owns eligible comment edits/review and document section owns Download. Selection bar owns supported bulk publication/generation with explicit per-result outcomes. `REPORT_CARD_READ`, `REPORT_CARD_GENERATE`, `REPORT_CARD_PUBLISH` and `REPORT_CARD_REVIEW_COMMENTS` retain their distinct scopes. Generate/regenerate/comments use bounded forms; bulk confirmation is not a workspace. Publication must use the exact reviewed draft/policy version and expose blockers; it cannot implicitly approve grading revisions. A published version stays readable during a new draft's review.


### 7.14 Classes — Daily attendance

**Collection:** Table only with one row per school-local day: date, roster size, Present/Absent/Late/unmarked counts, review state. Date-range and review-status facets; search is absent because rows are date identities (X-DATE-COLLECTION). Default day descending.

**Inspection purpose/order:** sections without tabs: Day/class summary (date/timezone, class/year, roster/review state and known counts); Student attendance Table (student identity, explicit status, lateness/reason and correction state); Review/history (submission, reviewer, current/proposed corrections and persisted times). Unknown/unavailable roster is distinct from a known zero.

**Actions:** Collection New roll call; Record Record attendance and Submit attendance; student Row Change attendance; Review section owns allowed review/correction commands. New/class roll call and substantial recording use a focused workspace; single-student changes and review reasons use bounded forms. `ATTENDANCE_RECORD` gates class recording and direct task URLs; independent read/manage/validate scopes apply. Daily mode, today/past civil date, fully loaded nonempty roster and explicit marks are required; no automatic Present. Duplicate date links to its existing drawer. One `record-class-daily-attendance` command remains the save unit; the workspace must not imply another transaction.

**Domain rules**

- **Entities:** `Attendance` · `AttendanceRecord`
- **Nav:** only when `attendanceMode = daily`
- **Create:** `?task=create-roll-call` opens a date and active-roster workspace. Default to today in the school timezone; allow today/past civil dates only. Students start unmarked; Present/Absent/Late are explicit choices. Mark all present fills only unmarked students. Save requires a nonempty, fully loaded, completely marked roster and uses one `record-class-daily-attendance` command. Existing dates link to their drawer instead of being overwritten through creation. Keep drafts on failure; success opens the saved day with list filters preserved.
- **Commands:** `record-class-daily-attendance` · `record-daily-attendance`

### 7.15 Finance — Fees

**Collection:** Table only. Authorized school/year financial summary precedes the collection. Ordered rows: fee name, category, default amount/currency, enrollment mode, active state. Search name; category/status in one Filter; filters do not scope the financial summary.

**Inspection purpose/order:** sections without tabs: Configuration (name, category, description, year, default amount/currency, enrollment mode, status and original terms); Scoped financial summary (Billed, Payments, Outstanding, Overdue with assigned/overdue student counts); Assignment/usage context (assigned count and Billing links scoped to fee, outstanding or overdue). If detailed assignment rows are not available, use the authorized count and destination rather than inventing records. Catalog-only readers omit financial content without a false zero.

**Actions:** Collection Add fee; Record Edit fee and Assign fee; overflow Archive/Activate. Assignment requires active fee and scoped authority, bounded single/batch student selection of at most 100. Financial configuration management and payment assignment authority remain separate. Catalog edits affect future assignments only. Canonical return is Fees, preserving catalog filters even when financial navigation opens another record.

**Domain rules**

- **Entity:** `CatalogService` · **Inspection drawer**, human label **fees / frais**.
- Sidebar finance order is **Fees → Billing → Payments**; finance pages omit a duplicate local switcher. `/finance` redirects to `/finance/fees`.
- `/finance/fees` is the financial overview above the searchable catalog with category and status controls inside one Filter button. Add fee is the primary action. Catalog filters never constrain financial totals.
- Headline cards match fee details: **Billed**, **Payments**, **Outstanding**, **Overdue**. Billed shows the net amount after adjustments and waivers, with a top-right chip for distinct assigned students. Payments shows active allocations applied to charges. Overdue shows its amount in the dark-red destructive text token, with distinct overdue students in a top-right chip. Scope is the selected school/year and authorized `PAYMENT_READ` records; catalog filters never affect these totals. Omit Received/Refunded and scope captions. Cancelled charges contribute no obligation; overdue is bounded by remaining obligations. Errors and unavailable data never become zero.
- `/finance/fees/{feeId}` opens the URL-backed drawer with ordered sections and no single-tab strip. Header: name, category, status, academic year, default amount; **Edit fee** and **Assign fee**; overflow **Archive** / **Activate**. Assignment requires an active fee and authorization.
- Overview shows Billed, Payments, Outstanding and Overdue cards. The Billed card has a top-right chip for distinct assigned students (excluding cancelled charges); there is no separate Students assigned card. The Overdue card places its student count in a top-right chip. Show description, enrollment mode, default amount and read-only original terms. Links open Billing filtered by fee, optionally outstanding/overdue. Account receipts, refunds and credit are not fee-level settlement measures.
- Assign fee is a modal with the selected fee fixed, single/batch ≤100 students. Mutations preserve the current editor's unmodified fields. Catalog edits affect future assignments only; existing labels, amounts, schedules and archived history remain intact.
- Fees navigation allows catalog-read or payment-read users. Catalog-only users see configuration without financial amounts. Use the configured currency and integer minor units; no fallback currency.

### 7.16 Finance — Billing

**Collection:** Table only. Rows: student, assigned fee, due date, net obligation, applied, remaining, status. Search student/fee; class, fee, status and due facets in Filter. Default due date ascending with stable ties; supported whole-dataset sorting. No global financial summary.

**Inspection purpose/order:** Overview tab (student/account/year, assigned fee, original amount, adjustment/waiver, net payable, applied/remaining, original installments with actual attribution, cancellation facts); Payments tab (this charge's allocations, source receipt or Account credit, applied date/amount, reversal state and eligible receipt); History tab (persisted creation, reductions, cancellation, allocations/reversals, actor/time, newest first with deterministic ties). Charge-level reductions must not be fabricated as per-installment allocation.

**Actions:** Collection Assign fee; Record Record payment and Apply credit; overflow Adjust, Waive, Cancel and Download account invoice. Allocation Row Reverse allocation; eligible payment Row Download receipt. All monetary commands use bounded forms/confirmations with amounts, reason where required, and exact target context. The eligibility rules below are mandatory, including separate allocation/reversal permissions. Account invoice is explicitly account-wide. Source-less allocation says Account credit. Return from payment forms restores charge and tab; saved-refresh failure never repeats a financial command.

**Domain rules**

- **Entity:** `StudentCharge` · **Inspection drawer**, one assigned fee for one student. No grouped invoice entity.
- List has no financial summary cards. **Assign fee** is the primary action. Student/fee search, class/fee/status/due facets in one Filter panel and server-side sorting/batch loading apply before matching counts and export. Reminder exports deduplicate student/year accounts.
- `/finance/billing/{chargeId}` = **Overview**; `/payments` = **Payments**; `/history` = **History**. Header persists across tabs, with assigned fee, student, status and remaining balance.
- At most two visible header actions: **Record payment**, **Apply credit**. Overflow: adjustment, waiver, cancellation, **Download account invoice** (clearly account-wide).
- Action eligibility must guard controls, direct modal URLs and submissions. Hide missing permissions; disable state-blocked actions with explanations. Recording requires an open balance; applying credit requires `PAYMENT_ALLOCATE`, balance and credit; reverse allocation requires `PAYMENT_ALLOCATE` and active allocations, not payment-reversal permission. Adjustment/waiver require recording permission, balance, and no prior corresponding event. Cancellation requires recording plus cancellation permissions, no active allocations, and a reason. Waivers require reasons. Backend limits remain authoritative.
- Overview preserves original amount, reduction amounts, net payable, applied, remaining, original schedule with partial attribution, and cancellation facts/zero current obligation. Charge-level reductions must not be silently redistributed across installments.
- The Payments tab filters account history to this charge. Active totals exclude reversals; source-less allocations are **Account credit**. Receipt actions refer only to the linked eligible payment.
- History derives only persisted creation, adjustment, waiver, cancellation, allocation and reversal facts, newest first with deterministic ties; unavailable actors are **Not recorded**. No new audit-log system.

### 7.17 Finance — Payments

**Collection:** Table only, collection-only records. Ordered fields: student/account, recorded date, receipt/refund type, amount/currency, method, reference, allocation/credit summary and status. Search student/reference; method, receipt/refund type, status and date-range facets; newest first. Notes and persisted audit facts may use a labeled row disclosure; no navigation styling or detail route.

**Actions:** Collection Record payment first, Refund account credit in secondary group; Row Download receipt/settlement document and Reverse payment where eligible. Receipt reversal requires its canonical reversal permission, a recorded receipt and an explicit reason; refund uses its separate permission and available account credit. Collection/matching and selected export are separate supported actions. `PAYMENT_READ` controls reads; record, allocation, refund and reversal commands retain their independent canonical grants and student scope. Only recorded receipts may reverse; generated documents need eligible source records. Forms are bounded and preserve allocation semantics; closing returns to the same row/position. No collection summary cards and no drawer solely for Edit/Delete.

**Domain rules**

- **Entity:** `Payment` · **Collection-only**, `/finance/payment`, no drawer and no collection-summary cards.
- Primary **Record payment**; refunds in More; receipts and refunds remain distinct. Reverse only recorded receipts. Receipt/settlement documents require eligible source records.
- Shared route-owned payment form: select student then explicitly select fees and allocation amounts. Billing entry preselects its student/fee. **Deposit only** and **Oldest due first** remain explicit alternatives, never silent fallbacks. Preview receipt, existing credit, allocations and resulting credit with submission semantics. Preserve method/date/reference/notes, failed drafts and duplicate-submission protection. Students without charges can select deposit-only.

### 7.17.1 Configuration Tools — Finance checks

**Composition:** X-TOOLS report page; no inspection drawer or entity-view alternate. Order: school/year scope, report status/as-of time, reconciliation totals and differences, detailed discrepancy rows, export. Rows must identify student/account, compared measures, amounts/currency and discrepancy; unavailable measures must not be zero. Report actions Refresh and Export belong to its scoped menu; there are no repair/mutation actions. `FINANCIAL_REPORT_READ` is sufficient without import/timetable permissions. Loading/failure stays local to this report; canonical return is Tools.

**Domain rules**

- `/configuration/tools/finance-checks` contains the existing reconciliation report, loading state and export. `/finance/reconciliation` redirects compatibly.
- Preserve `FINANCIAL_REPORT_READ` and `getFinanceReconciliation`. Report-only users can reach Tools without import/timetable authority. Unrelated planning data must not block this page. Finance checks is absent from Finance navigation.

### 7.18 Configuration — School profile

**Composition:** X-SCHOOL-SETTINGS, four read-only sections in this order: Identity (school name and persisted short name); Issuing identity (issuing name, address, phone, email, school code); Location (city, country, timezone, currency); Official document assets (slot identity, present/missing status, authorized preview and public/private use). No collection, drawer or single-tab navigation.

**Actions:** each Section menu owns Edit and opens only its section's bounded form, gated by canonical school-configuration/lifecycle permission. Asset editor is an explicit per-slot immediate-save task inside a bounded modal, with Upload/Remove/public-branding choices next to their slot and Done in the footer; it states the per-slot save behavior. Changing currency is disabled after financial activity. Stamp/signature stay private. Cancellation of an unsaved text form must not undo already saved asset slots.

**Domain rules**

- **Entity:** `School` · four read-only sections, each with one permission-gated Edit action: Identity (name, persisted short name), Issuing identity (issuing name, address, phone, email, school code), Location (city, country, time zone, financial currency), Official document assets.
- Each section owns a URL modal (`identity`, `issuing`, `location`, `assets`). Saves include only that section’s fields. Short name is required and survives school renaming. School Type is absent.
- The assets modal saves uploads, removals and public-branding choices immediately, states this behavior, and closes with Done. Stamp/signature remain private. Currency changes remain blocked after financial activity.

### 7.19 Configuration — Academic calendar

**Composition:** X-ACADEMIC disclosures by year, newest first, no List/Table alternate or drawer. Each year header shows label, start/end, draft/published/archived state and scoped menu. Expanded content shows year facts then periods in chronological order: label, start/end, kind/order and publication state. No single-tab navigation. Empty periods explicitly name Add period in their menu.

**Actions:** Collection Add academic year; year menu Edit, Add period, Publish, Archive and supported Delete; period Row Edit/Publish/Delete. Every change uses a bounded form/confirmation and the canonical academic-catalog management permission. Publication/archive eligibility follows existing dates/state/protected-record rules; unavailable actions are disabled with reasons. Weekly slot editing is a separate destination. URL-selected year and expanded year survive form return; workspace-year selection remains explicit.

**Domain rules**

- **Entities:** `AcademicYear` · `AcademicPeriod`
- Accordion by year; term-period publication via bounded confirmation forms
- Weekly period slots live on `/configuration/period-grid`, not in this accordion

### 7.19.1 Configuration — Weekly period grid

**Composition:** X-PERIOD-GRID, weekly weekdays/time grid only, including empty years. School/year identity, caption, weekend visibility and menu precede grid. Every slot must show label, weekday, start/end, teaching/break kind and order. The selected year includes draft/published/archived years; no date-navigation/calendar-date persistence.

**Actions:** Collection Add slot then Quick setup; selected slot Edit/Delete are the explicitly permitted in-slot controls. Drag creation, move and resize follow shared calendar constraints and have keyboard form equivalents. `SCHOOL_CONFIGURE` gates mutations; positive same-day five-minute ranges and destination overlaps including breaks must validate before submit and on the server. Quick setup is a bounded stepped form (preset, template/weekdays, review), retaining its existing batch command. Save failure restores prior times and retains local error. School/year change clears selection and transient seeds; form return restores the slot focus.

**Domain rules**

- **Entity:** `PeriodDefinition` · layout page at `/configuration/period-grid`
- Year `<select>` lists every year (draft, published, archived) in `?year=`, defaulting to the workspace year when that year is in the list
- Slots are weekly (`dayOfWeek` + times); single-row form and optional **quick-setup wizard** (preset → tweak template/weekdays → batch create)
- Mutations require `SCHOOL_CONFIGURE`

- The resizable SVAR calendar is the sole weekly view, including empty years. Legacy `display` parameters have no effect. Dragging an empty range opens the existing slot creation modal with snapped times and weekday. Slot cards expose Edit and Delete on hover, focus or selection; deletion retains confirmation. Weekday/time data and existing mutation modals remain authoritative. Dragging changes start/end time and optionally weekday while preserving duration; resizing changes end time. Both use five-minute steps, same-day and destination-overlap checks.

### 7.20 Configuration — Grade levels

**Composition:** X-CONFIG-RAIL. The level rail is navigation; Details, Subjects and Classes are child routes for the selected level/year. Details order: level identity/label/order and supplied description, selected-year grading summary (scale, numeric/mention entry mode, aggregate label, revision/update state), Report card models using the standard List header, search, unified Filter and collection menu. No level drawer. Empty levels remain selectable.

**Actions:** level rail scoped menu Add level; Details section menu Edit level then Delete. Edit includes the same level fields and grading settings, with their independent structure/grading gates and one calculation-change confirmation. A numeric-mode change collects required equivalents for prior mention revisions. No impact dashboard. Model menu owns Add model. Forms are bounded; stale revision/year blocks submit. Updating/Completed/Failed and Retry are explicit; changing level/year guards dirty work then closes incompatible child inspection. Direct model links resolve their owning level/year.

**Domain rules**

- **Entity:** `GradeLevel` · **Layout selection** in the unified Levels and Classes screen.
- `/configuration/structure` defaults to Details. A flat level rail selects `?gradeLevel=`; Details, Subjects and Classes are nested route tabs. Mobile uses a labeled level selector above the tabs. Keep empty levels visible and sort with the shared level ordering.
- The Details tab owns level fields, grading summary, one Edit level form containing grading settings, and overflow Delete. Creation uses the same fields. Preserve separate structure/grading permissions and calculation-change confirmation. Level forms use `create-level`, `edit-level`, and `delete-level`; old `level-grading` links redirect to `edit-level`.
- Classes and subjects are scoped to the selected level and workspace academic year. Creation defaults to that level. Workload stays in Edit subject and applies to matching classes; edit weekly workload in periods, never inferred chapter hours. Keep the subject list free of weekly-period labels. Class rows open the drawer, whose Edit action owns class changes; omit redundant grade-level columns and row edit menus.
- Subject and class drawers remain read-only with their existing chapters / profile / staff-assignment surfaces. Old `/configuration/grade-levels`, `/configuration/classes` and `/configuration/subjects` URLs redirect, retaining valid entity, tab and modal context. Grade-scale catalog stays separate.
- The sidebar exposes one combined entry with the union of the former entries’ read permissions; each tab and mutation retains its own permission gates.

### 7.21 Configuration — Classes

**Collection:** Table only within selected level/year. Rows: class name, labels, capacity, attendance mode, administrative coordinator and authorized homeroom teacher. Search class name; attendance-mode facet. Do not repeat the fixed grade level as a column.

**Inspection purpose/order:** Class information tab (name/labels, level/year, capacity, attendance mode, `homeroomStaffId` coordinator and separately derived homeroom teachers); Assignments tab (class-level staff identity, permission-code set, scope/class and validity/active state). Missing authorized assignments are empty; forbidden teacher enrichment is Restricted. Teacher assignments are not substituted with staff assignments.

**Actions:** Collection Add class; Record Edit class; overflow Delete; Assignments menu Add staff assignment and Row Edit/Delete. Bounded class/assignment forms require their canonical structure/staff-assignment grants. Assignment permission selection is the class-level checklist, not ScopeBuilder. Attendance-mode switch warns about incompatible historical records and never deletes them. No redundant row Edit shortcut; related people replace the drawer with Back to class/tab.

**Domain rules**

- **Entity:** `ClassGroup` · **Inspection drawer** (URL-backed)
- **Profile fields:** `attendanceMode` · `homeroomStaffId` · capacity · labels
- **Tab:** **Assignments** (class-level only)
- `homeroomStaffId` stores the staff coordinator only. Homeroom teachers come from current `TeacherAssignment` rows with kind `homeroom`; these are distinct business facts.
- The profile query loads teacher assignments for the selected class and its academic year into route state. Forbidden teacher enrichment must show Restricted rather than an empty-teacher claim.
- Teacher labels require active teacher profiles and active assignments within their validity interval. Staff assignments never fill missing subject or homeroom teacher labels.

### 7.22 Configuration — Subjects catalog

**Collection:** List only, the reference List anatomy. Ordered row facts: meaningful category marker, subject name, category/discipline labels and secondary description; search name/description; category and discipline facets. Selected level/year scope is visible outside Filter; weekly workload is not a list-row label.

**Inspection purpose/order:** two sections, no tab strip: Subject information (name, description, category, explicit discipline association, selected level/year, weekly periods and session-span bounds); Chapters (ordered chapter title, description, sequence and stored content). Shared chapters are catalog facts; class progress/logbooks are not embedded as configuration tabs. A missing discipline is Not configured, never inferred from the name.

**Actions:** Collection Add subject; Record Edit subject; overflow Delete. Chapters section menu Add chapter, Row Edit/Delete or explicit supported order change through the subject/chapter form. All subject/chapter writes use atomic scoped `ACADEMIC_PROGRAM_MANAGE` commands; category management retains catalog permission. Wide subject/chapter form owns workload and chapter settings; no standalone class-subject creation. Same-name subjects remain ID-distinct. Canonical return is Subjects with level/year/search preserved.

**Domain rules**

- **Entity:** `Subject` · **Inspection drawer**
- Each Subject belongs to one grade and academic year. Same-name subjects remain distinct by ID. Subject chapters are shared with class offerings; class progress stays independent.
- Create and edit use atomic subject/chapter commands with scoped `ACADEMIC_PROGRAM_MANAGE`. Categories keep catalogue permissions. No standalone class subject creation.
- Chapter imports accept `subjectId` to resolve ambiguous names. Subjects and chapters may be created before classes.

### 7.23 Configuration — Report card models

**Collection:** standard List only under Level Details, scoped to the selected level/year. Rows must show name, description, default/publication state and section count. The header must contain title/matching count, search by name/description, one Filter with publication status and default-model status, and `···` with Add model first. Both facets default to All. Matching and counts must cover the complete authorized level/year collection; Reset filters preserves search and level/year. No export, bulk operations or alternate view is introduced. Rows open the existing model drawer; editing belongs to its record actions.

**Inspection purpose/order:** sections without tabs: Model summary (name, description, level/year, default/publication state); Structure (ordered section tree, label, group/subject role, subject mapping, parent/order and positive weight); Grading context (inherited scale, entry/aggregate policy, optional overall passing threshold and revision). Missing threshold says Not configured and means no classification. No captured result is recalculated by inspection.

**Actions:** Collection Add model first in `···`; Record Edit model, overflow supported Delete; Structure menu Add section and section Row Edit/Delete. Standard supported collection controls follow the primary action; no export, bulk or view-switch entries are permitted. `REPORT_CARD_CONFIGURE` gates these wide structure/model forms; revision and parent/empty-group constraints apply. Published models retain allowed metadata/structure edits but year/level/default/publication IDs are immutable. Return restores Level Details and model position; generation is a separate result workflow.

**Domain rules**

- **Entities:** `ReportCardDefinition` · sections tree · **Inspection drawer**.
- `REPORT_CARD_CONFIGURE` enables name/description, optional passing threshold and section editing, including published models. The threshold may be any value within the inherited scale bounds and precision, including inside an interval; blank disables classification. Overall averages at or above it pass. Year, grade level, default/publication state and existing IDs remain fixed. Grading settings are inherited from the level/year policy, with no independent scale selector.
- Section forms edit labels, group/subject role, subject mapping, parent, order and positive weight/coefficient. Descendant parents and deletion of nonempty groups are forbidden. Revision-checked saves reject stale editors.
- Changes affect future explicit generation/regeneration only. Existing results, review decisions and published documents retain their captured content.

#### Template collection and routing

Levels and Classes → Details contains Report card models below the level's grading settings, with multiple models supported. The standard List must apply name/description search and publication/default-model facets within the selected level/year; its scoped menu places Add model first. Clicking a model opens `/configuration/structure/details/report-cards/{id}` with Model summary, Structure and Grading context in that order. Row selection/focus and return behavior follow the shared List rules. Creation captures and displays level/year as read-only; scope changes confirm discard for dirty creation and then close the prior surface. Existing model mutations and REPORT_CARD_CONFIGURE gates remain in effect, including revision checks, inherited grading and preservation of captured results. The combined navigation entry includes REPORT_CARD_CONFIGURE; there is no separate models navigation entry.

The Details layout owns ReportCardsPageState and its PageQuery. Template drawers use `/configuration/structure/details/report-cards/{id}`; closing returns to Details with the level selection and filters retained. Changing level or year closes the prior drawer/modal. Legacy `/configuration/report-cards` URLs redirect, retaining modal/filter context; a template deep link resolves its own level and academic year before editing. Grading scales stay separate. Model editing must preserve captured result and report-generation semantics.

### 7.24 Configuration — Grade scales

**Composition:** X-ACADEMIC scale disclosures, with X-GRADE-LOOKUP sample control. Ordered header fields: name, limits, precision, interval count, default/incomplete state. Expanded content: scale description/metadata, interval Table ordered by minimum (code, label, minimum, derived upper bound, optional points), then labeled sample input and matched code/mention. No drawer or view alternate.

**Actions:** Collection Add scale; scale menu Edit scale, Add interval, Delete; interval Row Edit/Delete. Separate bounded forms for metadata/intervals. Applying a scale to a level belongs to Edit level, with its confirmation/background update; catalog saves do not recalculate marks. `GRADE_SCALE_CONFIGURE` gates scale writes. Default scale deletion and loss of the last interval on used/default scales are disabled with explanations. Sample lookup is a non-mutating calculation preview, never mark entry. Expansion and sample value may be local and survive modal return; school change clears them.

**Domain rules**

- **Entity:** `GradeScale` · accordion scales with nested interval rows, matching the academic-year layout. Each interval has permission-gated Edit and Delete actions in its overflow menu. Sample lookup displays its matching code/mention beside the input, wrapping only when space requires it.
- Route: `/configuration/grade-scales`, immediately above Levels and Classes in the configuration menu; legacy `/configuration/other/grade-scales` redirects with search/modal parameters preserved.
- Scale metadata and intervals have separate URL modals. Headers show limits, interval count, default/incomplete status. Expanded content has Add interval first in its scoped menu and a labeled sample lookup (X-GRADE-LOOKUP).
- New scales have no intervals and are marked Incomplete; both server validation and pickers prevent their use. The first interval covers the whole scale; its minimum is anchored. Adding thresholds splits effective coverage. Only unused, non-default scales can lose their last interval.
- Users with `GRADE_SCALE_CONFIGURE` can edit every school grade scale, including the default. Editing preserves its default status. Delete is disabled with an explanation for the default scale; direct modal submission is forbidden.

### 7.25 Configuration — Notification templates

**Collection:** List only grouped by notification type. Row facts: template label, enabled channel summary and configured/default state. Search label; channel and configuration-state facets.

**Inspection purpose/order:** sections without tabs: Channel settings (each channel's enabled/disabled flags and triggering context); Message previews (in-app/push title/body, rendered email subject/body, SMS text in that order, explicit disabled/missing states); Available variables (token name, human meaning and preview example when supplied). Preview must not send a notification or invent unresolved substitutions. HTML preview must retain safe rendering and an accessible text reading path.

**Actions:** Collection Reset all; Record Edit; overflow Reset this template. Reset uses a consequence confirmation; copy changes use the bounded type-aware editor, TipTap for rich message body, plaintext for in-app/push/SMS. `SCHOOL_LIFECYCLE_MANAGE` applies; no delivery action is introduced. Template/key deep links reconstruct inspection and modal target; return preserves group/search/filters.

**Domain rules**

- **Entity:** school notification templates · **Section drawer**
- **Modal:** edit copy by type (TipTap for `rich_message.body`; plaintext for in-app/push/SMS)

### 7.26 Configuration — Disciplinary catalog

**Collection:** Table only, collection-only. Rows: disciplinary action name, description, kind (sanction/reward), severity and default duration in days when supplied. Search name/description; no facets. No drawer or navigation chevron; complete long descriptions use row disclosure.

**Actions:** Collection Add disciplinary action; Row Edit/Delete. Bounded catalog forms/confirmation with canonical disciplinary-catalog management authority and server reference protection. Applying a sanction belongs to incident resolution, never this catalog. Canonical return is Other configurations → Discipline, restoring the row focus.

**Domain rules**

- **Entity:** `DisciplinaryAction` · **Collection-only** list + row `···` menu
- Route: `/configuration/other/discipline`

### 7.26.1 Configuration — Permission profiles

**Collection:** Table only. Rows: profile name, description, permission count, bound-staff count; search name/description; no facets. Rows open inspection with no row menu.

**Inspection purpose/order:** sections without tabs: Summary (name, description and authorized counts); Grouped permissions (initially expanded included permissions with localized labels and supported scope types, fallback label for unknown codes); Assignment context (bound-staff count, authorized staff identities/bindings where supplied, and destination to Staff Permissions). Supported scope badges do not claim actual staff scope. Empty permission sets are explicit.

**Actions:** Collection Add profile and matching export; Record Edit; overflow Delete. `ACCESS_CONTROL_READ` reads, `ACCESS_CONTROL_MANAGE` edits/deletes. Wide editor includes name/description and grouped non-platform permission checklist, no profile scope selector; matching impact review is required. Deletion retains the established unique-grants-as-custom behavior. Staff links replace inspection with Back; modal close keeps the profile unless it was deleted.

**Domain rules**

- **Entity:** `StaffPermissionProfile` · **Inspection** list + read-only drawer at `/configuration/permission-profiles/{id}`; rows open the drawer and have no action menu.
- **Editor:** name, description, grouped checklist of all non-platform permissions. No profile scope field. Edits review each affected staff member’s generated access changes and unresolved warnings before saving. Saved custom selections remain available for repair.
- **Commands:** `configurePermissionProfile`; catalog delete via entity delete (unique grants freeze as custom)

### 7.26.2 Configuration — Subject categories

**Collection:** Table only, collection-only. Rows: category name and supplied description; search name; no facets. No detail route or navigation styling.

**Actions:** Collection Add category; Row Rename/Edit and Delete through bounded forms. Canonical academic-catalog management gates changes. Delete is disabled when known usage exists and must also be rejected by the server; the reason identifies that a subject uses the category without disclosing unauthorized subjects. Existing localized default names and stored `categoryId` semantics remain intact. Return retains the catalog query and row focus.

**Domain rules**

- **Entity:** `SubjectCategory` · **Collection-only** list + row `···` menu
- Route: `/configuration/other/subject-categories`
- Schools can add, rename, and delete categories. Delete is rejected while a subject still uses the category
- New schools start with Scientifique, Littéraire, Langues, Sciences humaines, Sport, and Arts
- Subject forms store `categoryId`. The six default names still use `catalogCategory()` for EN/FR labels

### 7.27 Inbox — My inbox

**Collection:** List only. Rows: message title/sender, preview, delivered time and read state; search title/content only through the authorized matching query; read-state and delivery-type facets; newest delivered first. No merged inbox across profiles.

**Inspection purpose/order:** sections without tabs: Full message (subject/title, sender and complete text/authorized attachments); Delivery context (recipient profile, channel/type, delivered time, persisted read state and related destination). No fabricated delivery/read history. Personal recipient scoping applies even to school owners.

**Actions:** Record Mark read/Mark unread when the personal-delivery command supports it; related destination is navigation. X-REVIEW-DECISION permits the explicit read-state command; opening content must not invent additional mutation behavior. No create/edit/delete or school reply action in this inbox. Profile switch invalidates both personal content and read state. Direct return is My inbox at `/account/inbox` for the selected recipient; relocating its navigation must not broaden recipient visibility.

**Domain rules**

- **Entity:** `MessageDelivery` · **Section drawer**

The personal inbox queries deliveries by login subject and selected recipient kind/id together, including for school owners. Selecting another profile never merges personal delivery or read state. The announcements entry is available to every signed-in profile; the backend restricts rows to current audiences and any explicitly granted administrative scope. Administrative mutations still require their canonical actions. Do not invent school-wide grants to make personal communications navigation visible.

### 7.28 Configuration — Tools

**Composition:** X-TOOLS landing shows Data import, Timetable generation, Finance checks and Activity log in that order, filtered by each capability’s independent authority. Activity-log readers must be able to reach Tools without import, timetable or finance-check grants. Entries show scope and purpose; task Launch actions belong to their scoped menus, while Finance checks and Activity log navigate to their read-only pages. There is no unrelated top-level create action or entity drawer on the landing page. Activity log itself uses standard Table/detail rules.

**Import workspace:** ordered regions Settings (school/year, import kind, S/M/O mode), Files (name/type/revision/source references), Preview (source/current/imported/resulting values, authorized target, issue code, effective mode and ready/blocked state), Execution (validated revision/digest, progress and per-row outcomes), History/downloads (persisted batch events, correction artifacts). Task actions Upload/Validate/Confirm import/Download corrections are eligible only for their current server batch state and domain import permissions. Reopening resolves `taskTarget`; closing stops polling, not the server job. Externally corrected files become a new revision. No browser-authoritative parser/executor.

**Generation workspace:** ordered regions range/term presets, selected classes and subject settings, review of selected scope, execution/result. The single grade-grouped class list owns inclusion and active class settings; no duplicate selector. Show weekly periods, session spans and selected-class overrides, selected count and date scope. Task Generate is disabled for empty/invalid scope and pending execution. `TIMETABLE_MANAGE` scopes the atomic selected-class request. Failure leaves selected timetables unchanged; success is immediately current, with localized conflicts and no publication step. Return restores Tools; running server work is not cancelled by leaving. Steps/panels are URL-addressable and draft context is guarded.

**Domain rules**

- **Tools:** Data import · Timetable generation · Finance checks · Activity log
- Generation requires scoped `TIMETABLE_MANAGE` and updates the selected classes atomically. Generated sessions are immediately current for staff, teachers and families and printable; no publication lifecycle remains. Regeneration replaces only untouched pending generated sessions and preserves recorded work, linked records, manual exceptions and cancellations. Printing does not lock sessions.
- Weekly generation retains available recurring placements and repairs missing workload in available teaching slots while respecting teacher occupancy and subject spacing. Failures show localized class/subject names, the affected week, and placed/required counts; do not display raw solver messages or technical IDs.
- The timetable task entry exposes Generate first in its scoped menu, without a term picker. The generation assistant retains its term presets, date-range controls and existing range defaults.
- Timetable generation selects current-year classes with searchable grade-grouped checkboxes, all selected initially, plus select-all/clear controls. Search does not alter selection. Subject settings and submitted overrides cover selected classes only. Generate the selected classes in one atomic school request; a failure leaves their current timetables intact. Preserve selection and settings when running again; reset them on reopening or changing school/year.
- The existing class list in the subject-settings panel is the sole inclusion and navigation surface; do not add a selector above the tabs. It shows every current-year class, grade headings and full-list selected/total counts, including excluded classes and single-class schools. Checkbox actions change inclusion only; included class names open their settings. Search never changes the displayed class. Excluding that class advances to the next included class in academic list order, wrapping when necessary; an empty selection clears the editor and disables generation. Preserve excluded drafts for re-inclusion, but omit them from the request. The generation button states the included class count on every setup tab.
- Workflow tools open URL-backed focused workspaces whose steps and substantive internal panels are addressable.
- The teacher assignments hub remains available at `/configuration/tools/teacher-assignments` without a card on the Tools page.

#### Durable imports

Configuration → Tools → Import owns a durable, school/year-scoped batch. `taskTarget` retains the batch identity across reloads. The route state calls generated `imports` APIs; components only present settings, file selection, read-only preview, history, correction downloads and progress. No browser parser, matcher, validator or execution loop is authoritative.

The single session setting is `S | M | O`, initially `M`. File metadata has no conflict option. The optional `on_existing` column overrides individual rows; the preview displays the effective code. Saving settings invalidates the preview. Confirmation uses the exact validated revision and digest. Failed mutations retain drafts.

Templates and correction reports come from the server's versioned contracts. Correct files externally, retain row IDs and re-upload as a new file revision. Table preview shows source references, current/imported/resulting values, authorized targets and issue codes. Blocked rows remain visible while independent ready rows run. Closing the workspace stops polling only; scheduled work continues. UI refreshes use scoped domain version families. History and download access remain subject to current business permissions.

Phone import previews normalize a leading `#` to `+` only for phone fields, retaining original source cells. Guardian imports accept a last name with an empty first name. Blank first names preserve existing values in M and clear in O; missing columns preserve.

### 7.29 Configuration — Teacher assignments hub

**Composition:** X-TOOLS assignment maintenance page with a Table of teacher, homeroom/teaching kind, class, subject for teaching, validity and active state. Search teacher/class/subject; class and teacher facets in one Filter. No assignment drawer: the row already supplies inspection facts; teacher/class links navigate to their canonical inspection with return metadata.

**Actions:** Collection Add assignment; Row Edit/Delete. Bounded form selects teacher, assignment kind, class, subject when teaching and validity, using the same command and eligibility as Teacher Assignments. Canonical staff-assignment management permissions and active/compatible targets apply. Search/filter/sort and focus survive the form; Tools is the canonical parent. No automatic permission grant from an assignment.

**Domain rules**

- **Entity:** `TeacherAssignment` · standard list at `/configuration/tools/teacher-assignments`
- **Purpose:** School-wide assignment search and maintenance across teachers; complements the
  teacher-scoped Assignments drawer tab.

### 7.30 Account — Security

**Composition:** Security is the third section of the shared X-ACCOUNT dialog, selected by `modal=account-profile&modalTab=security`; `/account/security` remains a direct entry, including without school context. It has no collection/drawer. Ordered content: verified contact identifiers (kind, masked/display contact, verification state and primary association where stored), Link contact workflow, Authenticator state/enrollment, Recovery-code step when issued. Secrets and recovery codes must be transient, explicitly revealed and never listed as persisted profile metadata.

**Actions:** contact Row Unlink uses a confirmation; section Link contact starts existing verification; authenticator section Enroll/Disable/Recover follows server challenge eligibility. Form/task footer owns Verify/Continue and Cancel; resend/change contact remains inside its verification step with cooldown. Authorization is the authenticated Account identity, not school ownership. Invitation preview is not verification. No school selection is required. In-workspace Close restores the invoking route/control; a direct `/account/security` entry retains that page and its safe account return. Section navigation must not bypass verification or replay completed commands. Denial/challenge expiry preserves an explicit restart path without replaying secret submissions.

**Domain rules**

Account authentication is independent of school actors. `/account/security` supports verified email/phone linking and optional authenticator enrollment, including before school creation. Telegram and WhatsApp are phone OTP delivery channels, not social identity providers. Invitation preview/opening is not contact verification; acceptance retains the existing invitation lifecycle and checks verified Account contacts.

### 7.31 Inbox — Corrections

**Collection:** Table only. Rows: workflow, target/student/class, requester, submitted time, status and consequence summary. Search target/requester only through the authorized complete queue query; workflow, status, class, teacher/subject, student and date-range facets; oldest pending request first with stable request-ID ties. Term context appears only for Grades and Report comments workflows. No create action.

**Inspection purpose/order:** query-addressed drawer with sections: Request context (workflow, target, author, state/time); Current versus proposed values (typed per-field comparison including original/derived grading values or attendance/logbook/comment/outcome facts); Reason; Consequences (affected records, publication/locking impact); History (persisted submission/decision/withdrawal). Use human subject/chapter/student names, not raw IDs. Opening must not approve, validate or take over.

**Actions:** Record Approve/Validate then Reject for the workflow; overflow Withdraw for the author, Take over for staff-managed incidents and Resolve for an incident with valid outcomes. Approve/Validate is one explicit action using the displayed revision. Reject opens one reason form. Extra approval confirmation is required only when superseding a reviewed attendance justification or replacing a published report document; it must explain that consequence. The review chrome includes Next pending, disabled with an explanation when no next authorized pending request remains; it preserves the queue query. X-REVIEW-DECISION permits only the named lifecycle command. Workflow-specific grants below scope each result; author self-review is forbidden across profiles, and published mark locks remain absolute. Conflicts keep the comparison visible and require fresh review before retry. Close preserves queue filters; direct return is Corrections.

**Domain rules**

`/school/corrections` must be the third Inbox navigation item on desktop and mobile, after My inbox and School messages; it must not also appear under School. Any of GRADE_VALIDATE, ATTENDANCE_VALIDATE, CLASS_LOGBOOK_VALIDATE, DISCIPLINE_VALIDATE, REPORT_CARD_REVIEW_COMMENTS, or REPORT_CARD_PUBLISH can expose it; the server scopes each workflow separately. `/school/marks-review` redirects to the queue with the Grades filter. The queue handles marks, submitted attendance, published report comments, validated logbooks, and staff-managed incidents. Other teacher workflows keep their existing lifecycle. Logbook validation and incident takeover are explicit staff actions; opening a detail never performs either action.

### 7.32 Inbox — School messages

**Collection:** Table only under X-CONVERSATION-COLLECTION; no free-text search without a complete authorized search capability. Row order: school/teacher type, subject/participants, captured student/family context, latest message time, state; Filter contains type, status and conversation order. Default latest activity first, server-combined paging.

**Inspection purpose/order:** sections without tabs: Conversation context (subject, participants/roles and captured student/family context); complete immutable chronological history (actual author, text and timestamp); applicable conversation state. No invented delivery/read indicators. School and teacher histories share presentation while permissions remain distinct.

**Actions:** school Record Reply opens a bounded form; teacher oversight has no mutation action. Resolve belongs to record overflow, uses the displayed conversation version and is disabled once resolved; no Reopen action is introduced. `SCHOOL_MESSAGES_READ`, `SCHOOL_MESSAGES_REPLY`, `TEACHER_MESSAGES_REVIEW` are independent. Reply captures conversation identity, detects changed threads and preserves failed drafts; refresh must not duplicate a sent message. Contextual related links keep Back to the thread; canonical return is School messages at `/school/messages` with type/status/order intact.

**Domain rules**

`/school/messages` is the School messages entry under Inbox, with optional detail `/school/messages/{id}`. It must not also appear under School. School enquiries and teacher conversations share one combined inbox by default, ordered and paged together by the server. Each row carries a School/Teacher tag; an optional `type=school|teacher` filter narrows the same list. Legacy `view` links map to that filter. Status and order filters are URL-backed. Conversation details show immutable text history, captured family context and actual authors. School replies use `?modal=reply`; teacher oversight is read-only. Dedicated SCHOOL_MESSAGES_READ, SCHOOL_MESSAGES_REPLY and TEACHER_MESSAGES_REVIEW permissions govern these surfaces independently of announcements.


### 7.33 Configuration — Academic disciplines

**Collection:** Table only, collection-only under Other configurations. Rows: immutable code, name/label, active state and authorized usage context; search code/name; active-state facet. No drawer or navigation styling. Missing usage is Unavailable, not a zero reference count.

**Content and actions:** Collection Add discipline; Row Edit and Delete. Bounded forms expose code only on create, label/name and active state on edit. `ACADEMIC_CATALOG_READ`/`ACADEMIC_CATALOG_MANAGE` govern catalog reads/writes. Existing inactive references remain readable; new selections require active entries; referenced entries cannot delete. Code is school-unique case-insensitively. This catalog does not create subject categories, sanctions, teaching assignments or permissions. Return preserves Other configurations context and row focus; standard §3 states apply.

### 7.34 Configuration — Placement statuses

**Collection:** Table only, collection-only under Other configurations. Rows: immutable code, label, active state and authorized usage context; search code/label; active-state facet. No drawer.

**Content and actions:** Collection Add placement status; Row Edit/Delete in bounded forms, same catalog read/manage gates and case-insensitive school code uniqueness. Label and active state edit independently of immutable code. Inactive references remain readable; new assignments require active options; referenced entries cannot delete. Student annual placement edits belong to Student Profile, not this catalog. Standard §3 states and continuity apply with canonical return to Placement statuses.

### 7.35 Account — Profile, Notifications and Security

**Composition:** one X-ACCOUNT dialog with Profile, Notifications and Security section navigation. At widths from 1024px the container must be at most 64rem wide, with content left and a 14rem navigation rail right; below 1024px it must be full-screen with navigation above content. Inner forms retain shared width limits. Opening the account trigger defaults to Profile; URL-selected sections are `modal=account-profile&modalTab=profile|notifications|security`.

**Ordered content:** Profile shows photo, canonical identity, descriptive role, supplied contacts and actor association. Administrative fields must stay read-only unless an existing authorized editor owns them; owner-controlled photos/signatures/notification contacts remain owner-controlled. Notifications shows channel groups then notification-type settings with saved values and verified-contact prerequisites. Security contains the verified identifiers, linking, authenticator and recovery content defined in §7.30. My inbox is in the Inbox navigation group, not an account-settings section or duplicated shortcut.

**Actions and eligibility:** each editable section or verification step must own its Save/Cancel or existing action-specific controls. No global Save is permitted. Photo actions retain their existing permission and save semantics. Sign out is separate from section controls and retains account-session behavior; Close remains persistently reachable. Personal setting changes use only their supported account commands; no new editable identity fields, channels or verification shortcuts are introduced. A missing notification capability must show Unavailable, not fabricated settings or a false empty success.

**State and continuity:** Profile, Notifications and Security load independently under the current account/actor identity; one section's failure must not prevent navigation to another authorized section. Section switches, Close, Escape, Back and Sign out guard unsaved edits. Authentication challenges remain transient, with unchanged verification/cooldown rules. Confirmed saves stay saved if refresh fails. Keyboard order must follow the displayed layout, selection must identify the current section, and section activation must focus its heading. Content must scroll without clipping controls at narrow heights or 200% text. Closing from the workspace restores the invoking route/control. `/account/notifications` and `/account/security` remain supported direct entries to the same section content; Security must remain accessible without school context.

### 7.36 Identity — Login, invitations and onboarding

**Composition:** X-ACCOUNT. Login uses contact, send challenge, OTP, optional authenticator/recovery and completion in that order according to server state. Sign-up remains flag-controlled. Only one active form is visible; masked recipient, cooldown/resend and change-contact are explicit. `/login/demo` is development-only fixture selection, then the same explicit authentication flow; no automatic sign-in.

Invitation `/invite/{token}` shows invitation identity, intended actor/school, lifecycle and required verification before explicit Accept. Preview/opening is not verified contact. Invalid, expired, already used and wrong-account states have distinct recovery copy without leaking token data. Authenticated completion uses a validated internal return destination; external return URLs are forbidden.

Onboarding orders school identity/context, selected academic setup/template, explicit discipline mappings for every template subject, review and provisioning result. Fields retain existing required validation and atomic provisioning semantics; mappings start blank, with deliberate code/name reuse allowed. Task footer owns Next/Back/Provision; no new provisioning operation. Sensitive authentication values never enter query state or durable drafts. Dirty non-secret onboarding drafts guard exit; running provisioning is not cancelled by navigation. Standard per-step loading/errors and safe retry apply; completed onboarding returns to the authorized workspace.

### 7.37 Entry routes and development specimens

`/`, module root routes and compatibility aliases must resolve to their authorized canonical destination using available school/class/year context; missing context must show its selection/empty state rather than a fabricated list. Their contract is navigation only, with no extra drawer or actions. Older marks-review links resolve to Corrections with Grades selected; old staff Assignments resolve to Permissions; structure/report aliases retain valid entity/tab/form context.

`/__design` is an X-DESIGN-SPECIMEN development-only component/state specimen. It may place component variants side by side for visual inspection, but must not enter production navigation, authenticate a user automatically or perform production mutations. Its only actions select specimen/locale/viewport state; all individual components still satisfy their shared accessibility and visual contracts.

### 7.38 Configuration Tools — Activity log

**Capability and scope:** Activity log / Journal d’activité is a read-only business-history feature at `/configuration/tools/activity-log`. It requires a dedicated school-scoped audit-read authority and a public audit projection. That authority must be independent of staff role names, import/timetable/finance-check grants and permission to read the full affected business record. Internal command receipts, replay results and raw request/response payloads must not be exposed as the public history. Technical traces and application-error diagnostics are outside this feature.

**Collection:** Table only, with ordered columns Time, Actor, Action, Affected record and Outcome. Events must be ordered newest first with stable event-ID ties. Search must match authorized actor/action/record labels across the matching dataset, not just loaded rows. One Filter contains date range, actor, domain/action, outcome and optional academic year. Default range is the last 30 days ending at entry time; the default year filter is All years, independent of the sidebar's academic year. The selected school is mandatory scope. A chosen year includes only events explicitly associated with that year; unassociated events remain available through All years. Date/time displays must identify the viewer timezone, and filter boundaries must resolve to unambiguous instants. Reset restores the default range and unrestricted facets while preserving search and school. The menu may expose supported shared sorting/column controls, never create, export, bulk, edit, delete or replay actions.

**Inspection purpose/order:** row activation opens `/configuration/tools/activity-log/{eventId}` in the standard read-only section drawer. Event summary shows the persisted time, human action/outcome, actor and affected-record identity. Context shows recorded school, associated year, source and business reason. Changed fields show typed before/after values only when recorded and authorized. Related records follow as permission-checked links. Missing historical fields must say Not recorded; inaccessible values must say Restricted; load failures must not masquerade as either. The event's business facts must be expanded; ancillary technical identifiers may use a labeled disclosure. No historical difference, actor name or result may be inferred from current record state.

**Actions and authorization:** record mutation actions are absent. Related-record navigation requires the target's own read authority; audit access alone must not reveal sensitive health, financial, family-feedback or authentication content. Deleted targets retain their recorded historical identity without a broken active link; inaccessible targets must not expose unauthorized detail. Related navigation replaces the drawer and provides Back to the event; Close returns to the log with filters, sorting, loaded position and focus preserved. Direct event links resolve under the selected school and close to the canonical Activity log page.

**States and public information contract:** initial loading, refreshing, loading more, no recorded events, no matches, denied access, unavailable audit service, failed reads and deleted/inaccessible detail must remain distinct. Absence of returned events must not claim that no actions occurred outside the recorded history. The public projection must provide stable event identity, occurrence time, safe actor/action/target labels, outcome and authorized optional context/reason/recorded changes/related references, with school scope and access filtering applied before matching, counts and detail lookup. It must support bounded loading and direct event resolution; no specific backend endpoint or raw storage schema is established here. Audit browsing is an explicit read-capability requirement, not an authorization to add business mutations or expose the command journal.

## 8. Surface completeness

§6 is the route-family inventory and §7 assigns every family's content and actions. Child inspection tabs inherit the owning feature contract; compatibility redirects must preserve valid scope and target without creating another UI. Sub-entities such as student involvement, permission sources, teacher assignments and class activity links use their scoped related collection or form; they must not gain an undeclared navigation entry.

Payments, disciplinary actions, subject categories, academic disciplines and placement statuses must remain collection-only. Their information is readable in the collection and their edits use row menus. Every other drawer is justified by the additional content specified in its contract. All unmentioned collection alternates are forbidden. Specialized layouts may deviate only within their assigned X- exception.

## 9. API conventions (key commands)

| UI flow | Command / entity |
|---------|------------------|
| Log incident | `recordIncident` + `addStudentInvolvement` |
| Resolve incident | **`resolveIncidentWithOutcomes`** |
| Daily attendance bulk | `record-class-daily-attendance` |
| Staff permissions | `configurePermissionProfile` · `applyStaffPermissionProfile` · `reorderStaffPermissionProfiles` · `removeStaffPermissionProfile` · custom `assignStaffPermission` + permission catalog APIs |
| Timetable materialize | `createSchedule` · `materializeSchedule` |
| Class activity link | `classActivityEnrollments` entity CRUD |
| Activity-log browsing | Dedicated authorized public audit read projection; never raw command receipts or replay operations |

Incident content editing, cancellation and deletion use `DISCIPLINE_MANAGE`; resolution uses `DISCIPLINE_VALIDATE`. The resolve command also checks the permissions needed to add or change participants and apply sanctions. Each action must evaluate its own required permission; access explanations must use human capability labels.

## 10. Contract acceptance

Every route family must satisfy its declared collection/composition, ordered required content, action ownership, editing surface, permission/state and continuity rules. Essential missing data, restricted data and failures must remain distinguishable. Keyboard, narrow-screen and 200% text behavior must satisfy the shared specs. Corrections to code, migration tasks and implementation findings do not belong in this normative catalog.
