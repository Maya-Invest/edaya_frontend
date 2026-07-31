# Onboarding navigation + step-4 edit (archived)

> **Status:** Complete  
> **Scope:** Fix wizard Back / stepper; enable step-4 Modifier; enrich school summary (year + periods) as tables  
> **Package:** `edaya_web/apps/webapp` onboarding  
> **Merged from:** `.cursor/plans/fix_onboarding_back_59648fc9.plan.md` + follow-up iterations (Modifier / school tables)  
> **Related:** [onboarding-step4-summary-plan.md](./onboarding-step4-summary-plan.md) (summary UI; Edit/Back were deferred there)

## Goal

Make step navigation and step-4 review usable end-to-end: **Précédent** / stepper work, **Modifier** jumps to the matching step, and the school panel shows academic year + periods in a clean table layout.

---

## Phase A — Fix Previous (Précédent) / unbound handlers

### Why it failed

In [`+page.svelte`](../../../apps/webapp/src/routes/onboarding/+page.svelte), handlers were inconsistent:

```svelte
onBack={wizard.goBack}                          <!-- broken: unbound -->
onContinue={() => void wizard.goNext()}         <!-- works -->
onSkip={wizard.skipStep}                        <!-- broken -->
onStepSelect={wizard.navigateToStep}            <!-- broken -->
```

`goBack` / `navigateToStep` / `skipStep` are class methods on `OnboardingWizardState`. Passing them unbound drops `this` when [`OnboardingShell`](../../../apps/webapp/src/lib/components/onboarding/OnboardingShell.svelte) calls `onclick={onBack}` → runtime error → button appears dead.

### Fix

Wrap all wizard methods via arrows:

- `onBack={() => wizard.goBack()}`
- `onSkip={() => wizard.skipStep()}`
- `onStepSelect={(step) => wizard.navigateToStep(step)}`

Navigation logic in `goBack` / `previousOnboardingStep` was already correct.

### Todos (Phase A) — all done

- [x] Bind `onBack`, `onSkip`, `onStepSelect` with arrow functions in `onboarding/+page.svelte`
- [x] Verify Previous, stepper clicks, and Skip on `/onboarding`

---

## Phase B — Enable Modifier + school year / period info

### Modifier buttons

Step-4 Edit buttons were `disabled` with `editSoon`. Wire each to its step via wizard context:

- School → `navigateToStep(1)`
- Structure → `navigateToStep(2)`
- Team → `navigateToStep(3)`

In [`OnboardingStepCompleteForm.svelte`](../../../apps/webapp/src/lib/components/onboarding/OnboardingStepCompleteForm.svelte): `getOnboardingWizardState()` + `goToStep(1|2|3)`.

### School panel enrichment

Extend [`complete-step-summary.ts`](../../../apps/webapp/src/lib/onboarding/complete-step-summary.ts):

- `academicYearLabel`, `academicYearRange`
- `periodTypeLabelKey` (`trimester` | `semester`)
- `periods: Array<{ label, start, end }>`

Show them on the school section (i18n: reuse school/period labels; add `onboarding.complete.periodsHeading`). Update unit tests.

### Todos (Phase B) — all done

- [x] Enable Modifier → steps 1 / 2 / 3
- [x] Extend summary with academic year + periods; render on step 4; i18n + tests

---

## Phase C — School panel as tables

### Problem after Phase B

School infos were correct but stacked as loose paragraphs / list — harder to scan than Structure / Team tables.

### Chosen visual

Two compact tables in the school card (same `text-xs` / row border style as Team):

1. **Details** (label | value): establishment, academic year (+ muted date range), period type  
2. **Periods** (if any): Period | Start | End  

Period rows use `{ label, start, end }` (not a combined range string).

### Todos (Phase C) — all done

- [x] Rewrite school section body as details + periods tables
- [x] Align `complete-step-summary` period shape + tests; autofixer clean

---

## Out of scope (still)

- Re-submitting already-applied school/structure/staff API payloads when editing after submit (draft edit + continue path only).
- Changing shell width or finish CTA.
- Restoring a post-dashboard checklist.
