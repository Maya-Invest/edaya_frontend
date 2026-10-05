# Teacher Unavailability and Timetable Generation UI

> **Lifecycle:** archived — implemented scope reconciled  
> **Application:** `apps/webapp`  
> **Prerequisite:** Backend entity, generation commands, publication commands, and generated API client contracts are available.

## Delivered scope

Availability lives under the teacher drawer with year-scoped tab state and permission-gated save/delete actions. School timetable generation, review and class-by-class publication live in Configuration Tools. Class calendar and session workflows remain under the class timetable route; reusable date and placement helpers stay shared.

The original proposal below is historical. Its class generation toolbar and positive-availability ideas are superseded by the current Tools workflow and are not unfinished cleanup work. No new product controls, bulk publication or backend behavior are introduced by this cleanup.

## Teacher Unavailability

- Extend teacher route state with academic-year-scoped rules, tab loading, optimistic save/delete, rollback, and version invalidation.
- Add weekly and one-off sections with exact times, effective dates, reason, status, and create/edit/disable/delete controls.
- Use a segmented recurring/one-off form with strict interval and academic-year validation.
- Limit visibility to staff with `ACCESS_CONTROL_ASSIGN` or `SCHOOL_STRUCTURE_CONFIGURE`; writes require `ACCESS_CONTROL_ASSIGN`.
- Bump teacher-unavailability and planning versions after writes.

## Class Timetable

- Introduce route-owned timetable state and remove timetable-route reads from `detailDataContext` while preserving current planning interactions.
- Add a permission-gated generation toolbar with academic-period defaults, custom dates, draft/published counts, and generate/publish/republish actions.
- Put workload enforcement, break exclusion, spacing, preferred periods, and per-subject workload overrides in a collapsed advanced section.
- Refetch aggregate planning data after commands; render generated drafts distinctly and show returned placements and unmet workload diagnostics.
- Default publish to atomic `fail`, offer `skip`, and make republish preservation rules explicit.
- Show active assigned-teacher constraints for the visible week in a compact panel rather than blocking the whole class calendar.

## School Workspace

- Add a Configuration Tools hub card and route-owned state for `/configuration/tools`.
- Show classes ordered by grade level then name with draft/published counts, transient generation diagnostics, review, and individual publish actions.
- Generate all classes with one command and refetch persisted sessions afterward.
- Do not add bulk publication; review and publish each class independently.

## Verification

- Cover teacher routes, form validation, permissions, optimistic rollback, and academic-year reloads.
- Cover class command payloads, date defaults, draft styling, diagnostics, publish policies, republish, and invalidation.
- Cover school ordering, generation, status refresh, class-by-class publication, and review navigation.
- Verify desktop and mobile-width layouts and run `bun run verify`.

## Assumptions

- Backend contracts remain unchanged and API date/time handling remains UTC.
- Teacher self-service, mobile UI, activity/assessment generation, rooms, positive availability preferences, stored solver runs, and bulk school publication are out of scope.
