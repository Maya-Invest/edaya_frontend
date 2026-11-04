# App Shell Architecture Spec

Normative for the staff webapp. This contract defines composition and interaction. Domain actions retain their permission, validation, calculation and transaction semantics. Each feature must assign a surface and ordered content; shared presentation rules apply unless a named exception states a replacement.

## 1. Shell and workspace context

The application shell consists of navigation, global header, main content, one inspection drawer, at most one foreground form/confirmation, task workspaces and feedback. The school name/school selector belongs on the left of the app header beside the navigation control. The sidebar header is a compact identity tile with a small logo on the left and the school short name above academic-year context on the right. Language and account controls form one cohesive right-aligned group at every screen width; they must not spread into separate evenly spaced controls on compact screens. When space is insufficient, school identity wraps onto a left-aligned second header row while language/account controls remain together at the right of the first row. Under X-SCHOOL-YEAR-SWITCHER, the year is plain secondary text beneath the school short name with an adjacent three-dot icon button; the School year / Année scolaire context label remains available to assistive technology. The collapsed sidebar header shows only the school logo. The icon button opens a centered bounded dialog with a labeled shared year selector, selected-year date range, Cancel and Switch year. Every authorized year is available, including draft/published/archived states, newest first and explicitly labeled. Choosing a year previews it; only Switch year applies it after dirty-work guarding. Cancel, Close, outside activation and Escape discard the temporary choice without affecting the workspace or its drafts. Keep editing leaves the dialog choice intact. Mobile navigation remains open when this dialog closes. Focus returns to the year trigger when visible, or to the app-header navigation toggle when the sidebar collapses. Loading and no-year states are explicit and disabled; no fallback may impersonate a selected year. Class context belongs to the class navigation. Language and account controls belong in the global header.

Term selection must appear beside the academic content it scopes, with dates in its options; it is not a collection facet. A missing year or term must have an explicit state and must not display the previous scope's data. Workspace changes must invalidate affected reads and drafts without silently transferring them to another school, person or year.

At the desktop viewport breakpoint in [design-language §2](design-language-spec.md#2-measurable-composition), navigation is a sidebar. Below it, navigation is a focus-managed sheet, initially closed, dismissed by navigation, Escape or outside activation. The compact sidebar slides in from the left with the school identity and close control in its first row. Its content fills the sheet edge to edge. Reduced-motion preferences suppress the slide. The app header owns the desktop expansion toggle and saves its preference. Opening or closing the compact sheet leaves that preference intact. Main content uses the remaining viewport width.

### 1.1 Named specialized compositions

These exceptions replace only the named composition; authorization, state, copy and accessibility rules still apply.

| ID | Surface and replacement | Justification |
| --- | --- | --- |
| X-DASHBOARD | `/dashboard`: scoped summaries and work queues; no entity collection toolbar for the whole page | Overview across domains |
| X-CALENDAR | School calendar and class timetable: date/week navigation, time grid and contextual occurrence actions instead of a List/Table body; collection actions remain in `···` | Time and duration are primary coordinates |
| X-PERIOD-GRID | `/configuration/period-grid`: weekly slot grid with direct move/resize, empty-range creation and in-slot Edit/Delete | Spatial schedule editing; keyboard form alternative is mandatory |
| X-ACADEMIC | Academic years and grade scales: disclosure groups with nested periods/intervals and scoped menus | Ordered hierarchy must remain visible |
| X-CONFIG-RAIL | Levels and Classes / Other configurations: desktop 17rem selection rail plus content; compact selector below 1024px | Structural navigation, not a collection filter |
| X-SCHOOL-SETTINGS | School profile: ordered read-only configuration sections with scoped Edit; asset editor saves each slot independently | Singleton configuration and asset ownership |
| X-ACCOUNT | Account dialog: Profile, Notifications, Security as horizontal tabs in a compact dialog; full-screen below the shared dialog breakpoint. Login/onboarding retain their dedicated identity forms and steps | Account settings need one sectioned container; authentication, verification and recovery retain task-specific controls |
| X-TOOLS | Tools, teacher assignments hub and finance checks: named task entries, previews/results and existing scoped controls | Operational tasks rather than generic entity inspection |
| X-TEACHER-AGENDA | Teacher Timetable tab: fixed record context and Today/date controls over a bounded chronological session scroller | Date navigation must retain its controls |
| X-REVIEW-DECISION | Review surfaces: named approval, validation, takeover, resolution and read-status commands may run directly from actions; rejection/reason/changed data uses a form. Corrections chrome includes Next pending navigation within the same queue | A single authorized lifecycle command is not inline field editing |
| X-PERMISSION-ORDER | Staff Permissions binding-row menu: Move up/Move down immediately reorders and re-resolves, with pending/error feedback; first/last boundaries disable the impossible direction | Explicit ordering command without editable drawer fields |
| X-GRADE-LOOKUP | Grade-scale disclosure: labeled sample input with read-only matched mention/code; no save or mutation | A calculation preview, not an editor |
| X-DATE-COLLECTION | Daily attendance day collection: omit free-text search, keep date-range/status facets in Filter and the collection menu | Civil date is the row identity |
| X-TEMPLATE-RESET-REVIEW | Notification-template collection menu: neutral Reset all templates first opens consequence review, before Export CSV; the final reset confirmation alone is destructive | Retains the primary collection action while separating review from execution; all other destructive entries remain last |
| X-SCHOOL-YEAR-SWITCHER | Shell `AcademicYearSelector` in expanded desktop and mobile navigation: replace the always-visible select with a three-dot trigger beside plain year context and a transient bounded dialog with explicit Switch year; only the existing workspace selection changes | Infrequent workspace changes need compact persistent context; standard keyboard, focus, modal geometry, dirty-work and authorization rules remain applicable |
| X-LANGUAGE-SWITCHER | Shell language control: original compact icon/EN–FR/chevron pill and local flagged-option popup; replaces generic form-selector/button geometry only as specified in design-language §3 | Frequent shell preference, not record editing |
| X-DESIGN-SPECIMEN | Development-only `/__design`: side-by-side component variants and state selectors without production navigation/mutations | Visual inspection requires multiple simultaneous specimens |

Specialized body composition must not authorize extra colors, button variants, permission shortcuts or unsupported actions.

### 1.2 Inbox navigation

Sidebar order must be Dashboard, Inbox, School, Classes, Finance, Configuration. Inbox / Boîte de réception contains, in order, My inbox / Ma boîte de réception, School messages / Messages de l’école, and Corrections / Corrections. Their existing routes remain `/account/inbox`, `/school/messages` and `/school/corrections`; their names and group placement must not merge their data or permissions.

All three Inbox collections use their declared Table columns, the shared collection header and table-header Customize control; no per-page table toolbar or automatic List replacement is permitted.

The Inbox group is the authoritative navigation location for these queues; School and the account dialog must not repeat them as competing navigation entries. My inbox belongs to the signed-in account and selected recipient profile. School messages keeps school conversations and independently authorized teacher oversight. Corrections keeps each workflow's authorization. A child without read authority is omitted; an empty group is omitted. A temporary query failure must not remove an authorized destination. Each existing child count must retain its own scope and meaning; there is no aggregate Inbox badge combining unread deliveries, conversations and corrections.

Activity log belongs under Configuration → Tools, not Inbox. Tools navigation must be available to a caller with dedicated school-scoped audit-read authority independently of import, timetable or finance-check authority. The log page uses the standard Table/detail composition; the Tools landing-page exception does not authorize a specialized log layout.

### 1.3 Account dialog

The account trigger must open one compact My account dialog with Profile, Notifications and Security tabs in that order. Geometry follows [design-language §6](design-language-spec.md#6-brand-and-specialized-presentation). The header and horizontal tab strip remain visible above exactly one scrolling content region. There is no navigation rail or global footer. Sections share padding, aligned headings and flat sections separated by dividers. Inner notification and verification forms retain the default bounded-form width from design-language §2. Tab controls expose tab/tabpanel relationships, current selection and keyboard navigation; activating a section focuses its heading.

Profile presents the current photo, name, descriptive school role and department as read-only facts. Photo changes retain their existing eligibility and immediate-save flow. Sign-in methods belong to Security; notification destinations belong to Notifications. Notifications uses the supported personal settings: staff select the default sign-in/school email or an explicit alternate destination, plus an optional notification phone; guardian channel and child preferences retain their own commands. Only dirty notification drafts show local Save changes and Discard changes actions. No inbox shortcut or global Save is permitted.

Security loads its summary on entry. It presents sign-in methods, recovery eligibility, authenticator state and a separate Current session section containing a quiet Sign out action. Adding a method or configuring the authenticator opens one existing verification workflow on explicit selection. A recent-identity challenge appears only when required by the server; failed reads show Retry rather than implying reauthentication or empty settings. Removal belongs to the method's overflow and confirmation, with its actual sign-out consequence; the last recovery method is disabled with an explanation. Verification must never automatically replay removal. Issued recovery codes stay transient within their existing workflow.

Section changes, Close, Escape, browser Back and Sign out must guard unsaved edits and verification work. Closing a completed step must not repeat its command; a confirmed save followed by failed refresh remains saved. Existing cooldown, retry, verification and permission rules remain authoritative. One section's failure must not prevent navigation to another.

The address is `modal=account-profile` with `modalTab=profile|notifications|security`, default Profile. Existing account URLs remain valid entry points to the corresponding content. Security must work without a selected school. Direct-entry return and the independent account-content state follow the route-state contract.

## 2. Standard collection

### 2.1 Header

Every standard collection must use this order:

`Title · count                         Search   Filter   ···`

Title/count is left aligned. Search, an icon-only Filter button and the collection menu are right aligned. Header spacing, search sizing and wrapping must follow [design-language §2](design-language-spec.md#2-measurable-composition), using the collection’s available content width rather than the viewport, including inside drawers. A description, when required to explain scope, appears once beneath the title. Counts must distinguish matching total, loaded rows and bulk-selected records; an unknown total must not be fabricated.

The primary collection action must be the first eligible item in `···`; it must not appear as a separate header button. Menu groups, in order, are: primary action; selection actions; View and Sort; Import/Export; other secondary actions. Omit unsupported entries and empty groups. Omit the menu if no entries remain. A permitted but state-blocked primary action remains first, disabled with its reason.

All facets belong in one Filter panel, including any former highest-frequency facet. Controls apply immediately; the panel stays open until dismissed. The trigger counts non-default facet fields, excluding search, sort and workspace context. Reset filters restores facet defaults while preserving search and context. The panel must not have Apply/Cancel. Sorting belongs to Sort or sortable table headers; conversation order is an explicitly named domain facet for School messages. Omit Filter when the feature declares no facets. No empty placeholder controls.

Search must cover the feature's declared matching dataset, not silently just loaded rows. Enter and the clear control must flush a pending search. Search changes are debounced by 250ms; discrete facet changes apply immediately.

### 2.2 List

List must use the Subject-list anatomy: one flat bordered surface with outer corners defined by [design-language §2](design-language-spec.md#2-measurable-composition), separated full-width rows, a primary identity, optional supporting information and meaningful status/category labels. It must not be a multi-column card grid.

Row padding and identity typography follow [design-language §2](design-language-spec.md#2-measurable-composition); height grows with content. Essential values wrap. A leading avatar or subject marker is permitted only when it conveys identity/category; it must not create a new per-feature layout. Supporting metadata follows the same typography contract. Dividers appear between rows, not after the last row.

A navigable row has one primary activation region and a trailing chevron. Its checkbox and action menu are independent sibling controls. A collection-only record has no navigation chevron, pointer styling or no-op button. A labeled disclosure may show compact ancillary facts; it must not hide a form or nested workflow.

### 2.3 Table

Table must use one ordered column definition for headers, cells, sorting and authorized export. Identity is required. Table actions and selection share one structural rightmost column; entering selection must not insert a leading checkbox column or shift data columns. Header/body geometry, centered targets and utility-column width must follow [design-language §2](design-language-spec.md#2-measurable-composition). Cells must not stack padding around controls. Headers and body rows grow for wrapped or enlarged content. Numeric columns align right with tabular figures; text aligns left.

Available optional columns, default order and sort capability must be declared per collection. In normal mode, the rightmost header contains a `···` trigger with accessible name Customize / Personnaliser; row cells contain record action menus only when the feature permits them and authorized actions remain. Otherwise the utility cell is empty; do not render placeholder ellipses or an inspection-only menu. The cell remains aligned when the column is needed for customization or selection. Customize opens a viewport-bounded portaled panel whose Columns / Colonnes section contains the searchable grouped checklist, Show all available and Reset to defaults. Required columns remain visible. Column customization has no duplicate collection-menu entry or dedicated toolbar above the table. No speculative customization sections are displayed.

In selection mode, the same header cell contains Select loaded rows and the same row cells contain individual checkboxes; customization and record menus are hidden. The header is unchecked, mixed or checked according to selectable loaded rows and is disabled when none exist. Record inspection remains an independent identity target. Exiting selection restores the menus. The rightmost column remains pinned at the visible right edge during horizontal scrolling, with an opaque background matching header/row state and a subtle left divider. It must not obscure the final data column at the scroll endpoint. Menus remain outside the scroll clipping region.

A field is sortable only when the complete matching dataset can be sorted. An active hidden sort field and direction remain identified inline beside the collection title/count, without reinstating a table toolbar. Collections without customization, selection or row actions omit the structural column; otherwise its position and width remain stable. If customization is unavailable, the normal header is labeled Actions without a no-op menu.

At narrow widths, the table remains a keyboard-focusable horizontal scroll region. Essential columns must not disappear automatically and the view must not silently change to List.

### 2.4 Collection behavior

List and Table must use flat surfaces with the outer corners defined by [design-language §2](design-language-spec.md#2-measurable-composition), row separators and no decorative shadow. Rows and their activation regions must remain square; only the outer container clips the first and last rows to its corners. Individual rows must not be separate rounded cards. Section grouping must use headings and spacing rather than nested card frames. Search and field controls in Filter, including date and interval pickers, must use the query-control capsule defined by design-language §2–3. Ordinary create/edit fields retain their field treatment.

List and Table are the only entity collection types. Students, Class Students and Activities offer both and default to Table; other features use their assigned view. Switching view preserves scope, search, facets, sort, selection and equivalent information/actions.

Open record, bulk selected and keyboard focus are independent states with the treatments in [design-language §3.1](design-language-spec.md#31-collection-row-states). The identity target must identify the open record accessibly. Row activation opens inspection; a checkbox changes bulk selection only. Row actions must not trigger either. A header checkbox means Select loaded rows and must say so; all-matching selection is available only when the underlying operation supports it and identifies the full count.

Selection actions belong to a selection bar immediately above the collection, present only in selection mode even when its count is zero. It names the selected count and offers eligible bulk actions, Clear selection and Exit selection. Clear selection retains the mode; Exit selection clears selected IDs and restores normal controls. Entry into selection mode belongs to the collection menu. Scope/search/facet changes clear selection. Opening/closing inspection or changing view does not. Loss of permission removes affected selection. Export matching and Export selected must have distinct labels and scopes.

Scalable collections must append batches with infinite loading, retain existing content during refresh/detail navigation, and offer Retry for a failed next batch. Filter/scope changes reset the result generation and discard late responses. There are no numbered pagination controls.

## 3. Inspection drawers

### 3.1 Qualification and anatomy

A drawer must provide useful inspection beyond the collection: substantial record facts, preview, relationships, results or history. Edit/Delete actions, technical entity boundaries and content height do not justify a drawer. Each feature must name its inspection purpose and content.

The drawer contains, in order:

1. Chrome with record type, contextual Back when available, and Close.
2. Identity header with name, meaningful status and concise identifying context.
3. Up to two visible non-destructive record actions; remaining actions in overflow.
4. Ordered inspection sections or domain tabs.

The identity summary must make a direct-linked record understandable without its collection. Repeating essential identity is permitted; repeating list columns as the entire drawer is forbidden. No duplicate hero/header inside tabs, global Save/Cancel, or redundant Close footer.

Drawer width and viewport breakpoint follow [design-language §2](design-language-spec.md#2-measurable-composition). Chrome, identity/actions and tab navigation form one accessible fixed region; the main content is one vertical scroller. At short heights or 200% text, the identity/actions may scroll within that same body while Chrome/Close remains reachable. Independent body scrollers require X-TEACHER-AGENDA; tables retain horizontal scrolling.

### 3.2 Content grammar

| Pattern | Required composition |
| --- | --- |
| Facts | Section title, optional scope/help, labeled values; no disabled input controls |
| Related collection | Scoped title/count and standard Search/Filter/`···`; List or Table as assigned |
| Long-form content / preview | Readable selectable text, preserved meaningful paragraphs, accessible attachments or preview |
| History | Chronological events with actor, localized time and outcome; missing audit data must not be invented |
| Review | Current and proposed typed values, reason, affected records, consequences and decision state |
| Summary | Clearly scoped figures with labels, units and consistent precision |

Essentials must be expanded first. Secondary technical/audit facts belong in a labeled disclosure, collapsed initially. Section order is the feature contract's order. Do not place a separate card around every fact. A fact grid follows the content-width threshold in [design-language §2](design-language-spec.md#2-measurable-composition); long descriptions and addresses span the full width.

An essential missing value must display Not provided, Not configured, Unavailable or Restricted according to meaning. Optional empty decorative sections may be omitted; authorized empty related collections remain visible with their count and explicit empty state. Denied sections must not show a false zero. Entire unauthorized domains/tabs are omitted; partially authorized content uses Restricted without leaking hidden totals.

### 3.3 Sections and tabs

Sections are required when content forms one reading context. Tabs are required only for independently visited domains named in the feature contract. Height, field count and permission count must not create tabs. A single available domain has no tab strip; its canonical address and content remain reconstructable.

Tabs use human domain labels and child routes. Student school/class drawers expose Profile, Enrollment, Attendance, Grades, Report card, Incidents, Finance and Documents with square underlined navigation. The Profile portrait section shows only the proposal and explicit replacement/review actions. Profile sections use headings, labeled facts and dividers without nested cards or inline status editing. Each tab owns its loading and error state. A failed optional tab must not blank the identity or other domains. Tabs must not depend on visiting another tab first. Unavailable tabs must not turn into empty authorized data.

### 3.4 Read-only content and actions

Drawer bodies must not contain editable fields, field toggles or open forms. Bounded changes open a form; substantial entry opens a task workspace. X-REVIEW-DECISION permits only its named single-step lifecycle decisions. X-PERMISSION-ORDER permits only Move up / Move down on Staff → Permissions profile-binding rows, preserving the feature’s authorization, ordering, pending/error and revision semantics. Neither exception permits general inline field editing.

Record actions belong to the identity header. All icon-only buttons outside table headers, related-collection headers and rows, including record-header Back, Close and overflow, use the circular icon treatment from [design-language §3](design-language-spec.md#3-control-treatments); table-header, related-collection-header and row overflow retain their quiet treatment. Section/related-collection actions belong in their scoped `···`, with the primary action first. Sub-record actions belong in that row's menu. A row shortcut may duplicate a record action only with the same label, scope, eligibility and outcome; do not repeat it in unrelated sections.

## 4. Forms, tasks and return navigation

### 4.1 Bounded forms and confirmations

Create/edit forms, relationship pickers, single mark entry/correction, single-record attendance changes, and reason/confirmation steps use modals. Widths follow [design-language §2](design-language-spec.md#2-measurable-composition). Profile forms, permission forms with impact review, incident resolution, subject/chapter configuration and report-model structure forms are assigned the wide variant. All other bounded forms use the default variant.

Modal content is a bounded flex column with persistent header and footer and a scrolling middle region. Dialog corners, viewport gutters and controls follow [design-language §2](design-language-spec.md#2-measurable-composition) and [§3](design-language-spec.md#3-control-treatments); drawers and full-screen tasks remain square. Pending submits retain their label and geometry with the reserved spinner slot; ongoing-action text belongs in the announced form/task status area. At narrow widths it fits the viewport with the shared gutters; at short heights/200% text the middle scrolls and all actions remain reachable. Labels are persistent; optional editable fields say Optional. Requiredness and constraints derive from the domain contract. Help precedes errors; errors are adjacent to their field and summarized for non-field failures.

Validate touched fields on blur, revalidate failed fields on change, and validate all fields on submit. Focus the first invalid field. Server rejection preserves editable values. Cancel precedes the action-specific submit button; confirmations name the action and consequence rather than using a generic Confirm label. Duplicate submission is disabled while pending; field values must not silently rebase during review.

Ordinary create/edit forms initially focus the first enabled editable field. While content loads, focus the heading; move to the first enabled editable field after loading only if focus has remained on that heading. Destructive confirmations initially focus Cancel. Their destructive command requires explicit activation of its confirmation button; Enter in a text field must not confirm implicitly.

Enter in an ordinary single-line field submits through the same validation path as the submit button. Multiline editors retain newline behavior; an open picker/select consumes Enter for its own operation. IME composition must not submit. Grading retains its feature-owned Enter/Shift+Enter navigation. Initial-focus rules do not replace first-invalid focus, pending-submit protection, dirty dismissal, topmost Escape handling or restoration to the invoking target.

#### Confirmation dialog contract

A confirmation reviews an existing operation and must not introduce a new command, permission or save unit. It must use a modal dialog, not a transient popover or native browser confirm. In order, it contains: an action-specific title; the affected record identity or explicit selection count/scope; a concise consequence and any irreversible effect; required prerequisites/reasons only when the feature contract requires them; persistent error or pending feedback; then Cancel and the action-specific final button. Missing or inaccessible target/consequence data must block confirmation and explain why; it must not be replaced with guessed values or an empty success.

Non-destructive and destructive confirmations both initially focus the cancellation control: Cancel, or Keep editing for a discard-changes review. Opening, focusing, pressing Enter in a reason field, dismissing or restoring a URL must never execute the command. Only explicit activation of the final button submits through validation and the existing authorization/revision checks. Ordinary create/edit forms retain their separate Enter-to-submit behavior. Confirmations must not add typed-name challenges or redundant confirmations unless the feature contract requires them. Bulk scope alone does not require a task workspace or imply atomic execution.

The cancellation control remains persistently reachable; confirmations must not duplicate it with a separate Close button. Before submission, Cancel (or Keep editing), Escape and outside dismissal all cancel the review without executing it and restore focus to the invoking control. Editable reasons follow the existing dirty-dismissal rule. During a bounded command awaiting its outcome, disable duplicate confirmation and dismissal, announce the pending action and retain the review. This rule does not change the separately defined ability to leave durable server jobs. A failed command retains the target, reasons and error with a safe explicit retry where supported; changed identity, permissions or revision requires fresh review. Confirmed success closes the confirmation and announces the outcome. A later refresh failure stays a saved outcome and offers a read retry, never a replay of the command. Existing partial-operation progress must remain explicit.

### 4.2 Focused task workspace

Imports, timetable generation, grade-entry sessions across students and class/session attendance recording use a URL-addressable full-screen task surface. It replaces ordinary inspection while active; it must not stack another drawer. It has context/name, Return/Close, a step or progress region when the task requires one, a flexible working region and persistent task actions. No unrelated navigation or competing primary action appears inside it.

The task must declare its unit of save, validation, pending work and completion. Presentation must not imply atomic batch save where commands are per-record, or create new batch APIs. Partial completion must identify saved versus unsaved work. Bulk archive/delete confirmation and a bounded selection applied to several records remain confirmations/forms, not workspaces merely due to record count.

Import closure stops UI polling, not scheduled server work; reopening resolves the batch and current state. Cancellation is a separate permission-gated domain command only where supported. Timetable generation retains its atomic selected-class contract. A grading/attendance entry session retains existing record/batch command and publication protections.

### 4.3 One drawer and return context

Only one drawer may be visible. Following a related record replaces its content, captures the originating record/tab and provides contextual Back. Back returns one inspection step; Close returns directly to the underlying collection, retaining its filters, sort, view, loaded position and focus target. A task/form above inspection returns to that same record/tab on completion or dismissal.

A direct-linked drawer/task has a canonical owning collection or specialized page as its return destination. Local return metadata must not be required to resolve the record. If an origin is deleted, inaccessible or in another invalid scope, return to the nearest authorized collection and explain the change.

Dirty dismissal, including Close, Back, backdrop and Escape, must ask Discard changes / Keep editing before navigation commits. A clean surface dismisses directly. After a confirmed save, failure to refresh must not revive a discard prompt for already saved values. An in-flight confirmed/indeterminate command must never be described as cancelled by closing UI.

## 5. States, permissions and accessibility

| State | Required presentation/action |
| --- | --- |
| Initial load | Skeleton for the assigned structure and accessible loading status; no fake counts |
| Background refresh | Keep valid same-scope content and indicate refresh without resetting selection/position |
| Loading more | Keep rows; trailing loading indicator |
| Load-more failure | Keep rows; localized failure and Retry for the next batch |
| No records | State the scoped entity collection is empty; name the available create action in its menu |
| No matches | State that search/filters found no matches; offer Clear search / Reset filters as applicable |
| No access | Explicit access state; no misleading empty collection or unauthorized mutation control |
| Unavailable | Unsupported or missing capability/historical data, distinct from denied access, failed requests and successful empty results; Retry only when a meaningful read or capability recheck exists |
| Load failure | Localized explanation and Retry; no fabricated empty success |
| Mutation failure | Inline form/task error plus feedback; preserve drafts and permit safe retry |
| Saved, refresh failed | Confirm saved outcome, explain stale display and offer read retry; never replay the write automatically |

Unauthorized actions must be hidden. Authorized actions prevented by current business state remain disabled with a visible/focus-accessible reason. Empty menus are omitted. Server eligibility remains authoritative, including direct-linked forms and changed contexts.

Every interactive target must meet [design-language §2](design-language-spec.md#2-measurable-composition). Every icon-only control has an accessible contextual name. Record activation is a real link (Enter); checkboxes toggle with Space; neither is nested inside another interactive target. Table row navigation must not replace native table semantics. Tab links follow document order, identify the current page, and wrap or scroll with keyboard access; the Filter trigger restores focus on dismissal. Menu triggers support Enter/Space and menu items support arrow navigation, Home/End and Escape. Keyboard order follows visual order. Menus use menu semantics, keyboard navigation, Escape and focus restoration; selection does not depend on hover. Dialogs contain focus and Escape affects only the topmost surface. Announce meaningful load/save/error changes without repeatedly reading the whole collection.

At 200% text and narrow/short viewports, essential content must wrap, controls must remain reachable, and no fixed text height may clip information. Use reduced-motion alternatives. Long tables, tabs and previews must provide keyboard-accessible overflow without hiding essential content.

## 6. Conformance

A feature must declare its collection and inspection purpose, required content, action scopes, editing/task surface, permissions, states and return behavior. Shared defaults in this contract apply without local restyling. Every specialized departure must use its named exception and preserve the remaining rules. A conforming screen must satisfy both its complete domain content contract and these presentation/interaction requirements.

### Flat module forms

Grade-level Subjects owns both module grouping and subject configuration. Module records use header actions and bounded URL-backed forms, without a detail drawer. Category filters remain independent. Subject inspection keeps its established drawer; report results keep their current inspection/publication workflow.
