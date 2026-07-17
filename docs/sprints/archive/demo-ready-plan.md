# Demo-Ready — Staff Webapp Sprint Plan

> **Status:** **Active** — demo script & dry-run only  
> **Created:** 2026-07-06  
> **Goal:** Every screen in the **demo script** works reliably against **demo-ci** seed  
> **Backlog (non-demo carry-over):** [remaining-work-plan.md](./remaining-work-plan.md)  
> **Archived history:** [v1](./archive/v1-staff-webapp-implementation-plan.md) · [backend-alignment](./archive/backend-alignment-plan.md) · [svelte-state](./archive/svelte-state-alignment.md)

**Normative specs (unchanged):** [feature-architecture-spec.md](../specs/feature-architecture-spec.md) · [app-shell-spec.md](../specs/app-shell-spec.md) · [demo-accounts.md](../reference/demo-accounts.md)

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
| Staff login (primary) | `j.aka@ecole-ci.edaya.dev` — deputy director |
| Staff login (owner) | `a.kone@ecole-ci.edaya.dev` |
| Staff login (homeroom) | `f.assi@ecole-ci.edaya.dev` — homeroom coordinator (DN scene) |
| Portal teacher (seed fixture) | `a.toure@ecole-ci.edaya.dev` (`ci-t1`) — maths 6ème A / 5ème A; appears on timetable and in School → Teachers |

See [demo-accounts.md](../reference/demo-accounts.md) for the full account table.

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
bun run check                              # svelte-check + test tsconfig
bun test tests/lib tests/generated         # unit tests (303+)
bun run test:integration                   # Playwright dry-run (needs API + seed + :5173)
# or: bun run demo:e2e
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

- [x] **D0** Scene 0 passes *(automated)*

### Scene 1 — Director dashboard

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | `/dashboard` | KPI cards load (fees, report cards, incidents, etc.) |
| 1.2 | Click a dashboard action link | Navigates to real list (no 404) |

- [x] **D1** Scene 1 passes *(automated 1.1–1.2; spot-check action items if KPIs are zero)*

### Scene 2 — School roster & student 360

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | School → Students | List loads (30 students); search works |
| 2.2 | Open student drawer (e.g. **Kouamé Aya** / `ci-s1`) | Profile + tabs visible |
| 2.3 | Tabs: Enrollments · Grades · Attendance | Data or sensible empty states |
| 2.4 | Guardians list + drawer | Linked guardian visible |

- [x] **D2** Scene 2 passes *(automated 2.1–2.2, 2.4; manual: student 360 tabs 2.3)*

### Scene 3 — Teachers (portal model)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | School → **Teachers** | List shows portal teachers |
| 3.2 | Open **Mme Touré** (`ci-t1`) | Profile + assignments tab |
| 3.3 | Assignments | Maths on 6ème A / 5ème A visible |
| 3.4 | Account linking section | Invite status (linked or pending) |

- [x] **D3** Scene 3 passes *(automated 3.1–3.2; manual: assignments 3.3–3.4)*

### Scene 4 — Staff & permissions

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | School → Staff → open a member | Drawer with Permissions tab |
| 4.2 | Permissions tab | List loads; add/edit via modal |
| 4.3 | Assign or revoke a permission | Toast + list updates |

- [x] **D4** Scene 4 passes *(automated 4.1 list; manual: permissions tab 4.2–4.3)*

### Scene 5 — Class 6ème A — timetable & teachers on grid

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Classes → **6ème A** → Timetable | Week grid loads |
| 5.2 | Maths slot | Label shows **Mme Touré** (portal teacher, not legacy staff) |
| 5.3 | Open session drawer | Session detail + logbook tab |
| 5.4 | New session wizard (if shown) | Creates lesson on grid |

- [x] **D5** Scene 5 passes *(automated 5.1–5.2; manual: session drawer 5.3–5.4)*

### Scene 6 — Evaluations (homework folded in)

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Classes → 6ème A → Evaluations | List with kind filter |
| 6.2 | Filter homework | Homework rows + kind badge |
| 6.3 | Open assessment drawer | Kind-specific body section |

- [x] **D6** Scene 6 passes *(automated 6.1; manual: homework filter + drawer 6.2–6.3)*

### Scene 7 — Daily attendance (6ème B — daily mode)

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Classes → **6ème B** → Attendance tab visible | Nav only when `attendanceMode = daily` |
| 7.2 | Day list + drawer | Records editable per permissions |

- [x] **D7** Scene 7 passes *(automated 7.1 on 6ème B)*

### Scene 8 — School life

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Activities → open a club | Enrollment roster |
| 8.2 | Add / approve enrollment | `enrollStudentInActivity` works |
| 8.3 | Announcements | List + drawer |
| 8.4 | Incidents → Resolve modal | Multi-student + sanctions atomic resolve |

- [x] **D8** Scene 8 passes *(automated 8.1, 8.3–8.4; manual: enrollment 8.2)*

### Scene 9 — Finance

| Step | Action | Expected |
|------|--------|----------|
| 9.1 | Finance → Fees | List + row menu edit |
| 9.2 | Finance → Payments | Filters; receipt links to billing drawer |
| 9.3 | Billing drawer | Installments visible (XOF) |

- [x] **D9** Scene 9 passes *(automated 9.1–9.3)*

### Scene 10 — Report cards

| Step | Action | Expected |
|------|--------|----------|
| 10.1 | Classes → 6ème A → Report cards | T1 bulletins list |
| 10.2 | Open a bulletin | Grades + comments load |

- [x] **D10** Scene 10 passes *(automated 10.1; manual: open bulletin 10.2)*

### Scene 11 — Configuration

| Step | Action | Expected |
|------|--------|----------|
| 11.1 | Configuration → Classes → 6ème A drawer | Portal homeroom teacher + staff coordinator |
| 11.2 | Grade levels | CRUD via modals |
| 11.3 | Academic calendar | Period definitions under year accordion |
| 11.4 | Disciplinary catalog | Simple list + row menu |

- [x] **D11** Scene 11 passes *(automated 11.1–11.4)*

---

## Automated harness (beyond presenter script)

The integration harness exercises additional scenes not in the live demo walkthrough. Entry points:

| Command | Purpose |
|---------|---------|
| `bun run demo:e2e` | CLI shim → headless Playwright dry-run |
| `bun run test:integration` | Same harness via `bun:test` (600s timeout) |

**Layout:** `apps/webapp/tests/integration/demo-dry-run/` (scenes + support) · CLI: `apps/webapp/scripts/demo-dry-run.ts` · Artifacts: `apps/webapp/.demo-dry-run/`

| Group | Purpose | Notes |
|-------|---------|-------|
| **D0–D11** | Core demo script | Primary presenter path |
| **DC1–DC10** | List shell / FilterPanel polish | DC9–DC10 may skip on permission-gated pages |
| **DD** | Drawer tab URL sync | Class, student, teacher, staff, subject drawers |
| **DM** | Modal URL sync | Create/edit modals strip `?modal=` on close |
| **DN** | Homeroom attendance nudge | `f.assi@` dashboard → deep-link to class attendance |

**Latest run:** **98 steps** — **96 pass · 0 fail · 2 skip** (DC9/DC10 may skip when catalog loads return 403).

Harness hardening: D8 asserts seeded activity text (`Club Robotique|Chorale scolaire`); uncaught `pageerror` fails steps (extension noise filtered).

---

## Demo readiness summary

| Scene | Module | Risk | Notes |
|-------|--------|------|-------|
| D0–D1 | Auth · Dashboard | Low | Shell + deep-links fixed |
| D2 | Students | Low | Infinite list + drawer shipped |
| D3 | Teachers | Low | Portal teacher model verified |
| D4 | Staff permissions | Low | List automated; modal flows manual |
| D5 | Timetable | Low | Mme Touré on grid (D5.2 automated) |
| D6 | Evaluations | Low | Homework fold complete |
| D7 | Daily attendance | Low | 6ème B daily mode automated |
| D8 | Activities · Incidents | Low | Optional 403s tolerated on load |
| D9 | Finance | Low | Resilient finance loaders |
| D10 | Report cards | Low | List automated; drawer manual |
| D11 | Configuration | Low | Homeroom dual model documented |

**Demo-ready** = scenes D0–D11 pass one uninterrupted dry-run (manual spot-checks per scene notes above).

---

## Open work (demo sprint only)

Implementation tasks live in [remaining-work-plan.md](./remaining-work-plan.md) **Track A**. This table tracks demo milestones only.

| ID | Task | Scene | Status |
|----|------|-------|--------|
| **DR.1** | Full dry-run Scenes 0–11; log failures | All | **Done** (2026-07-06) |
| **DR.2** | Fix Track A demo blockers; re-run dry-run | All | **Done** — **96/98** pass (2 skipped) |
| **DR.3** | Logbook: empty subject-matter copy OR seed | D5 | **Done** — seed + `SubjectTabs` chapters CRUD (`configureSubjectMatter`) |
| **DR.4** | Dashboard deep-links | D1 | **Done** — `dashboard-links.ts` + stale `6a` → `ci-6a` |
| **DR.5** | Fresh seed procedure in [demo-accounts.md](../reference/demo-accounts.md) | Env | **Done** |
| **DR.6** | Presenter script (5 / 15 / 30 min) | Presenter | **Done** — see below |

### Not in this plan

See [remaining-work-plan.md](./remaining-work-plan.md) Tracks B–E (ListFilters rollout, v1 polish, blocked API, post-v1).

---

## Progress tracker

### Foundation (already shipped — do not re-open)

- [x] V1 shell Phases 0–8 ([archive](./archive/v1-staff-webapp-implementation-plan.md))
- [x] Backend alignment Phases 0–4 + tests ([archive](./archive/backend-alignment-plan.md))
- [x] Svelte state P0 + pilots ([archive](./archive/svelte-state-alignment.md))
- [x] Unit tests — `bun test tests/lib tests/generated` (303+ pass)

### Demo sprint (active)

- [x] **DR.1** Dry-run complete; failure log attached below
- [x] **DR.2** All P0 failures fixed — `bun run demo:e2e` **96 pass · 0 fail · 2 skip**
- [x] Scenes **D0–D11** checked (automated core + manual notes per scene)
- [x] **DR.5** Seed procedure documented in demo-accounts.md
- [x] **DR.6** Presenter script below
- [x] Harness expanded — **DC**, **DD**, **DM**, **DN** scenes (TypeScript integration suite)

#### Dry-run failure log

Automated run: `bun run demo:e2e` (Playwright headless, webapp `:5173`, demo login `j.aka@`). Scenes **D0–D11**, **DC1–DC10**, **DD**, **DM**, **DN**. Screenshots + `results.json` under `apps/webapp/.demo-dry-run/`.

| Date | Scene | Issue | Fix PR |
|------|-------|-------|--------|
| 2026-07-06 | D0, D1 | `bootstrapAppShell` 403 on `gradeLevels.list` — academic context empty; dashboard shows error state | DR.2 |
| 2026-07-06 | D2, D3 | `ListFiltersState`: `bind:value={undefined}` before `hydrate()` — Svelte `props_invalid_value` crash in `SchoolStudentsView` / `TeachersView` | DR.2 |
| 2026-07-06 | D2 | Student drawer `/school/students/ci-s1` — error state (likely cascade from filter crash + drawer hydration) | DR.2 |
| 2026-07-06 | D3 | Teacher drawer `/school/teachers/ci-t1` — Touré label not found in viewport | DR.2 — verify after filter fix |
| 2026-07-06 | D5–D7, D10 | Class module pages — no content / timeout (empty `academicContext.classes` after shell 403; sidebar `Missing parameter classId` for nav placeholder `6a`) | DR.2 |
| 2026-07-06 | D8 | Announcements + incidents/events — error copy on page | DR.2 — permissions or route load |
| 2026-07-06 | D9 | Finance fees / payments / billing — error copy (403 on finance APIs for `j.aka@`?) | DR.2 |
| 2026-07-06 | — | **Passed:** full automated dry-run after Track A fixes — see `apps/webapp/.demo-dry-run/results.json` | DR.2 |

---

## Presenter script (DR.6)

Login: **`j.aka@ecole-ci.edaya.dev`** / `DevPassword1!` · school **Cocody** · class **`ci-6a`** (6ème A).

### 5 minutes — executive snapshot

1. **D0** Login → dashboard KPIs (students, overdue fees, incidents).
2. **D2** School → Students → open **Kouamé Aya** drawer (student 360 headline).
3. **D5** Classes → 6ème A → Timetable → point at **Maths / Mme Touré** (portal teacher).
4. **D9** Finance → Fees (one row) → Billing installments.

### 15 minutes — school operations

Add to the 5-min path:

5. **D3** Teachers → **Mme Touré** → assignments (maths 6ème A).
6. **D6** 6ème A → Evaluations (homework kind in list).
7. **D7** 6ème B → Attendance (daily mode).
8. **D8** Activities + Announcements + Incidents (resolve modal if time).
9. **D10** 6ème A → Report cards list.
10. **D11** Configuration → Classes → 6ème A drawer (homeroom + coordinator).

### 30 minutes — full walkthrough

All scenes **D0–D11** in script order, including **D4** staff permissions tab.

**Pre-demo:** `bun seed:clean --yes && bun seed:init` · `bun run demo:e2e`

---

## Verification checklist (merge gate)

Before calling the webapp demo-ready:

1. [ ] `bun seed:clean && bun seed:init` on clean DB *(day-of)*
2. [x] `bun run check` green
3. [x] `bun test tests/lib tests/generated` green
4. [x] Automated dry-run green (`bun run demo:e2e` or `bun run test:integration`)
5. [ ] No console errors on critical paths *(optional 403 on enrichment reads OK)*
6. [ ] FR locale spot-check (demo language)

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
| 2026-07-06 | DR.2 complete — automated dry-run; scenes D0–D11 checked; presenter script + dashboard deep-links |
| 2026-07-06 | Reassessed — TypeScript integration harness (DC/DD/DM/DN); 92/96 pass; removed mobile cross-demo; updated commands |
| 2026-07-06 | Closed DR.3 + merge gate check/tests; harness **96/98**; D6/D10 automation added |
