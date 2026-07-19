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
| 1 | Classes | [`classes/`](./classes/) | Niveaux `6ème`–`3ème` configurés |
| 2 | Matières | [`subjects/`](./subjects/) | Classes importées (CL01) |
| 3 | Élèves | [`students/`](./students/) | Classes existantes |
| 4 | Tuteurs | [`guardians/`](./guardians/) | Élèves importés (EL01) |
| 5 | Chapitres | [`chapters/`](./chapters/) | Matières importées (SU01) |
| 6 | Paiements | [`payments/`](./payments/) | Élèves + frais assignés |

## Données partagées

Fichier [`_shared/ivory-coast-data.ts`](./_shared/ivory-coast-data.ts) :

- **12 élèves** avec matricules `CI-2025-001` → `CI-2025-012`
- **Classes** : `6ème A/B/C`, `5ème A/B`, `4ème B`, `3ème A`
- **Matières** : programme collège CI (Anglais, Français, Mathématiques, SVT, EDHC, EPS, HG…)
- **Frais** : libellé `Frais de scolarité` (à adapter au catalogue de votre école)

## Packs disponibles

| Pack | Fichiers | README |
|------|----------|--------|
| Classes | CL01–CL09 | [classes/README.md](./classes/README.md) |
| Élèves | EL01–EL10 | [students/README.md](./students/README.md) |
| Matières | SU01–SU09 | [subjects/README.md](./subjects/README.md) |
| Tuteurs | TU01–TU08 | [guardians/README.md](./guardians/README.md) |
| Chapitres | CH01–CH09 | [chapters/README.md](./chapters/README.md) |
| Paiements | PA01–PA10 | [payments/README.md](./payments/README.md) |
