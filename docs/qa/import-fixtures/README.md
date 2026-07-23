# Jeux de données QA — Import de masse

Fixtures Excel pour la QA manuelle (**Configuration → Outils → Importer**).

Contexte **collège ivoirien** (Afrique de l'Ouest) : noms (`Koné`, `Kouassi`, `Traoré`…), matricules `CI-2025-xxx`, téléphones `+225`, paiements Mobile Money / espèces / virement en **FCFA**.

## Regénérer tout

```bash
bun edaya_web/docs/qa/import-fixtures/generate-all-fixtures.ts
```

## Ordre de test recommandé

Les packs sont **chaînés** : chaque étape suppose les données créées par la précédente.

| Étape | Pack | Dossier | Prérequis |
|-------|------|---------|-----------|
| 1 | Classes | [`classes/`](./classes/) | Niveaux `6eme`–`3eme` configurés |
| 2 | Matières | [`subjects/`](./subjects/) | Classes importées (CL01) |
| 3 | Élèves | [`students/`](./students/) | Classes existantes |
| 4 | Tuteurs | [`guardians/`](./guardians/) | Élèves importés (EL01) |
| 5 | Personnel | [`staff/`](./staff/) | Aucun |
| 6 | Enseignants | [`teachers/`](./teachers/) | Aucun |
| 7 | Affectations | [`teacher-assignments/`](./teacher-assignments/) | Enseignants (EN01) + classes + matières |
| 8 | Chapitres | [`chapters/`](./chapters/) | Matières importées (SU01) |
| 9 | Facturation | [`billing/`](./billing/) | Élèves (EL01) + types de frais Finances |
| 10 | Paiements | [`payments/`](./payments/) | Élèves + facturation importée (BI01) |

## Données partagées

Fichier [`_shared/ivory-coast-data.ts`](./_shared/ivory-coast-data.ts) :

- **12 élèves** avec matricules `CI-2025-001` → `CI-2025-012`
- **Classes** : `6eme A/B/C`, `5eme A/B`, `4eme B`, `3eme A`
- **Matières** : programme collège CI (Anglais, Français, Mathématiques, SVT, EDHC, EPS, HG…)
- **Frais** : libellé `Scolarité — Collège` (catalogue demo-ci ; voir `FEE_CATALOG_NAMES` dans `_shared/ivory-coast-data.ts`)

## Identifiants uniques (C12)

| Pack | Clé métier | Colonne(s) |
|------|------------|------------|
| Élèves | Matricule | `matricule` |
| Tuteurs / Personnel / Enseignants | Code | `code` (requis à l’import) |
| Affectations | Lien | `code` + `classe` + `matiere` |
| Paiements | Référence | `reference` (unique école) |
| Chapitres | Composite | `titre` + `matiere` + `niveau` |

## Packs disponibles

| Pack | Fichiers | README |
|------|----------|--------|
| Classes | CL01–CL09 | [classes/README.md](./classes/README.md) |
| Élèves | EL01–EL10 | [students/README.md](./students/README.md) |
| Matières | SU01–SU09 | [subjects/README.md](./subjects/README.md) |
| Tuteurs | TU01–TU09 | [guardians/README.md](./guardians/README.md) |
| Personnel | PE01–PE08 | [staff/README.md](./staff/README.md) |
| Enseignants | EN01–EN08 | [teachers/README.md](./teachers/README.md) |
| Affectations enseignants | TA01–TA07 | [teacher-assignments/README.md](./teacher-assignments/README.md) |
| Chapitres | CH01–CH10 | [chapters/README.md](./chapters/README.md) |
| Facturation | BI01–BI10 | [billing/README.md](./billing/README.md) |
| Paiements | PA01–PA11 | [payments/README.md](./payments/README.md) |
