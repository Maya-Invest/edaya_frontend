# Fixtures — Import **Facturation**

Assignation en masse des frais aux élèves (création des factures), en **FCFA**.

```bash
bun edaya_web/docs/qa/import-fixtures/billing/generate-fixtures.ts
```

**Prérequis :**

1. Élèves importés ([EL01](../students/xlsx/EL01-happy-all-valid.xlsx))
2. Types de frais du catalogue **demo-ci** configurés dans Finances (au minimum **`Scolarité — Collège`** avec montant par défaut)
3. Autres libellés utilisés : `Cantine`, `Transport scolaire` (voir `FEE_CATALOG_NAMES` dans `_shared/ivory-coast-data.ts`)
4. Si les libellés diffèrent dans votre école, éditez la colonne `type_frais` ou `_shared/ivory-coast-data.ts`

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `BI01-happy-all-valid.xlsx` | 4 assignations scolarité | 4 factures créées |
| `BI02-partial-import.xlsx` | Lignes valides + matricule / frais invalides | Import partiel (2 créées) |
| `BI03-error-student-not-found.xlsx` | Matricules inconnus | 0 créée |
| `BI04-error-fee-not-found.xlsx` | Types de frais non configurés | 0 créée |
| `BI05-error-missing-required.xlsx` | Matricule ou type de frais manquant | 0 créée |
| `BI06-error-invalid-amount.xlsx` | Montants invalides | 0 créée |
| `BI07-error-invalid-due-date.xlsx` | Format date d'échéance invalide | 0 créée |
| `BI08-error-duplicate-assignment.xlsx` | Même élève + même frais deux fois | 1 créée · 1 erreur doublon |
| `BI09-multiple-fee-types.xlsx` | Cantine, transport, scolarité | 3 factures créées |
| `BI10-headers-only.xlsx` | En-têtes seuls | Fichier vide |

**Ordre suggéré :** BI10 → BI05 → BI06 → BI07 → BI03 → BI04 → BI08 → BI02 → BI09 → **BI01**.

Montant vide = **montant par défaut** du type de frais (si défini dans Finances).

Après **BI01**, enchaîner avec [Paiements PA01](../payments/README.md) sans assignation manuelle.
