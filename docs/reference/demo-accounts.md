# Demo accounts (local dev)

Local seed defaults to the **demo-ci** dataset (`sch-edaya-ci-cocody`, Abidjan). Password for all dev accounts: `DevPassword1!`

Full fixture reference: [edaya_backend/tooling/fixtures/src/datasets/demo-ci/README.md](https://github.com/Maya-Invest/edaya_backend/blob/main/tooling/fixtures/src/datasets/demo-ci/README.md)

## Staff webapp

| Email | Role |
|-------|------|
| `a.kone@ecole-ci.edaya.dev` | School owner |
| `j.aka@ecole-ci.edaya.dev` | Deputy director (staff workspace) |
| `f.assi@ecole-ci.edaya.dev` | Staff coordinator / homeroom staff (`homeroomStaffId`) |

## Portal teachers (sign in via teacher mobile app)

These accounts are **`Teacher`** entities with `kind: teacher` invitations. Staff manage them in the webapp (School → Teachers); they **sign in** in the teacher Flutter app.

| Email | Teacher ID | Notes |
|-------|------------|-------|
| `a.toure@ecole-ci.edaya.dev` | `ci-t1` | Maths — 6ème A, 5ème A |
| `k.diomande@ecole-ci.edaya.dev` | `ci-t2` | Portal homeroom — 6ème B |

Run `edaya_mobile/apps/teacher` to verify portal teacher authorization after backend permission or assignment changes.

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
bun test tests
node scripts/demo-dry-run.mjs   # 26 automated steps; results in .demo-dry-run/
```
