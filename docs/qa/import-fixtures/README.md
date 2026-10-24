# Jeux de données QA — Import de masse

## Contrat actuel : imports durables, version 1

Les modèles CSV/XLSX actuels se téléchargent depuis **Configuration → Outils → Importer**. Le backend partage leurs définitions avec la validation, l'exécution et les fichiers de correction. La session utilise **M** par défaut ; **S** et **O** sont disponibles, avec une surcharge par ligne `on_existing`. Il n'existe plus de choix par fichier.

La suite [import-browser.ts](../../../apps/webapp/tests/integration/import-browser.ts) et ses [fixtures générées sur une école isolée](../../../apps/webapp/tests/integration/support/import-workflows.ts) couvrent les quinze types : les dix historiques, disciplines académiques, statuts de placement, contacts tuteurs, relations tuteurs–élèves et offres de matières par classe. Elle vérifie le rejet d'une surcharge invalide, l'exécution, la relecture après rechargement, les téléchargements XLSX et le téléphone du personnel. Exécution avec le lanceur de suites navigateur `imports-ui` du dépôt.

Le backend conserve le jeu dé-identifié de réconciliation dans `edaya_backend/package/domain-service/tests/capabilities/imports/fixtures/school-submission.ts` : 1 144 élèves, 27 classes, 34 enseignants, 231 redoublants, 913 non-redoublants, 32 volumes totalisant 649 heures et deux volumes inconnus. Les décisions de préparation encore ouvertes restent des preuves à traiter, sans être comptées comme des imports opérationnels.

## Packs historiques de compatibilité

Les classeurs et générateurs ci-dessous documentent l'ancien parcours. Ils servent à vérifier les alias compatibles ; leurs anciennes attentes d'erreur ou de saut ne définissent plus le résultat du mode **M**. Avant une exécution, ajoutez la discipline aux matières, la date effective aux inscriptions et les montant/date/méthode explicites aux paiements. Téléchargez ensuite une correction du backend pour conserver les identifiants de lignes et les références de cibles. N'utilisez pas ces packs comme modèles actuels.

Les générateurs lisent la **PGlite locale** (`edaya_backend/.data/school`) via [`_shared/school-db.ts`](./_shared/school-db.ts) : classes, niveaux, matières, offres `class_subjects`, élèves, enseignants, frais, chapitres. Les libellés des fichiers matchent donc l’école courante.

Contexte nominal : noms ivoiriens, matricules `CI-2025-xxx`, téléphones `+225`, paiements Mobile Money / espèces / virement en **FCFA**.

## Provenance des libellés

Les fixtures sont un **reflet de la base au moment de la génération**, jamais un catalogue figé. Régénérez-les après un `seed` **ou** après un onboarding : les deux chemins produisent des fichiers cohérents avec l'école, sans divergence de nommage.

Règle de nommage des classes, identique à celle du produit :

- la **racine** est le libellé court du niveau (`grade_levels.label`, ex. `6ème`), jamais une déduction à partir du nom du niveau ;
- le **suffixe** poursuit la série déjà présente pour ce niveau — chiffres (`6ème 1`, `6ème 2`) ou lettres (`6ème A`, `6ème B`), avec les chiffres par défaut quand le niveau n'a pas encore de classe.

Séparation des colonnes dans les fichiers : `niveau` = **nom** du niveau (`Sixième`), `nom` / `classe` = **nom complet de la classe** (`6ème 1`).

Si un niveau possède des classes dont aucune ne commence par son libellé (base non re-seedée après la migration `label`, ou libellé modifié après coup), la génération échoue avec un message explicite au lieu de produire des fixtures incohérentes.

## Regénérer tout

Prérequis : API locale déjà démarrée au moins une fois (data dir présent). `bun repo dev` peut rester allumé — le loader copie le data dir.

```bash
# depuis edaya_web
bun docs/qa/import-fixtures/generate-all-fixtures.ts
```

## Ordre de test recommandé

Les packs sont **chaînés** : chaque étape suppose les données créées par la précédente (ou déjà présentes via onboarding).

| Étape | Pack | Dossier | Prérequis |
|-------|------|---------|-----------|
| 1 | Classes | [`classes/`](./classes/) | Niveaux configurés (CL01 = nouvelles sections) |
| 2 | Matières | [`subjects/`](./subjects/) | Catalogue `grade_level_subjects` (SU01 = export DB) |
| 3 | Élèves | [`students/`](./students/) | Classes existantes |
| 4 | Tuteurs | [`guardians/`](./guardians/) | Élèves importés (EL01) |
| 5 | Personnel | [`staff/`](./staff/) | Aucun |
| 6 | Enseignants | [`teachers/`](./teachers/) | Aucun (ou export DB si déjà présents) |
| 7 | Affectations | [`teacher-assignments/`](./teacher-assignments/) | Enseignants + offres `class_subjects` |
| 8 | Chapitres | [`chapters/`](./chapters/) | Paires niveau×matière en base |
| 9 | Facturation | [`billing/`](./billing/) | Élèves (EL01) + types de frais Finances |
| 10 | Paiements | [`payments/`](./payments/) | Élèves + facturation importée (BI01) |

## Données partagées

| Source | Contenu |
|--------|---------|
| [`_shared/school-db.ts`](./_shared/school-db.ts) | Snapshot live PGlite + libellés volontairement absents (niveaux, classes, matières) |
| [`_shared/class-naming.ts`](./_shared/class-naming.ts) | Noms de classes construits depuis `grade_levels.label` |
| [`_shared/fixture-pool.ts`](./_shared/fixture-pool.ts) | Élèves synthétiques `CI-2025-*` répartis sur les classes DB |
| [`_shared/ivory-coast-data.ts`](./_shared/ivory-coast-data.ts) | Pool enseignants EN01 (50), codes staff, fallback frais, téléphones |

## Identifiants uniques (C12)

| Pack | Clé métier | Colonne(s) |
|------|------------|------------|
| Élèves | Matricule | `matricule` |
| Tuteurs / Personnel / Enseignants | Code | `code` ; généré une seule fois pendant la préparation pour les nouveaux tuteurs/enseignants sans code |
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
