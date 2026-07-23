# Fixtures — Import **Enseignants**

Fiche enseignant : **code** métier (obligatoire, unique école) + identité et contact. Pas de classe ni matière dans le fichier.

```bash
bun edaya_web/docs/qa/import-fixtures/teachers/generate-fixtures.ts
```

**Prérequis :** aucun. Pour lier classe + matière, utilisez ensuite l’import **Affectations enseignants** ([TA01](../teacher-assignments/xlsx/TA01-happy-all-valid.xlsx)) — les `code` sont alignés (`TEACHER_CODES` dans `_shared/ivory-coast-data.ts`).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `EN01-happy-all-valid.xlsx` | Enseignants DB (sinon pool QA 50 codes `ENS-*`) | N enregistrés / export |
| `EN02-partial-import.xlsx` | 2 OK + prénom manquant | Import partiel (2 créés) |
| `EN03-error-missing-required.xlsx` | `code` / prénom / nom manquants | 0 enregistré |
| `EN04-invalid-email-warning.xlsx` | E-mail invalide sur une ligne | 2 enregistrés + 1 warning |
| `EN05-error-duplicate-in-file.xlsx` | Même `code` (casse différente) deux fois | 1 enregistré + 1 erreur |
| `EN06-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `EN07-trim-and-case.xlsx` | Espaces autour des champs (dont `code`) | 1 enregistré |
| `EN08-no-email-ok.xlsx` | Sans e-mail, `code` présent | 1 enregistré |

**Ordre suggéré :** EN06 → EN03 → EN05 → EN04 → EN08 → EN02 → EN07 → **EN01**.

Colonnes : `code` (requis), `prenom`, `nom`, `email?`, `telephone?`.
