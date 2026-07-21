# Fixtures — Import **Matières**

Programme collège ivoirien — libellés alignés sur le catalogue école :

| Matière | Abréviation |
|---------|------|
| Anglais | ANG |
| Éducation aux Droits de l'Homme et à la Citoyenneté | EDHC |
| Éducation Physique et Sportive | EPS |
| Français | FR |
| Histoire-Géographie | HG |
| Mathématiques | MATH |
| Sciences de la Vie et de la Terre | SVT |
| Physique-Chimie (5ème) | PC |

```bash
bun edaya_web/docs/qa/import-fixtures/subjects/generate-fixtures.ts
```

**Prérequis :** classes par niveau ([CL01](../classes/xlsx/CL01-happy-all-valid.xlsx)).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `SU01-happy-all-valid.xlsx` | 7 matières 6ème + 8 matières 5ème | 15 créées |
| `SU02-partial-import.xlsx` | 2 OK + champs invalides | 2 créées (1er import) · 0 si déjà en base |
| `SU03-error-unknown-niveau.xlsx` | `7ème Z`, `Terminale X` | 0 créée |
| `SU04-error-missing-required.xlsx` | Nom ou niveau manquant | 0 créée |
| `SU05-error-invalid-coefficient.xlsx` | `abc`, `-1`, `0` | 0 créée |
| `SU06-error-duplicate-in-file.xlsx` | Mathématiques/6ème en double | 1 créée |
| `SU07-error-no-classes-for-level.xlsx` | Niveau `2nde` sans classes | 0 créée |
| `SU08-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `SU09-trim-and-case.xlsx` | Espaces autour des valeurs | 2 créées |

**Ordre suggéré :** SU08 → SU04 → SU05 → SU03 → SU07 → SU06 → SU02 → SU09 → **SU01**.

Prérequis [chapitres](../chapters/) : importer SU01 avant CH01.
