# Shared UI component contracts

Normative for `apps/webapp`. This is a registry of required reusable responsibilities and interfaces, not an implementation inventory. A named role defines required behavior even when a component must be extended to satisfy it. Features must compose these contracts without local styling or interaction forks.

## 1. Ownership and reuse

| Tier | Location relative to `src/` | Responsibility |
| --- | --- | --- |
| T0 | `lib/components/ui/` | Primitives, collections, forms, feedback, gates |
| T1 | `lib/components/layout/` | Sidebar, header and shared workspace context |
| T2 | `lib/components/school/shared/` | Domain identity and read-only inspection primitives |
| T3 | `routes/.../components/` | One route family's content and composition |
| Smart | `lib/smart-components/` | Reusable self-contained workflow, colocated state and child components |

Shared presentation must receive typed data, eligibility and action callbacks. It may import API types and pure display/payload helpers, never runtime API clients or mutation adapters. Route/tab state owns domain reads and commands; reusable Smart workflows own only their explicit workflow state. New shared abstractions beyond this registry require stable reuse in at least three features. A single-feature view must stay route-local. Feature components must not import components from another route subtree.

## 2. Collection contract

| Role | Required interface and behavior |
| --- | --- |
| `PageQuery` | URL key, scoped query callback and loading metadata; seeds route state, never an entity cache |
| `DataState` | Explicit initial/refresh/more/empty/no-match/denied/unavailable/error variants; localized recovery callback only when meaningful and accessible announcements; unavailable capability must not masquerade as denied, failed or empty |
| `ListPageHeader` | Title, meaningful count, page/section heading level, search, one Filter trigger and collection menu; container-aware wrapping from [design-language §2](design-language-spec.md#2-measurable-composition); no separate primary-action slot rendered outside the menu |
| `ListSearchField` | Labeled controlled text value, clear and submit/flush callbacks; 250ms search debounce belongs to shared filter state |
| `FilterPanel` | Facet schema, current/default values, eligibility, immediate change callback, reset and active-field count; one trigger, no Apply/Cancel |
| `FilterSelect` | Labeled select inside Filter or a declared specialized context selector; must not create a standalone collection facet |
| `ListMoreMenu` | Ordered scoped actions, primary first, view/sort/export groups; omit empty groups; close after enabled choice |
| List renderer | Stable identity key, identity/supporting metadata/status, independent open-record and bulk-selected states, optional independent checkbox/menu and navigation callback; Subject-list row anatomy, no card grid |
| `ListEntityTable` | One ordered authorized column model, keyed cells, sort/selection, row/menu activation, pinned shared action/selection column and accessible horizontal overflow |
| `InfiniteList` | Loaded items, has-more/pending/error, append/retry callbacks; must not own API requests |
| `ListSelectionBar` | Selected count and eligible selected-record actions, Clear selection and Exit selection; visible only in selection mode and distinct from matching-dataset actions |
| `RowActionMenu` / item | Scope, label, icon, permission visibility, state eligibility/reason and callback; must not activate the row |

Only List and Table are permitted entity collection variants. The List renderer must reproduce the Subject-list anatomy defined by the app-shell spec, not a responsive tile grid. Students, Class Students and Activities expose `list|table` with Table default; feature assignments govern every other collection. The same model must provide equivalent identities, essential information, actions and states in both views.

Each action descriptor must supply a stable key, localized label, scope, authorization result, state eligibility/reason, busy state, destructive classification and activation callback. A missing grant hides the action; a blocked state disables it with accessible explanation. The descriptor is shared by any row shortcut and its authoritative menu/header location. Renderers must not infer grants from roles, labels or the presence of a callback.

### 2.1 Columns, rows and selection

The identity column is mandatory; selection and actions share the same pinned rightmost structural column, dimensioned by [design-language §2](design-language-spec.md#2-measurable-composition). Its targets render header Customize / Personnaliser and record menus in normal mode, then a loaded-row checkbox and individual checkboxes in selection mode. A feature that forbids row menus, or a row without authorized actions, renders no menu; its utility cell stays empty and aligned. Placeholder ellipses and inspection-only menus are forbidden. Open-record, bulk-selected and keyboard-focus treatments follow [design-language §3.1](design-language-spec.md#31-collection-row-states). No extra checkbox column or separate Columns toolbar is permitted. The header checkbox exposes mixed state and is disabled with no selectable loaded rows; identity inspection stays independent. Optional columns require stable keys, label, minimum width, availability, group, default visibility and whole-dataset sort capability. The header Customize / Personnaliser trigger opens a portaled, viewport-bounded panel with a Columns / Colonnes section, searchable grouped checklist, Show all available and Reset to defaults. This is the sole column-customization location. Both operations preserve search, facets, sorting, selection and loaded position. Hidden active sort fields and direction remain named inline beside the collection title/count without a dedicated toolbar.

Versioned browser preferences contain keys only, scoped by authenticated subject, school and stable collection identifier. Restoration must discard obsolete/unavailable keys; corrupt or denied storage falls back to declared defaults. People-list CSV exports use selected authorized columns across the matching dataset; document generation is a separate action. Optional relationships and annual columns load in batches; sensitive health groups load only when selected and authorized. Partially authorized fields show Restricted, not Not provided. Unknown annual booleans/numbers remain distinct from false/zero.

Canonical first/last names, original supplied names, both student matricules and guardian occupation must remain available. Contact/relationship editors preserve unmodified values; relationship flags stay attached to their respective student. Row activation, checkbox and overflow must have separate keyboard targets. Collections must not make collection-only records look navigable. Header selection means Select loaded rows; all-matching selection needs explicit supported scope/count. Search/facet/workspace changes clear selection; inspection and view switches preserve it.

## 3. Inspection, form and task contracts

| Role | Required interface and behavior |
| --- | --- |
| Detail drawer shell | Entity type, canonical target, contextual Back, Close, current domain tab, scroll/focus restoration; responsive geometry from [design-language §2](design-language-spec.md#2-measurable-composition) |
| `DrawerEntityHeader` | Identity, status/context, at most two visible non-destructive record actions and overflow; never duplicated in each tab |
| `DrawerField` | Label, typed read-only value and explicit missing/restricted/unavailable meaning; no disabled input facsimile |
| Inspection section | Heading, ordered content and scoped menu; essential content expanded, secondary technical facts disclosed |
| Related collection | Standard collection header at section heading level, assigned List/Table, empty/access/unavailable/error states |
| History / comparison | Ordered persisted events or current/proposed typed values, actor/time/reason/consequences; no inferred audit facts |
| `DrawerEmptyState` | Domain-specific empty content; must not conflate denial, unavailable capability or query failure with empty |
| `FormModal` | Captured target/context/revision, field content, validity/dirty/pending/error, Cancel and action-specific submit; default/wide geometry from [design-language §2](design-language-spec.md#2-measurable-composition), wide assignment owned by app-shell §4.1 |
| `ConfirmModal` | Named action/record/consequence, cancel and action-specific confirm; destructive treatment when applicable |
| `PickerModal` | Authorized searchable related-target selection and explicit assignment confirmation |
| Focused task workspace | URL identity/context, return destination, steps/progress when required, working content, persistent actions, save unit and completion/partial-failure state |
| Account dialog | Account identity, active Profile/Notifications/Security section, guarded section-change/close callbacks, return/focus metadata, section-local pending/error/actions and separate Sign out; X-ACCOUNT container with no global Save |
| `PermissionGate` | Effective typed grant for the target; hide unauthorized actions, distinguish state-disabled authorized actions |
| `ToastHost` | Localized outcome without replacing persistent field/task errors; saved/read-refresh-failed distinction |

Shell and content must implement the app-shell's single-drawer, read-only, dirty-discard and return-context rules. Related records replace the current drawer and preserve contextual Back. Tabs are child-route links, not callback-only state or `?tab=`. A single available domain has no tab strip. Subcollection Add belongs first in its scoped menu. Only the named X-REVIEW-DECISION lifecycle decisions and X-PERMISSION-ORDER Move up / Move down on Staff → Permissions profile-binding rows may mutate directly from inspection actions. Both retain their exact app-shell §1.1 scope, eligibility, ordering, pending/error and revision semantics; neither permits general inline editing. Other edits open a form/task.

Forms must use shared Button, Input, Label, Textarea, Select, Checkbox, Dialog and Popover primitives. The primitives must expose geometry by role from [design-language §2](design-language-spec.md#2-measurable-composition) and [§3](design-language-spec.md#3-control-treatments). Menu rows, tabs and record activation regions must not inherit the action-button capsule. Button pending presentation must retain the visible label and reserve only the shared status slot; localized progress belongs in an announced form/task status, never an invisible sizing label. Text buttons must separate their visible face from their non-overlapping hit area. Table cells and targets must implement the shared compact geometry without nested padding. Text enlargement must increase content height without multiplying padding, gaps or corner radii. Persistent header/footer surround a scrolling middle. Form/confirmation primitives must expose initial-focus control and implement app-shell §4.1 keyboard rules: deferred loading focus without stealing focus, ordinary Enter validation, multiline/picker/IME exclusions and explicit destructive activation. They must preserve first-invalid focus, dirty dismissal, topmost Escape and focus restoration. Tasks must retain server save granularity and not simulate a new batch transaction. Import and timetable generation are task workspaces; a bulk confirmation is still a confirmation.

## 4. Shell and identity

`AppSidebar`, `AcademicYearSelector`, `AcademicPeriodSelector` and `ClassSelector` own navigation and shared context. Routes must not duplicate them. AppSidebar must render Inbox immediately after Dashboard with My inbox, School messages and Corrections in order, filtering each by its own eligibility and retaining separate count meanings. The same entries must not also appear in School or the account dialog; the group has no summed badge. Activity log is a Tools destination gated independently by school-scoped audit-read authority. The mobile sidebar uses a focus-managed sheet without changing desktop expansion preference. Term selectors must show persistent labels, dated choices and a missing-year state.

`AccountProfileModal` must implement the sectioned account-dialog contract: Profile, Notifications and Security share one shell and their existing content/workflow owners. At widths from 1024px, its maximum 64rem container puts content left and a 14rem navigation rail right; below 1024px it is full-screen with navigation above content. It must accept the URL-selected section and preserve the invoking route/focus. Close and Sign out remain reachable independently of scrolling content; section actions stay local, with no global Save. Section switches and dismissal must invoke the dirty-work guard. Existing account URLs reuse the same section content, including Security without school context; components must not duplicate verification logic. Administrative fields retain their read-only/authorized-editor ownership, and photo/save/logout semantics remain intact.

`BrandLogo` owns official artwork, variants and clear space. `PersonAvatar` serves staff/guardians; `StudentAvatar` uses published portraits only. `ProfilePhotoPicker` exports cropped/rotated JPEG under 1 MiB; staff and guardian self-photos publish immediately, proposed student portraits require Profile review.

Private portraits must resolve an authorized download grant before fetching bytes. Same-API `/core/files/` downloads retain bearer authentication and reject redirects; external object-storage downloads omit account credentials. A denied grant or download must never fall back to an unauthenticated request. Status classes and labels must come from shared `ui-tones` and `drawer-constants`, not one-off colors.

## 5. Smart workflow contracts

Smart components are shared, self-contained features with their own state class, cancellation and lifecycle handling. They live in `lib/smart-components/`, not under route folders.

| Component | Path | Use for |
|-----------|------|---------|
| **PersonPicker** | `smart-components/person-picker/` | Base searchable person popover |
| **StaffPicker** | `smart-components/staff-picker/` | Homeroom, staff assignment targets |
| **StudentPicker** | `smart-components/student-picker/` | Incidents, billing, enrollments |
| **ClassGroupPicker** | `smart-components/class-group-picker/` | Activity class timetable links, class multi-select on create |
| **GuardianPicker** | `smart-components/guardian-picker/` | Guardian ↔ student linking |
| **PermissionResolutionPreview** | `components/school/` | Added/changed/removed grant scopes and persistent resolution warnings before save. All four permission forms use shared `PermissionImpactPreviewState` to bind review to the complete current command and active session; outdated responses cannot publish a report or enable Save. |
| **PermissionScopeTypes** | `smart-components/scope-builder/` | Presentational scope-type badges reused by profile configuration, staff permission lists and manual permission editing. Uses catalog metadata and the scope picker mapping, existing neutral badge tokens, localized labels and wrapping layout. |
| **PermissionScopeSelections** | `smart-components/scope-builder/` | Mixed selection groups; no automatic broad selection |
| **ScopeBuilder** | `smart-components/scope-builder/` | Typed scope selection groups for staff permissions, profile assignments and staff defaults |
| **AccountLinkingSection** | `smart-components/account-linking/` | Staff, guardian and student invitation workflow with actor-scoped state |
| **PasswordlessPanel** | `smart-components/passwordless-panel/` | Login, signup, invitations and security; transient authentication state |
| **TestOtpPanel** | `smart-components/test-otp-panel/` | Build-gated testing controls with stale-response and visibility guards |
| **AnnualProfile** | `smart-components/annual-profile/` | Year-scoped student/teacher declarations with guarded state |
| **GuardianRelationship** | `smart-components/guardian-relationship/` | Shared guardian/student relationship editing |
| **ReferenceCatalog** | `smart-components/reference-catalog/` | Academic-discipline and placement-status catalogs |
| **DirectoryColumnData** | `smart-components/directory-columns/` | Authorized optional column data loaded in batches |
| **AttendanceReview** | `smart-components/attendance-review/` | Shared attendance review workflow |
| **StaffPermissionFormModal** | `smart-components/staff-permission-form-modal/` | Add / edit `staffPermissionAssignments` |

Do not build ad-hoc `<select>` lists for people — use pickers or **PickerModal**. New smart components follow `*-state.svelte.ts` + root `.svelte` + `components/` subfolder.

### Authentication and test access

`PasswordlessPanel` is shared by login, signup, invitations and Account security. It owns one contact field with automatic email/international-phone detection and validation, user-triggered resend and SMS switching after server cooldown, OTP, authenticator verification/enrollment and one-time recovery-code display through its colocated `PasswordlessPanelState`. Authentication requests and completion belong to this smart workflow state. Use existing Button/Input/Label primitives and ConfirmModal for identifier removal. No auth-provider SDK belongs in UI components. `TermsAcceptance` displays backend-owned localized terms above the submit action in login, signup, demo and invitation workflows. Its Read terms link opens a focus-contained dialog with a scrolling document and a persistent Accept action at the bottom. Accept closes the dialog and checks the acceptance box without submitting authentication. Close, Escape and outside dismissal preserve the prior checkbox value and restore focus to the link. `PasswordlessPanelState` owns loading, retry, checked and dialog-open state; terms-loading failures block new sign-ins. Identity changes, restart, and document or locale changes clear acceptance; OTP retries and MFA preserve the server-pinned version. Authenticated contact linking and enrollment do not acquire consent. Draft previews are clearly labeled and restricted to non-production configuration.

`TestOtpPanel` is shared by login and contact linking through `PasswordlessPanel`. The `$testOtpPanel` build alias resolves to an empty component unless `PUBLIC_TEST_OTP_ACCESS=true`. The backend must also advertise capture support; explicitly disabling the flag must be respected. The enabled component discovers server capabilities once, reveals only after an explicit **Show test code** action, labels the panel as testing, and offers **Copy** without filling or submitting the form. It clears transient codes and ignores late responses after replacement, expiry, completion, reset, unmount or backgrounding. Code content carries `data-sensitive` so integration captures mask it. Normal deployment builds must disable the flag.

`/login/demo` retains the development-only staff account picker. Choosing a fixture account only prefills `PasswordlessPanel`; sending and verifying its OTP, optional authenticator steps, resend and testing controls use the existing flow. Choosing another account unmounts the panel and clears its transient challenge. No password or automatic sign-in is used by the picker.

Identity advertises phone availability. Until discovery succeeds with phone available, authentication and contact-linking forms display email-only labels, omit phone choices and country hints, and reject pasted phone identifiers locally with translated feedback. Discovery failures fail closed to email-only; phone controls return when availability is explicitly restored. Email OTP, authenticator verification/enrollment and recovery remain available.

### Permission catalog semantics

The API catalog's `staffAssignable`, `serviceAccountAssignable`, `assignmentTargets` and `scopePolicy` determine picker availability. Do not infer eligibility from action names or maintain permission-specific scope exceptions. Unscoped actions have no scope/default controls, supported-scope badges, or effective-scope labels. Their internal `school` grant marker is never a user selection. Profiles automatically include their unscoped actions; mixed profiles expose resource selectors only for resource-scoped members. Default scopes contain resource selections only. Empty resource selections grant no access; broad access requires explicit All at a supported grain. Preserve preview/save identity, ordering, first-wins and unresolved/shadowed warnings.

### Route-owned authorization UI

| Component | Path | Use for |
|-----------|------|---------|
| **PermissionCheckboxGroup** | `routes/(app)/configuration/structure/classes/components/PermissionCheckboxGroup.svelte` | **Staff assignment** create/edit forms only — pick permission codes authorized directly by a class-level assignment; **not** the Permissions tab list |

**Do not** use `ScopeBuilder` outside staff permission, permission-profile assignment and staff default-scope flows. A mixed-permission **profile checklist catalog** at `/configuration/permission-profiles` is allowed. **Do not** restore a roles CRUD matrix screen.

## 6. Route-specific composition boundaries

Dashboard belongs to `/dashboard`; imports and school timetable generation to `/configuration/tools`; class calendars, occurrence attendance and logbooks to class timetable routes. Report model structure belongs to Configuration and homeroom comments to class report results. Shared scheduling helpers remain in `lib/scheduling/`. Shared subject editors, report comments and document controls receive route/tab action callbacks; they must not call runtime mutation adapters.

The generation workspace has one searchable grade-grouped class list beside subject settings. Checkbox and class-navigation targets must be independent. Inclusion and drafts belong to task state; no second class selector is allowed. Narrow screens stack this list above the editor with bounded list scrolling and reachable task actions. `StaffPicker` callers must set active eligibility deliberately; class assignment forms require active staff.

The X-CONFIG-RAIL composition owns a 17rem full-height white rail flush to the configuration area's left/top/bottom and a right divider; main content owns page padding. Level selection and Details/Subjects/Classes links remain separate from collection facets. The Other configurations rail is headed Configurations in FR/EN, with permission-filtered destinations. Below 1024px use a labeled compact selector above content. Fixed drawer/backdrop elements must stay viewport-aligned without inherited sibling margins.

Report model collections must use the standard List renderer, ListPageHeader, name/description search and one FilterPanel containing publication/default-model status. The scoped menu places Add model first, followed only by supported standard controls; it must not introduce export, bulk operations or a view alternate. Model rows open their existing section drawer with Model summary, Structure and Grading context. Selected/focus and return states follow shared List rules. Context changes guard dirty forms before closing stale targets. No duplicate workload/grading editor is permitted: use the assigned subject and level forms.

### Corrections and messages

Correction lists use ListPageHeader, FilterPanel, PageQuery and DataState. Correction detail uses the shared accessible Dialog drawer and FormModal for rejection/consequence confirmation. Structured logbook content, objectives, homework, family summary and progress render as individual differences; use subject/chapter/student names instead of internal identifiers.

Route-local MessagesView composes ListPageHeader, DataState, DrawerEntityHeader, Dialog, FormModal, Button, Label and Textarea. Read-only teacher oversight uses the same thread presentation without school mutation actions. School queue status, unread state, author identity and conflict feedback are textual as well as visual.

Route-local `ConversationMessageBubble` renders immutable history in chronological DOM order. School staff replies, including colleagues' replies, align right with `primary-container`; guardian messages align left on neutral `muted`. Teacher oversight puts teachers right and guardians left, describing participant roles rather than viewer ownership. Retain actual names, selectable multiline body text and smaller localized timestamps in browser timezone. Direction depends on author kind through the pure `messagePresentation` helper, never display names. Localized article labels identify direction/role, author and time without receipts. Bubbles wrap arbitrary words/URLs, use the conversation-bubble radius from [design-language §2](design-language-spec.md#2-measurable-composition), and width constraints from [design-language §6](design-language-spec.md#6-brand-and-specialized-presentation); compact enlarged text can use the available width. Header actions wrap at larger text sizes. Reply modal, drafts, infinite loading, polling and permissions retain their existing ownership.

Messages and Corrections use `ListPageHeader`, facet controls inside a single labeled `FilterPanel`, and `ListEntityTable` with semantic status chips and infinite loading. Corrections keeps its debounced `ListSearchField` in the header. Messages combines all authorized conversation types, with row tags and optional type, status and order filters; do not add a search that silently covers only loaded conversations. Detail drawers use type, contextual Back and Close with a scrollable content region; width follows [design-language §2](design-language-spec.md#2-measurable-composition).

Interval Edit and Delete actions share RowActionMenu. Report model FormModal includes an optional passing threshold; the drawer displays the saved value or Not configured. Configuration editors reuse FormModal, PermissionGate, FilterSelect, Checkbox, Input and RowActionMenu. RowActionMenu closes after an enabled action is chosen so it cannot obscure the editor’s return destination. School asset slots support a read-only summary and an immediate-save editor. All configuration forms retain keyboard focus within the modal, wrap long labels, and scroll vertically at narrow widths or enlarged text.

### Weekly period calendar

The period-grid route uses only the SVAR Calendar view, including when the selected year has no slots. No board/view switcher or date navigation is permitted (X-PERIOD-GRID). Reuse the installed class-timetable calendar dependency and shared `components/calendar/SvarCalendarLocale`; route components must not import class-route components. Use bundled fonts, semantic theme tokens, weekday unit columns and a fixed local anchor date solely for rendering. Never persist that date or expose date navigation. Hide empty weekend columns independently; retain scheduled weekends. Reset selection and weekend visibility on school/year changes.

Provide a visible bottom resize handle on every slot, including short breaks. Pointer capture separates resizing from moving/creating; Escape, pointer cancellation and unmount restore the original height without saving. Up/Down on the focused handle adjusts the end by five minutes. Use the rendered time scale for the pointer delta, without a minimum event-height threshold. During dragging, show the snapped end-time preview on the card without changing route data; prioritize the time over the label on short slots. Clear that preview on release, cancellation or unmount so failed saves show the original time. Resize changes end time only, normalize to five-minute clock boundaries, and validate a positive same-day range against all slots (including breaks) in the current school/year/weekday. Adjacent endpoints are allowed. Whole-slot moves preview both displayed times from the native card position, snapping the start to five minutes and preserving duration. Clear the local preview when the native drag ends or the card unmounts; prioritize the time on short slots as during resizing. Whole-slot moves snap the start time, preserve duration and may change weekday; validate against the destination weekday. Keep configured order and other metadata. Route state owns the existing save mutation; serialize writes and cancel the vendor's internal update so only successful API results update displayed data. Failed saves leave the previous time intact. These client checks do not replace server validation or protect against concurrent changes by another client.

Add slot then Quick setup belong in the collection menu; slot edit/delete remain permission-gated forms/confirmations. Show adjacent in-slot Edit and Delete icons on hover, keyboard focus or selection (always on touch devices); prevent them from starting a drag. Highlight the selected slot. Keep card actions keyboard-focusable with slot-specific accessible labels. Do not show a separate slot selector or Edit/Delete toolbar. Keep the caption and weekend control in a wrapping header with the related-control gap from [design-language §2](design-language-spec.md#2-measurable-composition) above the calendar. Save/pending announcements remain screen-reader accessible without a reserved status row; failures appear inline, while successful saves use the existing toast. Announce save/error results in the active locale. The calendar supports pointer moving and resizing; precise keyboard time editing stays in the modal.

Drag across empty calendar space to open the existing creation modal with the selected weekday and independently snapped start/end times. Validate a positive same-day selection and overlaps before opening and again against current data on submission. Scope the in-memory form seed to the current school/year, and clear it when the modal closes or Add slot is used. Cancel creates nothing; only the existing save mutation creates a slot. Keep Add slot for keyboard/touch creation and retain confirmation before deletion.

### Activity log

The read-only Activity log must compose ListPageHeader, ListSearchField, one FilterPanel, ListEntityTable, InfiniteList and DataState. Its route state supplies authorized event rows and details; presentation must not query internal command receipts or reconstruct audit changes from current entities. The event drawer composes DrawerEntityHeader, DrawerField and the shared history/comparison patterns without record mutation controls. Missing recorded values and restricted content remain distinct. Related-record links receive separate target eligibility and the standard replace-drawer/Back behavior. The Tools entry is independently gated; no table selection bar, export or replay controls are permitted.

### Finance

Fees, Billing and Payments must use Table, shared header/filter/menu and infinite loading. Fee and billing inspection compose shared drawer fields/sections/menus. Finance overview and payment forms remain finance-domain compositions; no extra global framework. Read-only terms/history must remain separate from mutation controls, and eligibility must include selected-student scope.

### Optional subject selection

`smart-components/subject-enrollment/SubjectEnrollmentModal.svelte` and its state are the single subject-enrolment workflow for School/Class student drawers, teaching rosters, and School/Class student-list batch actions. Typed context supplies class/year, student targets and an optional fixed subject; the teaching entry additionally allows selecting recipients. This registered Smart workflow owns authorized bounded reads, draft validation, revisions, replay identity, atomic submission and entity invalidation. Callers own URL entry/return and list selection; presentation must not duplicate command or conflict handling. `$lib/subjects/SubjectSelectionFields.svelte` supplies the same fields to every entry point. It presents Annual, multiple period checkboxes, completed read-only labels and Clear selection. It receives periods, timezone and a bound desired selection; route state owns API calls, revision checks and replay. Clearing selections uses the existing FormModal confirmation action labelled Withdraw.

## 7. Conformance

A shared component must define all relevant states, keyboard/focus behavior, long-text and 200% text behavior, FR/EN strings, narrow-screen behavior and its authorized variants. Variants must express the named app-shell exceptions; a boolean styling escape hatch must not create an undeclared layout. Feature-local code may supply content and callbacks, not competing typography, collection anatomy, action placement or permission semantics.
