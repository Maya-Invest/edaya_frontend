# Fixtures — Import **Enseignants**

Enseignants du collège — matières alignées sur le catalogue SU01.

```bash
bun edaya_web/docs/qa/import-fixtures/teachers/generate-fixtures.ts
```

**Prérequis :** matières importées ([SU01](../subjects/xlsx/SU01-happy-all-valid.xlsx)) pour que la colonne `matieres` soit résolue sans warning.

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `EN01-happy-all-valid.xlsx` | 6 enseignants (Français, Maths, SVT, etc.) | 6 enregistrés |
| `EN02-partial-import.xlsx` | 2 OK + matière inconnue + prénom manquant | Import partiel + warnings |
| `EN03-error-missing-required.xlsx` | Prénom ou nom manquant | 0 enregistré |
| `EN04-unknown-subject-warning.xlsx` | `Espagnol`, `Allemand` hors catalogue | 2 enregistrés + warnings |
| `EN05-multi-subjects.xlsx` | `Mathématiques; Physique-Chimie` | 2 enregistrés (1ʳᵉ matière → hint UI) |
| `EN06-error-duplicate-in-file.xlsx` | Même enseignant deux fois | 1 enregistré |
| `EN07-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `EN08-trim-and-case.xlsx` | Espaces autour des champs | 1 enregistré |

**Ordre suggéré :** EN07 → EN03 → EN06 → EN04 → EN02 → EN05 → EN08 → **EN01**.

L'affectation à une classe reste **manuelle** après import (phase 18.3 non implémentée).
