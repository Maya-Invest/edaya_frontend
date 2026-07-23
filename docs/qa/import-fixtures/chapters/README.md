# Fixtures — Import **Chapitres**

Contenus pédagogiques en français, contextualisés Afrique de l'Ouest / Côte d'Ivoire. Clé d’unicité : **`titre` + `matiere` + `niveau`**.

```bash
bun edaya_web/docs/qa/import-fixtures/chapters/generate-fixtures.ts
```

**Prérequis :** matières importées ([SU01](../subjects/xlsx/SU01-happy-all-valid.xlsx)).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `CH01-happy-all-valid.xlsx` | 10 chapitres (Maths, Français, HG, PC…) | 10 chapitres créés (catalogue niveau + matière) |
| `CH02-partial-import.xlsx` | 2 OK + erreurs mixtes | Import partiel |
| `CH03-error-unknown-niveau.xlsx` | Niveaux inconnus | 0 créé |
| `CH04-error-subject-not-found.xlsx` | Latin, Philosophie (absentes du collège) | 0 créé + suggestions |
| `CH05-error-missing-required.xlsx` | Niveau / matière / titre manquants | 0 créé |
| `CH06-error-invalid-order.xlsx` | Ordre `abc` ou négatif | 0 créé |
| `CH07-error-duplicate-in-file.xlsx` | « Les proportions » en double | 1 créé |
| `CH08-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `CH09-trim-and-case.xlsx` | Espaces autour des valeurs | 1 créé |
| `CH10-error-existing-chapter.xlsx` | Même titre+matière+niveau que CH01 (après CH01) | 0 créé — « chapitre existe déjà » |

**Ordre suggéré :** CH08 → CH05 → CH06 → CH03 → CH04 → CH07 → CH02 → CH09 → **CH01** → CH10.

Chapitres HG : « L'Afrique de l'Ouest », « La Côte d'Ivoire indépendante ».
