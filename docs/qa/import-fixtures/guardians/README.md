# Fixtures — Import **Tuteurs**

Parents/tuteurs ivoiriens, téléphones `+225`, lien par matricule élève.

```bash
bun edaya_web/docs/qa/import-fixtures/guardians/generate-fixtures.ts
```

**Prérequis :** élèves importés ([EL01](../students/xlsx/EL01-happy-all-valid.xlsx)).

**Séparateur multi-valeurs (import → étape Modèle) :** par défaut `;` pour TU02, TU04, TU05, etc. Pour **TU09**, choisir **Esperluette (&)** avant de déposer le fichier.

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `TU01-happy-all-valid.xlsx` | 8 tuteurs liés aux matricules CI-2025-001…008 | 8 créés |
| `TU02-partial-import.xlsx` | Succès partiel : 1 matricule valide + 1 invalide (`;`) | 1–2 lignes importées avec warnings |
| `TU03-error-missing-required.xlsx` | Prénom / nom / matricule manquants | 0 créé |
| `TU04-error-student-not-found.xlsx` | Matricules inconnus | 0 créé |
| `TU05-multi-matricule-siblings.xlsx` | 1 tuteur → `CI-2025-001;CI-2025-002` (séparateur `;`) | 1 tuteur, 2 liens |
| `TU06-error-duplicate-in-file.xlsx` | Même tuteur + même élève deux fois | 1 créé |
| `TU07-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `TU08-trim-and-case.xlsx` | Espaces autour des champs | 1 créé |
| `TU09-multi-matricule-ampersand.xlsx` | 1 tuteur → `mat1&mat2` (séparateur `&` dans l’UI) | 1 tuteur, 2 liens |

**Ordre suggéré :** TU07 → TU03 → TU04 → TU06 → TU02 → TU05 → TU09 → TU08 → **TU01**.
