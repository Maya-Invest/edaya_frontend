# Fixtures — Import **Personnel**

Membres du personnel administratif — **code** métier obligatoire (unique école) + rôles courants en établissement ivoirien.

```bash
bun edaya_web/docs/qa/import-fixtures/staff/generate-fixtures.ts
```

**Prérequis :** aucun (permission `STAFF_CREATE`).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `PE01-happy-all-valid.xlsx` | 6 membres (secrétariat, CPE, direction) | 6 enregistrés |
| `PE02-partial-import.xlsx` | 2 OK + prénom manquant + rôle inconnu | 2–3 importés (warnings rôle) |
| `PE03-error-missing-required.xlsx` | `code` / prénom / nom / rôle manquants | 0 enregistré |
| `PE04-error-duplicate-in-file.xlsx` | Même `code` (casse différente) deux fois | 1 enregistré |
| `PE05-unknown-role-warning.xlsx` | Rôles hors catalogue (`Comptable`, etc.) | 2 enregistrés + warnings |
| `PE06-invalid-email-warning.xlsx` | Emails invalides | 2 enregistrés + warnings |
| `PE07-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `PE08-trim-and-case.xlsx` | Espaces autour des champs (dont `code`) | 1 enregistré |

**Ordre suggéré :** PE07 → PE03 → PE04 → PE06 → PE05 → PE02 → PE08 → **PE01**.

Colonnes : `code` (requis), `prenom`, `nom`, `role`, `email?`, `telephone?`.

Rôles reconnus sans warning : `Secrétaire`, `Directeur adjoint`, `CPE / Vie scolaire`, `Directeur`, etc. (voir `staff-role-labels.ts`).
