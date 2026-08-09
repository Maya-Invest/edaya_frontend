# Fixtures — Import **Paiements**

Paiements scolaires en **FCFA**, modes ivoiriens : Mobile Money, espèces, virement. **`reference` unique** école (fichier + base).

```bash
bun edaya_web/docs/qa/import-fixtures/payments/generate-fixtures.ts
```

**Prérequis :**

1. Élèves importés ([EL01](../students/xlsx/EL01-happy-all-valid.xlsx))
2. Au moins un **type de frais** configuré dans Finances
3. **Facturation importée** ([BI01](../billing/xlsx/BI01-happy-all-valid.xlsx)) — ou assignation manuelle équivalente

Comme pour la facturation, les libellés `type_frais` proviennent de la base locale (fallback `FEE_CATALOG_NAMES`).

| Fichier | Scénario | Résultat attendu |
|---------|----------|------------------|
| `PA01-happy-all-valid.xlsx` | 4 paiements (Mobile Money, virement, espèces) | 4 enregistrés |
| `PA02-partial-import.xlsx` | Matricule / frais invalides mélangés | Import partiel |
| `PA03-error-student-not-found.xlsx` | Matricules inconnus | 0 enregistré |
| `PA04-error-fee-not-found.xlsx` | Frais non configurés | 0 enregistré |
| `PA05-error-missing-required.xlsx` | Matricule / type / **référence** manquants | 0 enregistré |
| `PA06-error-invalid-amount.xlsx` | Montants invalides | 0 enregistré |
| `PA07-error-invalid-date.xlsx` | Format date invalide | 0 enregistré |
| `PA08-error-amount-exceeds-remaining.xlsx` | Montant > solde restant | 0 enregistré |
| `PA09-mobile-money-modes.xlsx` | Orange Money, MTN, espèces | 3 enregistrés (si frais assignés) |
| `PA10-headers-only.xlsx` | En-têtes seuls | Fichier vide |
| `PA11-error-duplicate-reference.xlsx` | Même `reference` (casse différente) deux fois | 1 enregistré + 1 erreur |

**Ordre suggéré :** PA10 → PA05 → PA06 → PA07 → PA11 → PA03 → PA04 → PA08 → PA02 → PA09 → **PA01**.

Montant vide = **solde restant** automatique (comportement modal paiement).

Après PA01, réimporter une ligne avec la même `reference` → rejet « référence existe déjà ».
