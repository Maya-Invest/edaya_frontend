# Fixtures — Import **Matières**

Les lignes nominales sont un **export du catalogue `grade_level_subjects`** de la base locale : matière, niveau, abréviation et coefficient tels qu'enregistrés. Rien n'est codé en dur, la colonne `niveau` reprend le **nom** du niveau.

```bash
bun edaya_web/docs/qa/import-fixtures/subjects/generate-fixtures.ts
```

**Prérequis :** classes par niveau ([CL01](../classes/xlsx/CL01-happy-all-valid.xlsx)).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `SU01-happy-all-valid.xlsx` | Tout le catalogue matière×niveau de la base | Autant de créations que de lignes |
| `SU02-partial-import.xlsx` | 2 OK + champs invalides | 2 créées (1er import) · 0 si déjà en base |
| `SU03-error-unknown-niveau.xlsx` | Deux niveaux absents du catalogue | 0 créée |
| `SU04-error-missing-required.xlsx` | Nom ou niveau manquant | 0 créée |
| `SU05-error-invalid-coefficient.xlsx` | `abc`, `-1`, `0` | 0 créée |
| `SU06-error-duplicate-in-file.xlsx` | Même couple matière×niveau en double | 1 créée |
| `SU07-error-no-classes-for-level.xlsx` | Niveau existant mais sans classe | 0 créée |
| `SU08-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `SU09-trim-and-case.xlsx` | Espaces autour des valeurs | 2 créées |

**Ordre suggéré :** SU08 → SU04 → SU05 → SU03 → SU07 → SU06 → SU02 → SU09 → **SU01**.

Prérequis [chapitres](../chapters/) : importer SU01 avant CH01.
