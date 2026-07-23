# Fixtures — Import **Affectations enseignants**

Associe un enseignant existant (**code** métier, plus d’e-mail) à une matière proposée dans une classe.

```bash
bun edaya_web/docs/qa/import-fixtures/teacher-assignments/generate-fixtures.ts
```

**Prérequis :**
1. Classes ([CL01](../classes/xlsx/CL01-happy-all-valid.xlsx))
2. Matières ([SU01](../subjects/xlsx/SU01-happy-all-valid.xlsx))
3. Enseignants ([EN01](../teachers/xlsx/EN01-happy-all-valid.xlsx)) — **codes** alignés (`TEACHER_CODES`)
4. Pour **TA07** : importer aussi [EN08](../teachers/xlsx/EN08-no-email-ok.xlsx) (enseignant sans e-mail)

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `TA01-happy-all-valid.xlsx` | 7 lignes (Kouadio Yao = Maths + PC en 5eme A) | 7 affectations |
| `TA02-partial-import.xlsx` | 1 OK + code inconnu + classe inconnue + matière hors catalogue | 1 créée + erreurs |
| `TA03-error-missing-required.xlsx` | Champs obligatoires manquants (`code` / classe / matière) | 0 créée |
| `TA04-subject-not-in-class.xlsx` | Physique-Chimie en 6eme A | 0 créée (PC absente en 6eme) |
| `TA05-error-duplicate-in-file.xlsx` | Même trio `code`/classe/matière deux fois | 1 créée |
| `TA06-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `TA07-teacher-without-email.xlsx` | Affectation via `ENS-SANS-MAIL-001` (après EN08) | 1 créée |

**Ordre suggéré :** TA06 → TA03 → TA05 → TA04 → TA02 → TA07 → **TA01**.

Colonnes : `code`, `classe`, `matiere` (toutes obligatoires).
