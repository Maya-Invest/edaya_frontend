# School UI components

Domain-oriented folders under `components/school/`. Route pages import views from the matching domain.

| Folder | Examples |
|--------|----------|
| `shared/` | Drawer shell, drawer field helpers, `drawer-types`, `drawer-constants` |
| `students/` | `SchoolStudentsView`, `StudentTabs`, student modals |
| `guardians/` | `GuardiansView`, `GuardianDetail`, guardian forms |
| `academics/` | `HomeworkView`, `SubjectsView`, `ClassReportCardsView` |
| `scheduling/` | `PlanningView`, `AttendanceFlow` |
| `finance/` | `FinanceView`, `FeesView`, `PaymentsView`, `BillingDetail` |
| `configuration/` | `StaffView`, `RolesMatrixView`, report-card definitions |
| `school-life/` | `ActivitiesView`, `SchoolEventsView`, `IncidentDetail` |

Cross-domain imports should stay rare. Prefer lifting shared pieces into `shared/` when two domains need the same UI primitive.
