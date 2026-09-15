# Demo accounts (local dev)

> **Audience:** humans — local development and portal verification  
> **Not normative for agents**

Local seed defaults to the **demo-ci** dataset (`sch-edaya-ci-cocody`, Abidjan). Password for all dev accounts: `DevPassword1!`

Full fixture reference: [edaya_backend/tooling/fixtures/src/datasets/demo-ci/README.md](https://github.com/Maya-Invest/edaya_backend/blob/main/tooling/fixtures/src/datasets/demo-ci/README.md)

## Staff webapp

| Email | Role |
|-------|------|
| `a.kone@ecole-ci.edaya.dev` | School owner (DO scene — permission-gated routes) |
| `j.aka@ecole-ci.edaya.dev` | Deputy director (staff workspace; primary dry-run login) |
| `f.assi@ecole-ci.edaya.dev` | Staff coordinator / homeroom staff (`homeroomStaffId`) |

## Portal teachers (seed fixtures)

These accounts are **`Teacher`** entities in the seed. Staff manage them in the webapp (School → Teachers). They appear on timetables and assignment tabs during demo scenes D3 and D5.

| Email | Teacher ID | Notes |
|-------|------------|-------|
| `a.toure@ecole-ci.edaya.dev` | `ci-t1` | Maths — 6ème 1, 5ème 1 |
| `k.diomande@ecole-ci.edaya.dev` | `ci-t2` | Portal homeroom — 6ème 2 |

After backend permission or assignment changes, verify portal teacher labels still resolve in the staff webapp (timetable grid, teacher drawer).

## Seed commands

```sh
# Terminal 1 — API
cd edaya_backend && bun dev

# Terminal 2 — once API is ready
cd edaya_backend && bun seed:clean --yes && bun seed:init

# Terminal 3 — webapp
cd edaya_web/apps/webapp && bun dev
```

## Pre-demo verification

```sh
cd edaya_web/apps/webapp
bun run check
bun test tests/lib tests/generated
bun run demo:e2e   # client walkthrough; results in .demo-dry-run/
```

App integration tests are not this walkthrough:

| Command | What it covers |
|---------|----------------|
| `bun run test:integration:onboarding` | Empty APIs, UI signup → wizard → `POST /provision` → dashboard |
| `bun run test:integration:provisioned` | Empty APIs, API tenant + owner journey + QA matrix |

**Playwright scenes:** D0–D11 (core), DR (route coverage), DC (list shell), DD (drawer tabs), DM (modal URL), **DI** (import upload/validate), **DT** (timetable generation modal), **DG** (guardian drawer), **DF** (finance billing drawer), **DO** (owner permissions).

Harness source: `apps/webapp/tests/integration/demo-dry-run/` · CLI: `apps/webapp/scripts/demo-dry-run.ts`
