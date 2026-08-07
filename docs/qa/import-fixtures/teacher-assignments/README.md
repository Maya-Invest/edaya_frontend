# Fixtures — Import **Affectations enseignants**

Associe un enseignant existant (**code** métier) à une matière proposée dans une classe.

```bash
bun docs/qa/import-fixtures/teacher-assignments/generate-fixtures.ts
```

**Prérequis :**
1. Offres `class_subjects` en base (snapshot auto → [`class-subject-offerings.json`](./class-subject-offerings.json))
2. Enseignants ([EN01](../teachers/xlsx/EN01-happy-all-valid.xlsx) ou déjà en base) — TA01 utilise les codes DB s’il y en a
3. Pour **TA07** : importer aussi [EN08](../teachers/xlsx/EN08-no-email-ok.xlsx)

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `TA01-happy-all-valid.xlsx` | Toutes les offres `class_subjects` réparties sur les enseignants | 1 affectation / offre |
| `TA02-partial-import.xlsx` | 1 OK + code inconnu + classe absente + matière absente | 1 créée + erreurs |
| `TA03-error-missing-required.xlsx` | Champs obligatoires manquants | 0 créée |
| `TA04-subject-not-in-class.xlsx` | Matière absente de la classe cible | 0 créée |
| `TA05-error-duplicate-in-file.xlsx` | Même trio `code`/classe/matière deux fois | 1 créée |
| `TA06-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `TA07-teacher-without-email.xlsx` | Affectation via `ENS-SANS-MAIL-001` (après EN08) | 1 créée |

**Ordre suggéré :** TA06 → TA03 → TA05 → TA04 → TA02 → TA07 → **TA01**.

Colonnes : `code`, `classe`, `matiere` (toutes obligatoires).
