# Fixtures — Import **Élèves**

Matricules `CI-2025-xxx`, noms ivoiriens, classes du collège (`6eme A`, etc.).

```bash
bun edaya_web/docs/qa/import-fixtures/students/generate-fixtures.ts
```

**Prérequis :** classes importées ([CL01](../classes/xlsx/CL01-happy-all-valid.xlsx)).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `EL01-happy-all-valid.xlsx` | 12 élèves (Kouadio Yao, Aminata Koné…) | 12 créés |
| `EL02-partial-import.xlsx` | 2 OK + nom vide + classe inconnue + date invalide | 2 créés, 3 erreurs |
| `EL03-error-missing-required.xlsx` | Prénom / nom / matricule manquants | 0 créé |
| `EL04-error-invalid-date.xlsx` | Format `DD/MM/YYYY` ou date impossible | 0 créé |
| `EL05-error-class-not-found.xlsx` | `6eme Z`, `Terminale A` | 0 créé + suggestions |
| `EL06-error-duplicate-in-file.xlsx` | Matricule `CI-2025-003` en double | 1 créé |
| `EL07-error-duplicate-existing.xlsx` | `CI-2025-001` déjà en base | 1 créé (`CI-2025-140`) |
| `EL08-no-class-optional.xlsx` | Classe vide (inscription sans affectation) | 2 créés sans classe · 2 avertissements |
| `EL09-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `EL10-trim-and-case.xlsx` | Espaces + casse matricule/classe | 2 créés |

**Ordre suggéré :** EL09 → EL03 → EL04 → EL05 → EL06 → EL07 → EL02 → EL08 → EL10 → **EL01** (en dernier).

Matricules EL01 réutilisés par [tuteurs](../guardians/), [facturation](../billing/) et [paiements](../payments/).
