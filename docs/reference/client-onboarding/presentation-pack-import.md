# Pack import EDAYA — Présentation

**Public :** client + ops  
**Produit :** Configuration → Outils → Importer  
**Détail colonnes :** [02 — Guide fichiers Excel](./02-guide-fichiers-excel.md)  
**Modèles :** [`excel-templates/`](./excel-templates/)

---

## À quoi sert ce pack ?

Remplir une fois les fichiers Excel ci-dessous. EDAYA importe ensuite les données dans l’ordre indiqué.  
Ne pas renommer les en-têtes de la première ligne.

**Délai de retour souhaité :** 3 jours ouvrés.

---

## Modules d’import (catalogue webapp)

Aligné sur `IMPORT_TYPE_DEFINITIONS` (webapp) :

| # | Fichier modèle | Module Importer | Clé métier |
|---|----------------|-----------------|------------|
| 01 | `01-classes.xlsx` | Classes | `nom` + `niveau` |
| 02 | `02-matieres.xlsx` | Matières | `nom` + `niveau` |
| 03 | `03-eleves.xlsx` | Élèves | `matricule` |
| 04 | `04-tuteurs.xlsx` | Tuteurs | `code` |
| 05 | `05-personnel.xlsx` | Personnel | `code` |
| 06 | `06-enseignants.xlsx` | Enseignants | `code` |
| 07 | `07-affectations-enseignants.xlsx` | Affectations enseignants | `code` + `classe` + `matiere` |
| 08 | `08-chapitres.xlsx` | Chapitres | `titre` + `matiere` + `niveau` |
| 09 | `09-facturation.xlsx` | Facturation | `matricule` + `type_frais` |
| 10 | `10-paiements.xlsx` | Paiements | `reference` (unique école) |

### Fichier complémentaire (hors catalogue Importer)

| # | Fichier modèle | Usage | Clé |
|---|----------------|-------|-----|
| 00 | `00-professeur-principal.xlsx` | Collecte PP par classe — application via **affectation professeur principal** (UI), pas encore un type « Importer » | `code` + `classe` |

---

## Ordre d’import recommandé

```text
01 Classes
  → 02 Matières
  → 03 Élèves
  → 04 Tuteurs
  → 05 Personnel          (indépendant, peut être anticipé)
  → 06 Enseignants        (indépendant, peut être anticipé)
  → 07 Affectations enseignants
  → 00 Professeurs principaux   (après 01 + 06 ; saisie UI)
  → 08 Chapitres          (après 02)
  → 09 Facturation        (après 03 + types de frais Finances)
  → 10 Paiements          (après 09)
```

---

## Prérequis école (avant import)

1. École créée + année scolaire + période(s)
2. **Niveaux** configurés (libellés exacts, ex. `6eme`)
3. Pour **09 / 10** : types de frais créés dans **Finances** (libellés = colonne `type_frais`)

---

## Contenu minimal selon périmètre jour 1

| Périmètre | Fichiers à renvoyer |
|-----------|---------------------|
| Structure seule | 01 (+ 02 si hors template CI) |
| Effectifs | 01 → 03 (+ 04 si portail famille) |
| Corps enseignant | 05, 06, 07 (+ 00 si PP connus) |
| Programme / chapitres | 02, 08 |
| Finances | 09, puis 10 |

---

## Règles express

- Identifiants uniques **par école** (`matricule`, `code`, `reference`)
- Tuteurs multi-élèves : matricules séparés par `;`
- Dates : `AAAA-MM-JJ`
- Téléphones : format international (`+225 …`)
- Modes paiement acceptés : `cash` / `espèces`, `card`, `bank_transfer` / `virement`, `mobile_money`, `other`

Guide détaillé → [02-guide-fichiers-excel.md](./02-guide-fichiers-excel.md)
