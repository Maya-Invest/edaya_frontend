# UI ↔ API gap matrix

Living tracker for aligning `apps/webapp` with `@maya-invest/edaya-api-client`.  
Companion to [ui-architecture-reference.md](./ui-architecture-reference.md) §6 residual work.

**Statuses:** `open` · `in_progress` · `done` · `deferred` · `stale` (docs claimed open but already shipped)

| Domain | Gap type | API surface | UI file(s) | Status |
|--------|----------|-------------|------------|--------|
| Docs | docs | §3/§6/§9 shipped rows still sounding open | `ui-architecture-reference.md` | done |
| Docs | docs | Import plan Phase 20 catalog sync | `student-import-plan.md` | done |
| People | synthetic | Student fake email / status remap / attendance 100% | `people-data.ts` | done |
| People | synthetic | Guardian relation coercion | `people-data.ts` | done |
| Subjects | synthetic | hoursPerWeek invents coeff×2 / default 3 | `subjects-data.ts` | done |
| Finance | synthetic | Fee category NLP + invented period | `finance-data.ts` | done |
| School life | synthetic | Incident NLP; calendar fake descriptions | `school-life-data.ts` | done |
| Report cards | synthetic | `DEMO_SCHOOL_ID` | `report-cards-data.ts` | done |
| Logbook | synthetic | homework / fake objectives | session/teaching log types+UI | done |
| Curriculum | field | structured catalog chapters + ClassSubjectMatter dates/notes | `school.ts`, subjects/mutations | done |
| Curriculum | command | `setClassSubjectOffered`, grade-level update/remove | mutations + TeachingList | done |
| People | command | `upsertStudentHealthProfile` | StudentProfileTab | done |
| Report cards | command | `writeHomeroomReportComment` | ReportCardResultDetail | done |
| Finance | command | adjust/waive/cancel charge; reverse payment | billing-ops + BillingDetail | done |
| Finance | surface | service catalog Track E | fees/billing/payment/reconciliation | done |
| People | command | lifecycle / status | student-ops.mutations | done |
| Attendance | command | justification request/review | attendance-justification.mutations | done |
| Discipline | command | apply / update sanction status | incident.mutations | done |
| Assessments | command | complete / compliance / RC sections | evaluation.mutations | done |
| Catalog | behavior | catalog chapter sync to all classes of level | subject-matter.mutations | done |
| Migrate | migrate | schools/subjects/staffAssignments/schedules → commands | mutations + create helpers | done |
| Import | authz | modal per-type permission gates | DataImportModal | done |
| Import | behavior | classes attendanceMode documented default | classes/runner.ts | done |
| Authz | authz | `X-School-Id` multi-school | `browser-transport.ts` | deferred |
| Resources | surface | resource CRUD / assign | planning | deferred |
| Notifications | command | push devices / delivery materialize | — | deferred |

## Explicit deferrals

- Resources CRUD + assignment commands  
- Push device register/unregister  
- Delivery `recordDelivery` / `materializeDeliveries` / `applyDeliveryEvent`  
- Multi-school `X-School-Id` (backend Track D.3) — comment in `browser-transport.ts`  
- `linkActorSubject` / `relinkActorSubject` / `unlinkActorSubject` (invites cover v1)  
- `offerSubjectToClass` (grade-level + custom-class cover primary flows)
