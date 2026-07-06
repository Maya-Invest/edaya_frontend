# Demo-Ready — Staff Webapp Sprint Plan

> **Status:** **Active** — demo script & dry-run only  
> **Created:** 2026-07-06  
> **Goal:** Every screen in the **demo script** works reliably against **demo-ci** seed  
> **Backlog (non-demo carry-over):** [remaining-work-plan.md](./remaining-work-plan.md)  
> **Archived history:** [v1](./archive/v1-staff-webapp-implementation-plan.md) · [backend-alignment](./archive/backend-alignment-plan.md) · [svelte-state](./archive/svelte-state-alignment.md)

**Normative specs (unchanged):** [v1-feature-architecture-spec.md](../specs/v1-feature-architecture-spec.md) · [app-shell-spec.md](../specs/app-shell-spec.md) · [demo-accounts.md](../reference/demo-accounts.md)

---

## Why this plan exists

Three sprint plans ran in parallel and overlapped:

| Former plan | Original goal | Outcome (2026-07-06) |
|-------------|---------------|------------------------|
| **v1 staff webapp** (Phases 0–8) | Ship v1 interaction shell + routes | ✅ Complete |
| **Backend alignment** (Phases 0–4, T) | Close API drift (teachers, configure-*) | ✅ Complete |
| **Svelte state alignment** (SS 0–4) | Tier-2 state + list filter primitive | ✅ P0 complete |

**What remains for the demo** is proving the script path. **Everything else** (state rollout, v1 polish, blocked API items) is tracked in [remaining-work-plan.md](./remaining-work-plan.md).

---

## Demo environment

### Seed & accounts

| Item | Value |
|------|--------|
| Dataset | **demo-ci** (`sch-edaya-ci-cocody`, Abidjan) |
| Password | `DevPassword1!` |
| Staff login (primary) | `j.aka@ecole-ci.edaya.dev` — deputy director (**staff webapp only**) |
| Staff login (owner) | `a.kone@ecole-ci.edaya.dev` |
| Portal teacher (**teacher app**, not webapp) | `a.toure@ecole-ci.edaya.dev` — maths 6ème A / 5ème A |
| Parent (mobile, optional) | `m.kone@mail.ci` |

### Bootstrap (day before demo)

```sh
# Terminal 1
cd edaya_backend && bun dev

# Terminal 2 — once API is ready
cd edaya_backend && bun seed:clean --yes && bun seed:init

# Webapp
cd edaya_web/apps/webapp && bun dev
```

### Automated checks (before every demo dry-run)

```sh
cd edaya_web/apps/webapp
bun run check          # 0 svelte-check errors
bun test tests         # 253+ tests
```

---

## Demo script (scenes)

Walk through in order. Each scene has a **readiness** checkbox — check only after a full dry-run passes.

### Scene 0 — Login & shell

| Step | Action | Expected |
|------|--------|----------|
| 0.1 | Open webapp → login `j.aka@` | Lands on dashboard; no auth errors |
| 0.2 | Academic year / school selector | Cocody school loaded |
| 0.3 | Sidebar navigation | All demo modules reachable |

- [ ] **D0** Scene 0 passes

### Scene 1 — Director dashboard

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | `/dashboard` | KPI cards load (fees, report cards, incidents, etc.) |
| 1.2 | Click a dashboard action link | Navigates to real list (no 404) |

- [ ] **D1** Scene 1 passes

### Scene 2 — School roster & student 360

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | School → Students | List loads (30 students); search works |
| 2.2 | Open student drawer (e.g. **Kouamé Aya** / `ci-s1`) | Profile + tabs visible |
| 2.3 | Tabs: Enrollments · Grades · Attendance | Data or sensible empty states |
| 2.4 | Guardians list + drawer | Linked guardian visible |

- [ ] **D2** Scene 2 passes

### Scene 3 — Teachers (portal model)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | School → **Teachers** | List shows portal teachers |
| 3.2 | Open **Mme Touré** (`ci-t1`) | Profile + assignments tab |
| 3.3 | Assignments | Maths on 6ème A / 5ème A visible |
| 3.4 | Account linking section | Invite status (linked or pending) |

- [ ] **D3** Scene 3 passes

### Scene 4 — Staff & permissions

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | School → Staff → open a member | Drawer with Permissions tab |
| 4.2 | Permissions tab | List loads; add/edit via modal |
| 4.3 | Assign or revoke a permission | Toast + list updates |

- [ ] **D4** Scene 4 passes

### Scene 5 — Class 6ème A — timetable & teachers on grid

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Classes → **6ème A** → Timetable | Week grid loads |
| 5.2 | Maths slot | Label shows **Mme Touré** (portal teacher, not legacy staff) |
| 5.3 | Open session drawer | Session detail + logbook tab |
| 5.4 | New session wizard (if shown) | Creates lesson on grid |

- [ ] **D5** Scene 5 passes

### Scene 6 — Evaluations (homework folded in)

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Classes → 6ème A → Evaluations | List with kind filter |
| 6.2 | Filter homework | Homework rows + kind badge |
| 6.3 | Open assessment drawer | Kind-specific body section |

- [ ] **D6** Scene 6 passes

### Scene 7 — Daily attendance (6ème B — daily mode)

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Classes → **6ème B** → Attendance tab visible | Nav only when `attendanceMode = daily` |
| 7.2 | Day list + drawer | Records editable per permissions |

- [ ] **D7** Scene 7 passes *(skip if demo uses session-mode class only)*

### Scene 8 — School life

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Activities → open a club | Enrollment roster |
| 8.2 | Add / approve enrollment | `enrollStudentInActivity` works |
| 8.3 | Announcements | List + drawer |
| 8.4 | Incidents → Resolve modal | Multi-student + sanctions atomic resolve |

- [ ] **D8** Scene 8 passes

### Scene 9 — Finance

| Step | Action | Expected |
|------|--------|----------|
| 9.1 | Finance → Fees | List + row menu edit |
| 9.2 | Finance → Payments | Filters; receipt links to billing drawer |
| 9.3 | Billing drawer | Installments visible (XOF) |

- [ ] **D9** Scene 9 passes

### Scene 10 — Report cards

| Step | Action | Expected |
|------|--------|----------|
| 10.1 | Classes → 6ème A → Report cards | T1 bulletins list |
| 10.2 | Open a bulletin | Grades + comments load |

- [ ] **D10** Scene 10 passes

### Scene 11 — Configuration

| Step | Action | Expected |
|------|--------|----------|
| 11.1 | Configuration → Classes → 6ème A drawer | Portal homeroom teacher + staff coordinator |
| 11.2 | Grade levels | CRUD via modals |
| 11.3 | Academic calendar | Period definitions under year accordion |
| 11.4 | Disciplinary catalog | Simple list + row menu |

- [ ] **D11** Scene 11 passes

### Scene 12 — Portal teacher mobile *(optional cross-demo)*

| Step | Action | Expected |
|------|--------|----------|
| 12.1 | Teacher app login `a.toure@` | No staff webapp access |
| 12.2 | Timetable / session | Matches webapp teacher labels |

- [ ] **D12** Scene 12 passes *(if mobile in demo scope)*

---

## Demo readiness summary

| Scene | Module | Risk | Notes |
|-------|--------|------|-------|
| D0–D1 | Auth · Dashboard | Low | Shell complete |
| D2 | Students | Low | Infinite list + drawer shipped |
| D3 | Teachers | Low | New in backend-alignment — verify assignments |
| D4 | Staff permissions | Low | `assignStaffPermission` migrated |
| D5 | Timetable | **Medium** | Teacher display + logbook (subject matters may be empty) |
| D6 | Evaluations | Low | Homework fold complete |
| D7 | Daily attendance | Medium | Only on `daily` classes — confirm which class in script |
| D8 | Activities · Incidents | Low | Enrollment command wired |
| D9 | Finance | Low | Simple entities complete |
| D10 | Report cards | Medium | 30 T1 results in seed — verify publish state |
| D11 | Configuration | Low | Homeroom dual model documented |
| D12 | Teacher mobile | **Separate repo** | `edaya_mobile/apps/teacher` |

**Demo-ready** = all checked scenes in scope pass one uninterrupted dry-run.

---

## Open work (demo sprint only)

Implementation tasks live in [remaining-work-plan.md](./remaining-work-plan.md) **Track A**. This table tracks demo milestones only.

| ID | Task | Scene | Status |
|----|------|-------|--------|
| **DR.1** | Full dry-run Scenes 0–11; log failures | All | **Done** (2026-07-06) |
| **DR.2** | Fix Track A demo blockers; re-run dry-run | All | **Done** — 24/25 automated (D5.2 teacher label on grid) |
| **DR.3** | Logbook: empty subject-matter copy OR seed | D5 | — |
| **DR.4** | Dashboard deep-links | D1 | — |
| **DR.5** | Fresh seed procedure in [demo-accounts.md](../reference/demo-accounts.md) | Env | — |
| **DR.6** | Presenter script (5 / 15 / 30 min) | Presenter | — |

### Not in this plan

See [remaining-work-plan.md](./remaining-work-plan.md) Tracks B–E (ListFilters rollout, v1 polish, blocked API, post-v1).

---

## Progress tracker

### Foundation (already shipped — do not re-open)

- [x] V1 shell Phases 0–8 ([archive](./archive/v1-staff-webapp-implementation-plan.md))
- [x] Backend alignment Phases 0–4 + tests ([archive](./archive/backend-alignment-plan.md))
- [x] Svelte state P0 + pilots ([archive](./archive/svelte-state-alignment.md))
- [x] `bun run check` — 0 errors · `bun test tests` — 253 pass (2026-07-06)

### Demo sprint (active)

- [x] **DR.1** Dry-run complete; failure log attached below
- [ ] **DR.2** All P0 failures fixed
- [ ] Scenes **D0–D11** checked (adjust list if demo scope is shorter)
- [ ] **DR.5** Seed procedure verified day-of-demo
- [ ] **DR.6** Presenter script (short / full)

#### Dry-run failure log

Automated run: `apps/webapp/scripts/demo-dry-run.mjs` (Playwright headless, webapp `:5173`, demo login `j.aka@`). Screenshots + `results.json` under `apps/webapp/.demo-dry-run/`.

| Date | Scene | Issue | Fix PR |
|------|-------|-------|--------|
| 2026-07-06 | D0, D1 | `bootstrapAppShell` 403 on `gradeLevels.list` — academic context empty; dashboard shows error state | DR.2 |
| 2026-07-06 | D2, D3 | `ListFiltersState`: `bind:value={undefined}` before `hydrate()` — Svelte `props_invalid_value` crash in `SchoolStudentsView` / `TeachersView` | DR.2 |
| 2026-07-06 | D2 | Student drawer `/school/students/ci-s1` — error state (likely cascade from filter crash + drawer hydration) | DR.2 |
| 2026-07-06 | D3 | Teacher drawer `/school/teachers/ci-t1` — Touré label not found in viewport | DR.2 — verify after filter fix |
| 2026-07-06 | D5–D7, D10 | Class module pages — no content / timeout (empty `academicContext.classes` after shell 403; sidebar `Missing parameter classId` for nav placeholder `6a`) | DR.2 |
| 2026-07-06 | D8 | Announcements + incidents/events — error copy on page | DR.2 — permissions or route load |
| 2026-07-06 | D9 | Finance fees / payments / billing — error copy (403 on finance APIs for `j.aka@`?) | DR.2 |
| 2026-07-06 | — | **Passed:** login, school students list, guardians, teachers list, staff list, configuration (classes, grade-levels, academic, discipline) | — |

---

## Verification checklist (merge gate)

Before calling the webapp demo-ready:

1. [ ] `bun seed:clean && bun seed:init` on clean DB
2. [ ] `bun run check` + `bun test tests` green
3. [ ] Scenes in scope checked above
4. [ ] No console errors on critical paths
5. [ ] FR locale spot-check (demo language)

---

## References

| Doc | Use |
|-----|-----|
| [demo-accounts.md](../reference/demo-accounts.md) | Logins |
| [ui-architecture-reference.md](../reference/ui-architecture-reference.md) | Feature catalog (may lag — trust dry-run) |
| [demo-ci README](../../../edaya_backend/tooling/fixtures/src/datasets/demo-ci/README.md) | Seed coverage |
| Archived plans | [./archive/](./archive/) |

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-06 | Created — consolidates v1 + backend-alignment + svelte-state into demo-focused plan; archives prior sprint docs |
