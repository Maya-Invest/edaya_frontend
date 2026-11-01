# Route, state and navigation contract

Normative for `apps/webapp`. Route/layout state must own entity data, reads and mutations; the URL must reconstruct substantive views. This contract governs desired behavior, including target presentation choices in the other five specs. It must not create new server commands, alter save granularity or turn UI closure into server cancellation.

## 1. Ownership and lifecycle

| Owner | Data / responsibility | Lifetime |
| --- | --- | --- |
| Shell | Auth, school/year/term/class selectors and permitted navigation counts | Authenticated session |
| Version ledger | Entity-family counters only, no entity payloads | Session |
| Route/layout state | Matching rows, detail/tab data, filters, selection, batches, commands and drafts spanning components | Route subtree and captured scope |
| Smart workflow state | Explicit shared picker/authentication/permission workflow I/O and orchestration | Workflow instance |
| Presentation | Local field drafts, hover, focus, disclosure and other transient visual state | Mounted component |

Terms acceptance and dialog-open state belong to the authentication workflow instance, never URL parameters or browser persistence. The identity service owns immutable versions and durable account/version receipts. Existing session restoration and token renewal preserve access without a new acceptance prompt.

There must be no session-wide entity hydration or global `detailDataContext`. URL-derived query keys and the version ledger are metadata, not another entity store. I/O, multi-component orchestration and testable business logic must not live in presentation scripts/effects. Entity optimistic patches and rollback belong to the owning state.

The shell must bootstrap schools, years, periods, grade levels, class groups, authorized navigation counts and authentication only. Students, staff, guardians, subjects, permissions, planning, assessments, finance, school life, report results and logbooks load on demand. A full shell refresh is limited to changed shell-shaped school/year/period/class data, never a name, contact, financial or lesson-record edit.

Under X-SCHOOL-YEAR-SWITCHER, dialog visibility and its uncommitted choice are transient shell presentation state, not URL-backed business forms. Opening, previewing or dismissing it cannot change workspace context or persistence. Confirmation invokes the shared dirty-work guard and then the existing year setter, only if the captured account, selected school, academic scope and target remain valid. Refusing discard preserves both workspace drafts and the switcher choice. An account/school change closes the dialog and cancels only its own pending continuation; it must not cancel another workflow’s guard.

School/year/term change must invalidate affected PageQuery metadata and active route state, reject stale responses and retain the current structural route if still authorized. Empty years clear the term without borrowing another year's context. Identity changes clear prior content and drafts immediately; user-initiated scope changes first guard dirty work. No old-scope values may be displayed while a new scope loads.

The shell owns per-instance `MessageCountState` in Svelte context. The School messages child badge under Inbox counts all authorized school/teacher conversations in awaiting-school and awaiting-guardian states using server totals, independent of filters/loaded rows. It refreshes on inbox versions, every 15 seconds while visible and on visibility resume; no permission means no fetch, unavailable means no number. The page count describes its matching collection, never repeats this sidebar queue badge. My inbox must retain its account-and-recipient-specific unread scope, and Corrections its own workflow scope; relocating entries must not combine query owners or counts. The Inbox group has no aggregate badge.

## 2. Colocation and state classes

Route views, queries, state and mutation runners must live under their route subtree: `*-page.svelte.ts`, route-local `lib/*-queries.ts` or `*.queries.ts`, and `components/`. A parent layout creates state and provides `set*`/`get*` Svelte context; children read that instance. Layout-owned class/record state follows the same pattern. Shared infrastructure, primitives, typed API helpers, i18n, filters and Smart workflows belong in `lib/`; one-feature orchestration must not.

State classes must use `$state` for mutable data, getters for derivations, bound/arrow event methods and teardown cancellation. They must not contain `$effect`; lifecycle helpers wired during component setup may observe navigation, while owner state executes I/O. Views must not copy route entity arrays into local state or fetch from rendering effects. When two siblings share orchestration, or a view exceeds roughly 60 lines of non-markup logic, that logic belongs to owner state.

Runtime mutation/client imports are forbidden in presentation components. Type imports, API error values and pure display/payload helpers are permitted. Shared subject editors, report comments and documents receive typed callbacks. Self-contained invitation and staff-permission workflows own their declared I/O in Smart state; account-wide photo actions use the app layout's account state. Smart components must not read another route's state. They use a colocated `*-state.svelte.ts`, root component and optional children, fetching only when their workflow requires it.

## 3. Queries, matching scope and loading

Every route/tab has one query owner: `PageQuery` invokes a colocated `query<Scope><Entity>Page` or equivalent owner-state query, which loads the minimum authorized scope and seeds its state. `+page.svelte` only orchestrates query, DataState and the view. Query identity must include authentication/authorization context, applicable school/year/class/level/record/tab, relevant filters and revisions; cosmetic popover state must not refetch data.

Every request must have an abort/lifetime generation. Completion may publish only when target, context and generation still match. Deletion, profile switch, navigation and unmount must reject late results. Concurrent optional domains resolve independently; a forbidden optional enrichment cannot turn an authorized parent into empty data or expose stale data from a prior target.

PageQuery caches URL-keyed `PageLoadMeta` status only. Entity payloads remain on route/tab state. `cache={false}` is required when cached status cannot reconstruct the current slice (including current-only subject data and class teacher-assignment reads). On layout teardown `releaseRoutePageQueryOnDestroy(getUrl)` releases metadata so a new instance reloads. Successful seeding records every loaded version family; failed/aborted reads must not mark a stale snapshot fresh.

### 3.1 Filters, views, sorting and selection

Search/facets/sort and supported `view=list|table` are URL state through `ListFiltersState` and typed read/write helpers. All facets use one immediately applied Filter panel. Search debounces 250ms; Enter/clear flush pending text. Reset filters preserves search and workspace context; active count excludes search/sort/context. Facet choices must represent the full authorized scope, not only loaded rows. Canonicalization must preserve unrelated valid query parameters.

Only Students, Class Students and Activities accept both collection views, with Table default. Other collections accept their assigned type only. A view switch preserves scope, matching query, sorting, selected IDs and equivalent loaded position. Column keys/order are versioned per-account/school/collection browser preferences, not permission grants. Unsupported/obsolete keys fall back to declared defaults; missing browser storage must not block the collection.

Offsets/cursors, loaded batches, total/unknown-total, load-more status and request generations live in route state, not URLs. Infinite loading appends within the same query generation and deduplicates stable IDs. A failed next batch retains rows and retries that batch. Search/facet/scope changes clear batches, cursor and selection. Same-scope refresh retains valid rows and position until replacement; late previous-query pages must not append.

Bulk selected IDs are transient state, not the drawer’s open record. Selection mode is transient collection state. Entering it swaps the pinned rightmost table header/menu cells for checkboxes without changing column widths, sort or scroll position. Clear selection empties IDs while retaining the mode; Exit selection empties IDs and exits the mode. Header checked/mixed state derives only from currently selectable loaded rows; zero such rows disables the control. Customization changes preserve selected IDs, query, sorting and scroll position; opening or closing Customize has no query effect. The hidden active sort field/direction remains described beside title/count. Popup dismissal restores focus to its header trigger; exiting selection through its bar restores focus to that trigger when present, otherwise to the collection menu. The header checkbox selects loaded eligible rows and labels that scope. All-matching selection requires explicit server support/count; no unseen selection may be implied. Opening inspection and switching view preserve selection; query/scope changes clear it, permission loss removes ineligible IDs. Mutation effects reconcile deleted/changed rows and counts from authoritative responses.

## 4. Addressability and history

Pathname owns module/collection, selected record and named domain tabs. Search parameters own filters and overlays/tasks:

| Key | Required meaning |
| --- | --- |
| `modal`, `modalTarget` | Bounded form/confirmation kind and target when not in pathname |
| `modalStep`, `modalTab` | Bounded form's meaningful step/panel; `account-profile` uses `modalTab` values `profile`, `notifications` or `security` |
| `task`, `taskTarget` | Focused workspace kind and durable target/batch identity |
| `taskStep`, `taskPanel` | Meaningful workspace step/panel |
| `view` | Assigned entity collection mode `list` or `table` only |
| `correction` | Selected correction request in its queue |
| `gradeLevel`, `levelQ`, `year`, `date`, `rosterAt` | Declared structural/date context of the corresponding feature |

Every route must allow-list kinds/steps/panels/views and validate target/context/permission before loading or submitting. Unsupported values canonicalize to the nearest valid URL with replace, with an explicit message for inaccessible/deleted targets. Staff permission forms expose `default-scopes` and `apply-profile`, including a saved binding in `modalTarget`. Account `unlink` and correction `action` are the established feature-specific confirmation selectors; they follow the same bounded-form state contract.

A form or task must resolve its target from the authorized URL context, never solely from an object retained by a click handler. Draft fields, passwords, OTPs, recovery codes, uploaded file contents and unsaved records must never enter the URL. Safe non-secret draft restoration may use scoped in-memory state/SvelteKit snapshots; sensitive auth state must never persist. `page.state` may carry non-authoritative return/focus metadata, never the only record/task identity.

Opening inspection/form/task and switching domain tabs or substantive steps creates history entries. Search typing and immediate facet changes replace the current entry. A form inside a task may add a bounded confirmation entry without losing task identity. Browser Back/Forward must reconstruct the corresponding view subject to permission and dirty guards, not repeat commands.

School/Class student `/enrollments` links canonicalize to the same student's `/profile`, preserving query/modal parameters and restoring Schooling for ordinary legacy entry. Profile independently loads portrait, health, guardians, notes, annual declarations, optional subjects and placement history with distinct scoped query identities. Medical reads require `STUDENT_HEALTH_READ`; denied health cannot discard notes. Section failures expose local recovery rather than empty success or closing the identity drawer. Status changes use `modal=change-status`, the existing permission/command and a bounded form. Related guardian navigation retains the student origin, collection context, scroll and focus for contextual Back; origin metadata never authorizes the destination.

### 4.1 One drawer, Back and Close

Following a related record must replace the current drawer, retaining an internal origin descriptor: owning collection URL and matching query, originating record/tab, scroll anchor/offset, loaded extent and focus key. Cross-feature replacement may navigate to the target's canonical route while keeping this origin metadata. It must never render two drawers or require the origin to resolve the target.

Contextual Back restores the preceding record/tab. Close exits the inspection chain to the originating underlying collection, preserving its query/view/sort, loaded position and focus. A form/workspace opened from inspection returns to that record/tab; Close on a form does not close the record as well. History traversal may be used only when recorded entries prove the destination; otherwise replace to the validated origin/canonical parent without adding a duplicate entry that would reopen the closed surface.

For a direct/reloaded link without valid return metadata, the owning route in the feature catalog is the canonical return. Resolve the record's owning class/level/year first where necessary. Return destinations must be internal, authorized and scope-compatible; arbitrary `returnTo` URLs must not be trusted. An inaccessible/deleted origin falls back to its nearest authorized collection and explains the change.

Loaded position is an anchor record plus offset, not a promise to reuse stale data. If route state was unmounted, reconstruct the matching scope and fetch enough authorized batches to reach that anchor where available; if deleted/filtered out, use the nearest surviving position. Restore the initiating control if present, otherwise the nearest row, otherwise collection heading. Focus must not land behind an active dialog.

### 4.2 Dirty work and running commands

Close, Escape, backdrop, contextual/browser Back, route/tab/scope change and task Return must guard unsaved changes before committing navigation. Discard changes / Keep editing must identify the pending work; secrets must not be serialized to support the guard. Native unload protection may supplement in-app guards. Clean forms dismiss directly. A confirmed save marks its saved values clean even if refresh fails.

Each task must declare its save unit and persisted/unsaved work. Leaving a durable import/server job stops local polling, not server work. An explicit cancel command is available only when the domain supports it and the caller is authorized. Indeterminate in-flight writes must not be labeled cancelled or automatically replayed. Reopening a durable task resolves current server state before enabling further action.

Import progress polling uses the same scope and response-generation guards as detail reads. Permission loss clears private detail. A failed final-detail read remains retryable without replaying the import command.

## 5. Inspection and independent tabs

A persistent collection layout owns its rows and selected-record resolver. `[[id]]` or the declared detail path opens the one inspection shell; child routes own independent tabs. Drawer type/Back/Close, identity/actions and body must satisfy the app-shell dimensions and scroll contract. No default editable fields, single-tab strip or global footer actions.

The default domain is available at the record path; named tabs have child paths. Each can seed a parent tab slice or nested detail state through its own PageQuery, without requiring a prior tab visit. Unauthorized domains are omitted and direct access is denied; a partial restriction must not appear as no records.

When an ID is absent from loaded rows, resolve it through the authorized detail query independently of filter/cursor. A loading drawer shows identity skeleton and local progress; read failure shows Retry, denied/not-found shows explicit state and Close. It must not silently close during loading or substitute a different record. A failing optional tab must not blank the identity. Related sections and direct links preserve the same data contract.

## 6. Version ledger and refresh

`entityVersions` contains monotonic entity-family counters only. `RouteVersionSnapshot` tracks every family loaded by a state; `registerVersionInvalidation` calls `invalidateIfStale()` on navigation/focus. Invalidations are pull-based, not global push entity synchronization. Same-route writes reconcile local state and bump families for other owners. Cross-entity writes bump every affected family; school settings and period definitions have their own families.

`VersionedRouteQuery` retains last visited query/URL metadata while data remains on tab state. Refresh only visited stale tabs; abort/clear on drawer teardown. Failed/aborted background refresh remains stale for later retry. Confirmed partial import writes must invalidate their affected domains even if other rows fail. Coarse family counters are the default; scope refinements require demonstrated refresh cost.

## 7. Mutation semantics

All writes must use owner-state methods and a mutation runner accepting `request`, optional paired `apply`/`rollback`, `onSuccess`, localized success/error messages and explicit `versionKeys`. No generic automatic write retries.

Required order:

1. If the operation meets the reversible-patch rule below, apply its captured patch before the request.
2. On apply/request failure, restore the captured snapshot; preserve form drafts and parsed localized errors.
3. After confirmed server success, reconcile result and run `onSuccess`/targeted read refresh.
4. After `onSuccess` settles, bump every affected version key even when the read refresh failed.
5. Report confirmed success or Saved, refresh failed. A failed read must never roll back or resend the successful write.

Optimism is bounded to reversible local record patches with a valid rollback. Financial/authentication/permission-review/revision-sensitive operations must await authoritative success. Create/delete may patch optimistically only under that rule; server IDs and derived fields reconcile on success. Use targeted domain refresh, not full shell refresh, for derived results. Writes must capture target/auth/school/year and reject late UI publication into a different context.

HTTP 409 requires reload-and-review guidance, not blind retry. Family-feedback domain codes must map to prerequisite messages; a rejected lifecycle command reloads that campaign once without repeating the command. Changed form input invalidates reviewed previews. Duplicate submit remains disabled while pending; stable request identities required by a domain survive safe explicit retry.

Drawers are read-only. Boolean/status toggles are not a general mutation exception. X-REVIEW-DECISION permits named lifecycle actions; X-PERMISSION-ORDER permits explicit binding reorder; X-PERIOD-GRID permits calendar gestures; X-SCHOOL-SETTINGS permits per-slot immediate asset saves. Each uses the same authorization, state, pending/error and confirmed-write rules. Attendance cells may be editable only inside the assigned recording form/workspace.

## 8. State semantics and feedback

| State | Owner and required outcome |
| --- | --- |
| Shell pending | Shell progress with accessible label; no unrelated entity hydration |
| Initial route/detail/tab load | Owner skeleton/status; no stale cross-scope content or fake totals |
| Refresh | Retain valid same-scope content, position and selection with refresh indicator |
| Loading more / failed append | Retain rows, trailing status or Retry; do not replace with empty |
| No records / no matches | Successful authorized query; distinguish truly empty scope from search/facets, name applicable recovery |
| Denied | Explicit access state; no empty-success message or forbidden data |
| Unavailable | Unsupported/missing capability or absent persisted detail; distinct from denied, failed and successful empty reads. Retry only for a meaningful read or capability recheck; never invent a write or fabricate historical values |
| Failed read | Local error and safe read Retry; unknown values do not become zero |
| Failed write | Retain draft, restore any optimistic snapshot, explain safe next step |
| Confirmed write, failed refresh | Saved outcome retained; retry reads only |

Announce relevant outcomes in the active locale without repeatedly announcing the full list. Focus and scroll restoration are state responsibilities shared with the shell, not incidental DOM timing. Open record derives from the active inspection target; bulk selected derives from the selection set; keyboard focus belongs to the focused target. They must remain independent through view changes, inspection and return, with presentation from [design-language §3.1](design-language-spec.md#31-collection-row-states). Form opening/loading must use app-shell §4.1 focus rules without stealing focus after user navigation. Keyboard submission must use the existing guarded validation/mutation path; destructive confirmation requires explicit activation and IME composition must never submit. Server data is authoritative; “Not provided”, “Unavailable”, “Restricted”, zero and false must remain distinguishable through selectors and renderers.

## 9. Browser and authentication boundaries

No user-specific mutable module state is allowed during SSR. Browser storage access must be guarded and failure-tolerant. Route instances are client-scoped and recreated/cleared on incompatible scope changes; views must not share one user's payloads with another. Authentication state is independent of school actors. Phone availability is capability-discovered and fails closed to email-only; normal verified-email/authenticator/recovery flows remain available.

## 10. Feature-specific state contracts

### Account dialog and section state

Opening the account trigger must use `modal=account-profile`, with `modalTab=profile|notifications|security` and Profile as the default. Invalid sections canonicalize to Profile without changing the underlying route or its collection query. Opening and changing sections are history entries; Close removes the account surface and its owned query state, restores the invoking route/control and must not discard unrelated filters, detail targets or background history.

Shell-owned account state must own the active dialog and return metadata; independent section owners provide Profile, Notifications and Security data/actions keyed by authenticated account and applicable actor identity. Section navigation must not merge business profile grants with account authority. School selection is not required for Security. Section failures/loading are local and leave navigation/Close available. Late responses from a replaced actor or unmounted section must not publish into a new section/session.

In-workspace links to account settings open the corresponding dialog section. `/account/notifications` and `/account/security` remain direct-entry pages reusing the same section content and workflow ownership; they must not require an underlying collection. Security works before school creation. A valid captured return restores its origin; without one, Close/Return uses the authorized workspace landing when available or the account entry surface when no workspace exists. No external or unauthorized return destination may be accepted.

Section changes, Close, Escape, Back and Sign out must guard unsaved section edits before changing state. Each section owns its save and confirmed-result state; no global Save may combine unrelated commands. Reload reconstructs the section from the URL but restarts any sensitive authentication challenge. Leaving/unmounting a challenge clears its transient secrets and rejects late responses; it does not reverse a confirmed contact or authenticator change. `unlink` remains the addressable confirmation selector within Security, including a dialog opened with `modalTab=security`. Dismissing that confirmation restores Security rather than closing the whole account dialog.

### Account authentication flows

`/account/security` is an Account-level route, independent of a selected school profile. Removal confirmation is addressable with `?unlink=<identifier-id>`. OTP/TOTP challenges, enrollment secrets and recovery codes stay in the mounted authentication workflow state and never enter URLs, browser storage, or entity caches. Reloading an in-progress challenge restarts authentication. Security mutations require fresh authentication; sensitive enrollment/recovery submissions are pessimistic and never optimistic.

Authentication invitation acceptance uses route-owned I/O with its existing explicit committed-write/session-refresh handling; a failed session refresh must not repeat a confirmed acceptance. Credentials and form drafts remain local to the view.

### Correction route state

`corrections-page.svelte.ts` owns the scoped queue and selected request. Filter options must come from the authorized query scope, not just its loaded batch. URL keys are workflow, status, classGroupId, teacherSubjectId, studentId, search, from, to, correction and action. Loaded batches and the next offset stay in route state; filter/scope changes reset to the first batch, and stale pagination responses cannot append to a newer collection. The URL-selected inspection request persists on reload; transient bulk selection does not. Decisions carry the displayed request version; stale review must reload before deciding. Mutations retain filters and refresh the queue.

### Conversation route state

The `/school/messages` layout owns its list, selected thread, read positions, infinite-loading batches and transient reply draft through MessagesPageState and PageQuery. Optional conversation type, status, order, selected conversation and reply-modal state are reconstructed from the URL. Immutable messages use command request identities; successful replies/resolution bump inbox versions and refresh the owning route. Identity switches clear content and drafts and discard stale completions. Refresh all loaded conversation batches every 15 seconds and on visibility resume; stop when hidden or unmounted.

Messaging has one initial/identity query owner: the identity-keyed `PageQuery`. Its query key tracks pathname and queue filters, excluding reply modal navigation. Polling and visibility refresh retain stale-response guards and reviewed-version reply conflicts.

### Timetable generation

Configuration Tools owns the generation workspace and submits the selected class IDs in one `generateSchoolTimetable` request. The backend transaction preserves protected sessions and replaces only eligible slots. On success invalidate planning once and show generated-session results. On failure retain the previous timetable; there is no partial class-by-class success or publication phase. Unsupported publish/republish URLs canonicalize to Tools because generation has no publication phase. `timetableGenerated` is a boolean provenance marker, not a lifecycle state.

### School and grading-scale editors

School profile section modals are `identity`, `issuing`, `location`, and `assets`; there is no page-wide edit modal. The dedicated `/configuration/grade-scales` page owns `scale` for expansion plus `create`, `edit`, `delete`, `add-interval`, `edit-interval`, and `delete-interval` modals. Interval targets include scale and interval IDs. Level/year report-settings mutations carry optional passThreshold; null clears it. Generation captures it without updating existing results. Legacy scale URLs retain their search parameters when redirecting.


### Level configuration scope

`/configuration/structure/{details|subjects|classes}` uses `gradeLevel` as its URL-backed level selection and `levelQ` for level search. Switching level resets its child collection query and detail context after dirty guarding. Switching Details/Subjects/Classes preserves each child collection query independently while closing incompatible inspection/form targets. The parent retains the level settings state; child routes own their collections and drawers. The level form owns metadata and grading drafts with one Save action and URL-backed calculation confirmation. Keep the opened policy revision and retain drafts after errors; after a partial save, retry only unsaved changes using the same created level ID. Legacy `level-grading` links canonicalize to `edit-level`. Deep-linked subject/class records resolve their actual level before canonicalizing the filter. Subject reads query grade-level allocations by level and academic year, then only their linked subjects and chapters; an empty year must stay empty. Page query keys include level and academic context, and aborted/stale loads cannot seed a newer selection. Subjects use an uncached PageQuery because route state retains only the active slice. Old configuration links redirect into this hierarchy with valid modal and tab context preserved.

### Staff permission presentation

Staff detail tabs are Profile and Permissions; legacy staff Assignments child routes redirect to Permissions with query parameters preserved and do not load assignments. Permissions route state retains structured scope-render results for effective tags and separately renders saved default selections. Late scope-label loads must not overwrite a newer school/year or refresh. Disclosure state follows binding identity across reorder and resets when the staff, school or year changes.

Permission forms share a preview state owner that captures complete immutable command snapshots and checks payload, active form session, and request generation before publishing results. The staff page owns combined creation-form profile/catalog data, loading, errors, retry, and cancellation on school or form-session replacement.

### Teacher timetable agenda

The teacher timetable tab owns the full-year event collection keyed by teacher, school, selected academic year, year bounds and school time zone. Use the existing date-range query with UTC bounds covering the school's civil year, then trim and group by local start date. Reject late responses after identity changes. Date controls use `?date=YYYY-MM-DD`; legacy `week` values become date targets. Date-only navigation never invalidates the data cache. Render day groups in batches of 30 through `InfiniteList`, reveal the target before scrolling the timetable session container, and preserve all earlier groups. Keep at most one temporary empty target day. Register planning/teacher/subject invalidation and preserve existing authorization and occurrence membership.

### Modules in the grade-level Subjects tab

SubjectsPageState and its PageQuery load the authorized level/year report configuration, including modules, subject summaries and the configuration revision. Chapter details load only with curriculum-read authority. Scope identity includes school, academic year and grade level. Changes invalidate subjects and reportCards version families.

Module modals are `module-create`, `module-edit`, `module-members`, `module-delete`, and `report-settings`; the target is a module ID. Capture scope/revision when opening and submit expectedRevision with each command. Keep user input after a failed or stale save. Existing subject modal and drawer navigation remains unchanged. Module grouping uses the entire authorized result set before search/category filtering. Legacy template links redirect to Subjects with the grade-level selection and no retired modal target.

### Activity-log reads and inspection

`/configuration/tools/activity-log` owns its school-scoped Table and `/configuration/tools/activity-log/{eventId}` its read-only inspection. Query identity must include authenticated account, effective audit-read scope, selected school, search, date range, actor, domain/action, outcome and the explicit academic-year filter. That year filter defaults to All years; the sidebar year must not silently narrow history. The public read must apply school scope and authorization before search/facets/counts/batch loading and event lookup. A missing audit capability is Unavailable, not an empty successful history or permission to read private storage.

On entry without date bounds, materialize the last 30 days ending at entry time as explicit URL bounds; reload and detail navigation retain that same range. Reset restores a fresh last-30-days range and unrestricted facets while keeping search and school. Search/facets/order are URL state; loaded batches/cursors stay in owner state. Newest-first ordering must use stable event-ID ties. Stale loads after a school, identity, filter or permission change must be aborted/discarded; no prior school's history may remain visible.

An event outside the loaded batch must resolve through its authorized public detail read. No event query or inspection may execute a command, replay a receipt or mutate its source record. Stored changed values must remain immutable historical facts; missing snapshots cannot be synthesized by reading today's record. Event metadata and sensitive related content require their own authorized projections. A denied related-record read must not turn the authorized event into a zero/empty result or leak restricted details.

Related links replace inspection and retain Back to the event. Close restores the log's matching query, sort, loaded position and focus; a direct link closes to the canonical log page. Failed list/detail reads retain independent Retry behavior. Initial load, refresh, load-more failure, no recorded events, no matches, denied and unavailable states must stay distinct. There is no mutation runner, bulk selection, export or replay workflow for this surface. The contract requires a dedicated public audit read capability without prescribing a backend endpoint or changing existing transaction semantics.

### Finance reads and surfaces

The Fees list, school/year overview and selected fee load independently. Billing selected charges load by ID independently of list pagination. Billing child paths `/{chargeId}/payments` and `/{chargeId}/history` share the persistent drawer header and lazily load account settlement history filtered to the selected charge. Preserve loaded detail across tab changes. Fee detail is `/finance/fees/{feeId}` with ordered sections and no one-tab navigation. Old fee edit/archive modal links canonicalize to that drawer while preserving filters; modal query keys remain compatible. Closing a modal restores its originating tab; closing a drawer restores the filtered parent list using route-surface history without duplicate entries.

Named reads `getFinanceOverview`, `getFeeFinanceOverview`, `getFinanceBillingPage`, `getFinancePaymentsPage`, `getFinanceBillingDetail` use trusted tenant/year/resource scopes before aggregation, count, pagination and export. Preserve fee membership through charge → service enrollment → catalog service, including cancelled enrollments. Scope summaries to PAYMENT_READ records; keep report permission for checks. Summary data errors are independent of catalog errors and never represented as zero.

Query identities include school, year, selected entity, relevant filters and authorization context. Discard stale responses on workspace changes; guard user-initiated dirty exits before clearing drafts, and clear immediately on authentication loss. Route-owned payment drafts retain user input after failed commands. All financial mutations invalidate affected overview, fee, billing, payment and student-finance state via the version ledger, with authoritative refresh instead of speculative financial totals. Keep existing commands/models and account invoice generation.

### Annual and optional directory data

Annual-profile query identities include authenticated subject, school, person and academic year. Directory sidecar identities additionally include the loaded person IDs and selected column keys. Abort/stale-context guards prevent earlier requests from populating a later context. State-owned widget queries which cannot restore their state from a cached payload disable PageQuery caching. Queries batch selected optional groups and never issue a request per row. Column visibility cannot authorize a read.

Profile edits preserve omitted values and clear only explicit nulls. They must retain canonical name components, full guardian contact collections, arbitrary medical text, graduated lifecycle state and exact unmodified validity instants. Failed saves preserve the draft. Audit actors, revision/sequence counters and calculated results are server-controlled.

### Subject participation routes

The shared student Enrollments owner loads `getStudentSubjectEnrollments`; the class-subject Students route loads `getClassSubjectRoster`. Optional writes use `manageStudentSubjectEnrollments`, a stable retry request identity and expected offering revisions. The `subjectEnrollments` version key invalidates both owners. Subject mutations use URL-backed modals (`subject-selection`, `subject-roster`); the roster date is persisted as `rosterAt` in the URL.

Participation forms initialize only after their URL target has loaded, retain annual/period choices and request identity on roster conflicts. No participation date editor is exposed. Bulk actions resolve eligible placements and current participation independently of the displayed roster date. Refresh the roster revision and saved participation selections after conflicts; those records are not an edit-history UI.

### Durable imports and focused entry

Tools import state must retain `task=import`, `taskTarget` batch identity and allow-listed task step/panel in the URL. State owns settings, server validation revision/digest, polling, file revisions, preview and execution. Closing stops polling only; reopening queries persisted batch state. Settings/file changes invalidate preview. Confirm sends the exact validated revision/digest. Blocked rows remain visible while ready rows run; partial saved outcomes invalidate their domains and never become an all-or-nothing fiction.

Assessment entry must use `task=grade-entry&taskTarget={assessmentId}&taskPanel=entry`; substantive correction entry must use the same task kind with `taskPanel=correction`. The assessment and class must match the authorized detail route. These panels have no task steps. Legacy `modal=request-correction` links must canonicalize to the correction workspace without executing a command. Single-student `modal=grade-entry&modalTarget={studentId}` links must remain bounded forms and must resolve an exact authorized roster member. Individual corrections must use `modal=correct-mark&modalTarget={resultId}` and resolve the exact authorized result in that assessment; unknown or ineligible targets must not fall back to another result.

Grade-entry and class/session-attendance workspaces capture assessment/day/session, school/class/year, roster revision and return context. Separate draft/confirmed/failed units must be visible. Submission, correction, published-result and roster locks remain domain-owned. One daily class command remains one save; per-record operations remain per-record unless the existing command already accepts a batch. A single-record mark/attendance action uses its bounded URL form and the same eligibility.

### Action and filter consistency

An action descriptor's key, target, permission, state reason, label and request must be the same in the authoritative location and any permitted row shortcut. Collection primary action is a menu entry, not an extra URL-independent header control. Opening Filter has no query effect; changing a facet does, reset restores defaults without clearing search/context. Selection clears when the matching query changes. Saved view/columns cannot disclose unavailable fields or authorize requests.

## 11. Conformance evidence

State behavior must be verifiable through owner-state/query tests with mocked APIs and focused navigation scenarios. Required cases are: direct links outside loaded batches; reload and Back/Forward; related-record replacement and Back versus Close; dirty form/task exits; stale/aborted scope responses; Filter reset and view/selection continuity; each empty/denied/failure state; confirmed write followed by failed refresh; partial task completion and durable-job reopening; auth/permission changes; account section reload/history/dirty exits with Security independent of school; separate Inbox recipient/count scopes; report-model search/facet reset; activity-log range persistence, school isolation, missing historical values and independently denied related records. Query tests must verify payload scope and request counts, version tests every affected family, and mutation tests no duplicate committed write. Pure helpers and compiled rune-state suites need no UI mount; keyboard/focus/narrow-screen/200% text acceptance requires surface-level verification. Evidence and implementation findings belong outside specs.

### Subject enrolment editor

The existing subject-enrolment Smart workflow serves every entry point. Student drawer `subject-selection` URLs retain their offering target; teaching `subject-roster` URLs retain their subject path. On School/Class student collection paths, `modal=subject-selection` uses the shared class ID as `modalTarget`. Selected student IDs remain transient page state and are validated against the URL class, active year and authorization. Reload without that selection displays reselection guidance and cannot submit. The list modal manager does not own student-detail modal targets.

Reads are bounded to four concurrent student participation queries and reject stale actor/school/year/form responses. Any missing or invalid recipient blocks the full save. Changed pairs use one existing command with captured per-offering revisions and a 500-operation limit. A failed response preserves the exact command identity; an edited command or refreshed revision gets a new identity. Conflicts reload current choices, retain drafts and require an explicit new submission. Confirmed saves invalidate affected families even if a subsequent read fails. Filter/scope changes clear list selection; inspection and view changes retain it. The common editor guards dirty dismissal and pending submissions.
